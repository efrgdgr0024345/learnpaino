<?php
/** CLI-only secret setup. Prefer configure-coach.sh on restricted cPanel hosts. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
umask(0077);

function setupLine(): string {
    $line = fgets(STDIN, 4098);
    if ($line === false || !str_ends_with($line, "\n")) {
        throw new RuntimeException('Input cancelled or too long. No configuration written.');
    }
    return rtrim($line, "\r\n");
}
function hidden(string $label): string {
    if (!function_exists('shell_exec')) {
        throw new RuntimeException("PHP shell access is unavailable. Leave it disabled.\nRun instead: bash tools/configure-coach.sh");
    }
    $mode = trim((string)shell_exec('stty -g 2>/dev/null'));
    if ($mode === '' || !preg_match('/^[a-fA-F0-9:]+$/', $mode)) {
        throw new RuntimeException('Use an interactive terminal: bash tools/configure-coach.sh');
    }
    fwrite(STDOUT, $label);
    $disabled = trim((string)shell_exec('stty -echo 2>/dev/null && printf HIDDEN'));
    if ($disabled !== 'HIDDEN') throw new RuntimeException('Cannot hide terminal input; setup stopped.');
    try { return setupLine(); }
    finally { shell_exec('stty ' . escapeshellarg($mode) . ' 2>/dev/null'); fwrite(STDOUT, PHP_EOL); }
}
function setupPath(): string {
    $home = getenv('HOME') ?: '';
    if (function_exists('posix_getpwuid') && function_exists('posix_geteuid')) {
        $account = posix_getpwuid(posix_geteuid());
        $home = $account['dir'] ?? $home;
    }
    if ($home === '' || $home === '/' || !str_starts_with($home, '/')) {
        throw new RuntimeException('Could not identify a private home directory.');
    }
    $file = getenv('LEARNPIANO_COACH_CONFIG') ?: $home . '/.config/learnpiano/coach.php';
    if (!str_starts_with($file, '/') || preg_match('~[\x00-\x1F\x7F]|(?:^|/)\.\.(?:/|$)~', $file)) {
        throw new RuntimeException('Use an absolute private configuration path without parent traversal.');
    }
    if (is_link($file) || (file_exists($file) && !is_file($file))) {
        throw new RuntimeException('Configuration target must be a regular file, not a symlink or directory.');
    }
    $dir = dirname($file);
    $ancestor = $dir; $suffix = '';
    while (!is_dir($ancestor)) {
        if (file_exists($ancestor) || is_link($ancestor)) throw new RuntimeException('Invalid private configuration directory.');
        $suffix = '/' . basename($ancestor) . $suffix;
        $parent = dirname($ancestor);
        if ($parent === $ancestor) throw new RuntimeException('Invalid private configuration directory.');
        $ancestor = $parent;
    }
    $resolved = rtrim((string)realpath($ancestor), '/') . $suffix;
    $project = (string)realpath(dirname(__DIR__));
    if ($resolved === '' || $resolved === $project || str_starts_with($resolved, $project . '/') || preg_match('~/(public_html|www|htdocs)(/|$)~', $resolved)) {
        throw new RuntimeException('Use a directory outside ALL website document roots.');
    }
    if (is_dir($dir) && (fileperms($dir) & 0077) !== 0) {
        throw new RuntimeException('Private directory must have permissions 0700.');
    }
    return $file;
}

$tmp = null;
try {
    $mode = $argv[1] ?? '';
    if (count($argv) > 2 || !in_array($mode, ['', '--check', '--stdin-secrets'], true)) {
        throw new RuntimeException('Usage: bash tools/configure-coach.sh (no keys or passwords in command arguments)');
    }
    $file = setupPath();
    // Used by the Bash helper before prompting. No writes or credential reads.
    if ($mode === '--check') { fwrite(STDOUT, is_file($file) ? "EXISTS\n" : "NEW\n"); exit; }
    $replace = false;
    if ($mode === '--stdin-secrets') {
        // Only the helper pipes secrets here. Never accept visible terminal input.
        if (!function_exists('stream_isatty') || stream_isatty(STDIN)) {
            throw new RuntimeException('Piped secret input required. Run bash tools/configure-coach.sh instead.');
        }
        if (setupLine() !== 'LEARNPIANO-COACH-SETUP-1') throw new RuntimeException('Invalid setup input protocol.');
        $confirmation = setupLine();
        if (!in_array($confirmation, ['KEEP', 'REPLACE'], true)) throw new RuntimeException('Invalid replacement confirmation.');
        $replace = $confirmation === 'REPLACE';
        $key = setupLine(); $pass = setupLine(); $repeat = setupLine();
        if (fgetc(STDIN) !== false) throw new RuntimeException('Unexpected extra setup input. No configuration written.');
    } else {
        if (is_file($file)) {
            fwrite(STDOUT, "Configuration already exists. Replace it? Type REPLACE: ");
            if (setupLine() !== 'REPLACE') exit("Unchanged.\n");
            $replace = true;
        }
        fwrite(STDOUT, "LearnPiano optional AI coach\nNo network request is made during setup. Your key will not be printed.\n");
        $key = hidden('OpenAI API key (hidden): ');
        $pass = hidden('Choose a coach password (12-72 bytes; hidden): ');
        $repeat = hidden('Repeat coach password (hidden): ');
    }
    if (is_file($file) && !$replace) exit("Unchanged. Existing configuration was not replaced.\n");
    if (!str_starts_with($key, 'sk-') || strlen($key) < 20 || strlen($key) > 4096 || preg_match('/[\s\x00-\x1F\x7F]/', $key)) {
        throw new RuntimeException('The API key format is invalid. No configuration written.');
    }
    // PASSWORD_DEFAULT uses bcrypt on the supported PHP versions (72-byte limit).
    if (strlen($pass) < 12 || strlen($pass) > 72 || preg_match('/[\x00-\x1F\x7F]/', $pass)) {
        throw new RuntimeException('Choose a password of 12-72 bytes without control characters.');
    }
    if (!hash_equals($pass, $repeat)) throw new RuntimeException('Passwords did not match. No configuration written.');
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) throw new RuntimeException('Cannot create private directory.');
    clearstatcache();
    setupPath(); // Recheck the now-created private directory before writing.
    $config = ['enabled' => true, 'api_key' => $key, 'password_hash' => password_hash($pass, PASSWORD_DEFAULT),
        'model' => 'gpt-4.1-mini-2025-04-14', 'voice' => 'cedar', 'daily_calls' => 60, 'monthly_calls' => 600];
    $text = "<?php\n// Private LearnPiano configuration: never commit or move into a website directory.\nreturn " . var_export($config, true) . ";\n";
    $tmp = $file . '.new-' . bin2hex(random_bytes(8));
    $handle = @fopen($tmp, 'x');
    if ($handle === false) throw new RuntimeException('Could not create private configuration.');
    try {
        if (fwrite($handle, $text) !== strlen($text) || !fflush($handle)) throw new RuntimeException('Could not save configuration.');
    } finally { fclose($handle); }
    if (!@chmod($tmp, 0600)) throw new RuntimeException('Could not restrict configuration permissions.');
    clearstatcache();
    if (is_file($file) && !$replace) throw new RuntimeException('Configuration appeared during setup; existing file left unchanged.');
    if (!@rename($tmp, $file)) throw new RuntimeException('Could not activate configuration.');
    $tmp = null;
    unset($key, $pass, $repeat, $config, $text);
    fwrite(STDOUT, "Saved private configuration to " . $file . "\nOpen the piano, press Ask coach, then enter your COACH PASSWORD (not the API key).\nDefaults: 60 API calls/day, 600/month, including speech/transcription. These are request caps, NOT dollar budgets.\n");
} catch (Throwable $error) {
    if ($tmp !== null) @unlink($tmp);
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
