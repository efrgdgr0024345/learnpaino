"""Real PHP auth/CSRF/config integration tests; never calls OpenAI."""
import http.cookiejar, json, os, socket, subprocess, tempfile, time, urllib.request, urllib.error, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as d:
    d=Path(d); public=d/'public'; public.mkdir(); private=d/'private'; private.mkdir(mode=0o700)
    for f in ('coach.php','coach-lib.php'): shutil.copy2(ROOT/f,public/f)
    with socket.socket() as s: s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
    path=private/'coach.php'
    password='not-a-production-password'
    hashed=subprocess.check_output(['php','-r','echo password_hash("not-a-production-password", PASSWORD_DEFAULT);'],text=True)
    path.write_text("<?php return ['enabled'=>true,'api_key'=>'sk-dummy-test-key-not-a-secret','password_hash'=>'"+hashed+"','daily_calls'=>2,'monthly_calls'=>3];")
    path.chmod(0o600)
    env=os.environ|{'LEARNPIANO_TEST_HTTP':'1','LEARNPIANO_COACH_CONFIG':str(path)}
    process=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(public)],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def call(action,body=None,csrf=None):
        h={'Content-Type':'application/json'}
        if csrf:h['X-CSRF-Token']=csrf
        req=urllib.request.Request(f'http://127.0.0.1:{port}/coach.php?action={action}',None if body is None else json.dumps(body).encode(),h)
        try:r=opener.open(req,timeout=5)
        except urllib.error.HTTPError as e:r=e
        return r.status,json.loads(r.read())
    try:
        for _ in range(50):
            try: status,data=call('status');break
            except urllib.error.URLError:time.sleep(.1)
        assert status==200 and data['configured'] and not data['authenticated'],data
        token=data['csrf']
        assert call('ask',{},token)[0]==401
        assert call('login',{'password':password})[0]==403
        assert call('login',{'password':'wrong'},token)[0]==401
        status,data=call('login',{'password':password},token);assert status==200 and data['authenticated'],data
        assert data['csrf']!=token
        token=data['csrf']
        status,data=call('status');assert data['usage']['daily']==0
        assert call('ask',{},token)[0]==400
        assert call('speak',{'reply_id':'invented'},token)[0]==400
        assert call('transcribe',{},token)[0]==400
        assert call('execute_shell',{},token)[0]==404
        assert call('ask')[0]==405
        assert call('forget',{},token)[0]==200
        assert call('logout',{},token)[0]==200
        assert not call('status')[1]['authenticated']
        path.chmod(0o644)
        assert call('status')[0]==503
        path.chmod(0o600);path.unlink()
        status,data=call('status');assert status==200 and data['configured'] is False
        assert call('ask',{},token)[0]==503
        print('PASS: HTTP authentication, CSRF, session rotation/logout, endpoint and private-file guards; zero paid calls.')
    finally:process.terminate();process.wait(timeout=5)
