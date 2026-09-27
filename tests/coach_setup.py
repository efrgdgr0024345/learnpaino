"""Secret setup regression tests. Only dummy credentials; no network calls.

Run with Python 3 and PHP 8.1+ on Linux. Uses the standard library only.
Exercises a pseudo-terminal with PHP process-launching functions disabled.
"""
import errno
import hashlib
import os
from pathlib import Path
import pty
import select
import shutil
import signal
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
PHP = shutil.which('php')
DISABLED = 'shell_exec,exec,system,passthru,proc_open,popen,pcntl_exec'
KEY = 'sk-setup-test-not-a-real-api-key-0123456789'
PASSWORD = "  safe'\\$Piano123!  "
count = 0


def check(value, name):
    global count
    assert value, name
    count += 1
    print('PASS', name, flush=True)


def php(env, *args, data=None):
    return subprocess.run([PHP, '-d', 'disable_functions=' + DISABLED,
                           str(ROOT / 'tools/configure-coach.php'), *args],
                          input=data, capture_output=True, text=True, env=env, timeout=10)


def protocol(key=KEY, password=PASSWORD, repeat=PASSWORD, replace='KEEP'):
    return '\n'.join(['LEARNPIANO-COACH-SETUP-1', replace, key, password, repeat, ''])


class Terminal:
    def __init__(self, argv, env):
        self.pid, self.fd = pty.fork()
        if self.pid == 0:
            os.execvpe(argv[0], argv, env)
        self.output = b''
        self.status = None

    def until(self, text):
        deadline = time.monotonic() + 10
        target = text.encode()
        while target not in self.output:
            assert time.monotonic() < deadline, 'Timed out waiting for terminal prompt: ' + text
            self.read()

    def read(self):
        if select.select([self.fd], [], [], .1)[0]:
            try:
                chunk = os.read(self.fd, 65536)
            except OSError as exc:
                if exc.errno != errno.EIO:
                    raise
                chunk = b''
            self.output += chunk

    def send(self, text):
        os.write(self.fd, (text + '\n').encode())

    def finish(self, expected=0):
        deadline = time.monotonic() + 10
        while self.status is None:
            self.read()
            pid, status = os.waitpid(self.pid, os.WNOHANG)
            if pid:
                self.status = os.waitstatus_to_exitcode(status)
                break
            if time.monotonic() > deadline:
                os.kill(self.pid, signal.SIGKILL)
                os.waitpid(self.pid, 0)
                raise AssertionError('Terminal setup did not exit')
        self.read()
        os.close(self.fd)
        assert self.status == expected, 'Unexpected setup exit code: ' + str(self.status)
        check(KEY.encode() not in self.output and PASSWORD.encode() not in self.output,
              'no dummy key/password echoed in terminal output')


with tempfile.TemporaryDirectory() as td:
    root = Path(td)
    config = root / 'private/coach.php'
    env = os.environ.copy()
    env['LEARNPIANO_COACH_CONFIG'] = str(config)
    env.pop('BASH_ENV', None)
    result = php(env, '--check')
    check(result.returncode == 0 and result.stdout == 'NEW\n' and not config.parent.exists(),
          'preflight does not write a config or create its directory')
    result = php(env)
    check(result.returncode == 1 and 'bash tools/configure-coach.sh' in result.stderr
          and not config.exists(), 'direct PHP gives safe fallback when shell_exec is disabled')
    for name, data in [
        ('password mismatch', protocol(repeat='different-password')),
        ('short password', protocol(password='short', repeat='short')),
        ('long password', protocol(password='a' * 73, repeat='a' * 73)),
        ('bad key', protocol(key='not-a-key')),
        ('whitespace key', protocol(key=KEY + ' ')),
        ('truncated input', protocol().rstrip('\n')),
        ('extra input', protocol() + 'extra\n'),
        ('wrong header', protocol().replace('LEARNPIANO-COACH-SETUP-1', 'BAD', 1)),
    ]:
        result = php(env, '--stdin-secrets', data=data)
        check(result.returncode != 0 and not config.exists(), name + ' leaves config unwritten')
        assert KEY not in result.stdout + result.stderr and PASSWORD not in result.stdout + result.stderr
    result = php(env, '--stdin-secrets', data=protocol())
    check(result.returncode == 0 and config.is_file(), 'piped setup works with all PHP shell launchers disabled')
    check(config.stat().st_mode & 0o777 == 0o600 and config.parent.stat().st_mode & 0o777 == 0o700,
          'private file 0600 and directory 0700')
    # Verify literal special characters without passing secrets in argv/env.
    verify = '''$c=require getenv('LEARNPIANO_COACH_CONFIG');
    $k=rtrim(fgets(STDIN),"\\r\\n");$p=rtrim(fgets(STDIN),"\\r\\n");
    exit($c['api_key']===$k && password_verify($p,$c['password_hash']) ? 0 : 1);'''
    result = subprocess.run([PHP, '-r', verify], input=KEY + '\n' + PASSWORD + '\n',
                            capture_output=True, text=True, env=env, timeout=10)
    check(result.returncode == 0, 'quotes, backslashes, dollars and spaces are stored literally; password is hashed')
    before = hashlib.sha256(config.read_bytes()).hexdigest()
    result = php(env, '--stdin-secrets', data=protocol(key=KEY + '-replacement'))
    check(result.returncode == 0 and hashlib.sha256(config.read_bytes()).hexdigest() == before,
          'existing config is preserved without explicit REPLACE')
    result = php(env, '--check')
    check(result.stdout == 'EXISTS\n' and KEY not in result.stdout, 'existing config preflight is non-secret')
    result = php(env, '--stdin-secrets', data=protocol(key=KEY + '-replacement', replace='REPLACE'))
    check(result.returncode == 0 and hashlib.sha256(config.read_bytes()).hexdigest() != before,
          'explicit REPLACE installs the new config')
    check(not list(config.parent.glob('*.new-*')), 'no plaintext temporary input or leftover output file')
    unsafe_env = dict(env, LEARNPIANO_COACH_CONFIG=str(root / 'public_html/coach.php'))
    check(php(unsafe_env, '--check').returncode != 0, 'public_html target rejected')
    link = root / 'alias.php'; link.symlink_to(config)
    check(php(dict(env, LEARNPIANO_COACH_CONFIG=str(link)), '--check').returncode != 0,
          'symlink target rejected')
    config.unlink()
    # PATH shim reproduces the user's restricted PHP inside the actual Bash helper.
    bindir = root / 'bin'; bindir.mkdir()
    shim = bindir / 'php'
    shim.write_text('#!/bin/sh\nexec "' + PHP + '" -d disable_functions=' + DISABLED + ' "$@"\n')
    shim.chmod(0o700)
    env['PATH'] = str(bindir) + os.pathsep + env['PATH']
    term = Terminal(['bash', '-x', str(ROOT / 'tools/configure-coach.sh')], env)
    term.until('OpenAI API key (hidden): '); term.send(KEY)
    term.until('Choose a coach password'); term.send(PASSWORD)
    term.until('Repeat coach password'); term.send(PASSWORD)
    term.until('Saved private configuration'); term.finish()
    check(config.is_file(), 'Bash hidden-input helper succeeds in a real pseudo-terminal even with xtrace requested')
    before = config.read_bytes()
    term = Terminal(['bash', str(ROOT / 'tools/configure-coach.sh')], env)
    term.until('Type REPLACE: '); term.send(''); term.finish()
    check(config.read_bytes() == before, 'declining replacement does not even prompt for credentials')
    config.unlink()
    term = Terminal(['bash', str(ROOT / 'tools/configure-coach.sh')], env)
    term.until('OpenAI API key (hidden): ')
    os.write(term.fd, b'\x03')
    term.finish(expected=130)
    check(not config.exists(), 'Ctrl+C at hidden prompt leaves no config')
    term = Terminal([PHP, '-d', 'disable_functions=' + DISABLED,
                     str(ROOT / 'tools/configure-coach.php'), '--stdin-secrets'], env)
    term.until('Piped secret input required'); term.finish(expected=1)
    check(not config.exists(), 'PHP pipe mode refuses visible interactive input')
    result = subprocess.run(['bash', str(ROOT / 'tools/configure-coach.sh')], input='',
                            capture_output=True, text=True, env=env, timeout=10)
    check(result.returncode != 0 and not config.exists(), 'Bash helper refuses non-terminal input')
print(f'{count} setup checks passed; dummy credentials only; no API requests.')
