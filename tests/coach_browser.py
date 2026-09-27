"""Actual assembled app + mock OpenAI gateway; no key or piano recordings.
Exercises local controls, hand metadata, isolation, proposal confirmation,
wrong/unavailable/stale actions, privacy defaults and desktop/mobile geometry.
"""
import base64,gzip,hashlib,io,json,re,shutil,subprocess,tempfile,wave
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
def run(*a,**kw):return subprocess.check_output(a,text=True,**kw)
bootstrap=(ROOT/'index.php').read_text()
for key,f,compressed in [('PAYLOAD','index.payload.b64.gz',True),('EXPRESSION','expression-engine.b64.gz',True),('SONG_LIBRARY','song-library.js',False),('FEEDBACK','listener-feedback.js',False),('ISOLATION','audio-isolation.js',False),('COACH','coach.js',False),('LIBRARY_ENGINE','library-engine.js',False)]:
    expected=re.search(r'LEARNPIANO_'+key+r"_SHA256 = '([a-f0-9]{64})'",bootstrap)[1]
    b=(ROOT/f).read_bytes();b=gzip.decompress(base64.b64decode(b)) if compressed else b
    assert hashlib.sha256(b).hexdigest()==expected,f
for f in ('index.php','coach.php','coach-lib.php','tools/configure-coach.php'):run('php','-l',str(ROOT/f))
run('node','--check',str(ROOT/'coach.js'))
# Four bars, one piano part with TWO staves (detects the old staff-loss bug).
xml='<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Moonlight coach test fixture</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">'
for i,(r,l) in enumerate([('C','C'),('D','D'),('E','E'),('F','F')]):
    attrs='<attributes><divisions>4</divisions><time><beats>1</beats><beat-type>4</beat-type></time><staves>2</staves></attributes>' if i==0 else ''
    def note(step,oct,staff):return f'<note><pitch><step>{step}</step><octave>{oct}</octave></pitch><duration>4</duration><voice>{staff}</voice><staff>{staff}</staff></note>'
    xml+=f'<measure number="{i+1}">{attrs}'+note(r,4,1)+'<backup><duration>4</duration></backup>'+note(l,3,2)+'</measure>'
xml+='</part></score-partwise><!--'+(' fixture '*9000)+'-->'
w=io.BytesIO()
with wave.open(w,'wb') as wav:wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(8000);wav.writeframes(b'\0\0'*8000)
hook='''window.__coachTest={
 state:()=>({playing,beat,mode:performanceMode,tempo:+tempo.value,micOn,revision:coachRevision,range:coachRange,notes:score.notes.length,hands:coachHands(),last:coachLastAttempt,voice:!!coachAudio}),
 pause:()=>pause(),load:text=>apply(parseXML(text,'fixture'),'fixture'),
 snapshot:()=>coachSnapshot(),speak:()=>coachSpeak(),startMic:()=>startMic(),
 proposal:(a)=>{coachAnswer={action:a,revision:coachRevision};document.getElementById('coachApply').hidden=false},
 stale:()=>{coachAnswer.revision--}
};\n'''
with tempfile.TemporaryDirectory() as d:
    release=Path(d)
    for f in ('index.php','index.payload.b64.gz','expression-engine.b64.gz','song-library.js','listener-feedback.js','audio-isolation.js','coach.js','library-engine.js'):shutil.copy2(ROOT/f,release/f)
    for f in ('demo.musicxml','moonlight_sonata_mvt1.musicxml'):(release/f).write_text(xml)
    html=run('php',str(release/'index.php'),timeout=45)
    assert '<!doctype html>' in html.lower(),html[:300]
    run('php','-l',str(release/'.learnpiano-runtime.php'))
    assert html.count('fit();loadDemo();d(')==1
    html=html.replace('fit();loadDemo();d(',hook+'fit();loadDemo();d(')
    # Synthetic fixture replaces the default score only inside this test.
    real_digest=json.loads((ROOT/'scores/catalogue.json').read_text())['songs'][0]['sha256']
    html=html.replace(real_digest,hashlib.sha256(xml.encode()).hexdigest())
    # Test hook records notes AFTER filtering, not hypothetical score attacks.
    html=html.replace('return coachOldTone(m,dur,v,delay);','(window.__toneCalls ||= []).push(m); return coachOldTone(m,dur,v,delay);')
    with sync_playwright() as p:
        kwargs={'headless':True,'args':['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}
        if Path('/usr/lib/chromium/chromium').exists():kwargs['executable_path']='/usr/lib/chromium/chromium'
        browser=p.chromium.launch(**kwargs)
        page=browser.new_page(viewport={'width':1280,'height':800},permissions=['microphone'])
        errors=[];paid=[];configured=False;authenticated=False;reject=False
        page.on('pageerror',lambda e:errors.append(str(e)))
        def route(r):
            nonlocal_dummy=None
            global authenticated
            url=r.request.url
            if 'coach.php?action=' in url:
                action=url.split('action=')[1];data={}
                if action in ('ask','speak','transcribe'):paid.append(action)
                if action=='status':data={'ok':True,'configured':configured,'authenticated':authenticated,'csrf':'test-token','usage':{'daily':len(paid),'daily_limit':60,'monthly':len(paid),'monthly_limit':600}}
                elif action=='login':authenticated=True;data={'ok':True,'authenticated':True,'csrf':'test-token'}
                elif action in ('forget','logout'):data={'ok':True}
                elif action=='ask':
                    payload=json.loads(r.request.post_data);assert 'api_key' not in payload
                    assert payload['context']['notes'] and payload['context']['detector']['has_attempt'] is False
                    if reject:r.fulfill(status=429,content_type='application/json',body=json.dumps({'ok':False,'error':'Coach usage limit reached.'}));return
                    data={'ok':True,'reply_id':'r1','answer':{'reply':'Try the two selected bars slowly. These are suggestions, not a verified assessment.','focus':'pulse','action':{'type':'set_tempo','from':0,'to':0,'bpm':60,'hand':'both','mode':'practice'},'action_rejected':False}}
                elif action=='speak':r.fulfill(content_type='audio/mpeg',body=w.getvalue());return
                elif action=='transcribe':data={'ok':True,'text':'Please explain this phrase.'}
                r.fulfill(content_type='application/json',body=json.dumps(data))
            elif '.musicxml' in url:r.fulfill(content_type='application/xml',body=xml)
            elif 'diag=append' in url:r.fulfill(content_type='application/json',body='{"ok":true}')
            elif 'tonejs.github.io' in url:r.fulfill(content_type='audio/wav',body=w.getvalue())
            elif url=='https://learnpiano.test/index.php':r.fulfill(content_type='text/html',body=html)
            else:r.abort()
        page.route('**/*',route)
        page.goto('https://learnpiano.test/index.php')
        page.wait_for_function('window.__coachTest && __coachTest.state().notes===8')
        assert set(page.evaluate('__coachTest.state().hands'))=={'left','right'}
        assert paid==[]
        rect=page.locator('#trainer').bounding_box()
        page.click('#askCoach');page.wait_for_selector('#coachSetup:visible')
        assert page.locator('#coachAsk').is_disabled()
        assert not page.locator('#coachAutoFeedback').is_checked()
        assert page.locator('#trainer').bounding_box()==rect
        page.select_option('#coachTo','2');page.select_option('#coachHand','left')
        page.evaluate("document.getElementById('tempo').value=180;document.getElementById('tempo').dispatchEvent(new Event('input'))")
        page.click('#coachDemo');page.wait_for_timeout(950)
        assert not page.evaluate('__coachTest.state().playing')
        assert set(page.evaluate('window.__toneCalls'))=={48,50},page.evaluate('window.__toneCalls')
        assert paid==[]
        page.click('#askCoach');page.select_option('#coachHand','both');page.evaluate('window.__toneCalls=[]')
        page.click('#coachPractise');page.wait_for_timeout(950)
        assert page.evaluate('window.__toneCalls')==[], 'student practice must mute the demo'
        assert page.evaluate('__coachTest.state().last') is not None
        assert not page.evaluate('__coachTest.state().last.listening')
        configured=True;page.click('#askCoach');page.wait_for_selector('#coachLogin:visible')
        page.fill('#coachPassword','a-test-password');page.locator('#coachLogin button').click();page.wait_for_function('!document.getElementById("coachAsk").disabled')
        page.fill('#coachQuestion','Explain the selected phrase');page.click('#coachAsk');page.wait_for_selector('#coachApply:visible')
        assert page.evaluate('__coachTest.state().tempo')==180,'AI must not change tempo before Apply'
        page.click('#coachApply');assert page.evaluate('__coachTest.state().tempo')==60
        assert paid==['ask']
        page.evaluate('__coachTest.startMic()');assert page.evaluate('__coachTest.state().micOn')
        page.click('#coachSpeak');page.wait_for_timeout(150)
        assert not page.evaluate('__coachTest.state().micOn')
        page.click('#coachMute');assert not page.evaluate('__coachTest.state().voice')
        assert paid==['ask','speak']
        page.click('#coachRecord');page.wait_for_function('document.getElementById("coachRecord").textContent==="Finish recording"')
        page.wait_for_timeout(600);page.click('#coachRecord');page.wait_for_function('document.getElementById("coachQuestion").value==="Please explain this phrase."')
        assert paid==['ask','speak','transcribe'],'transcript requires separate Ask confirmation'
        # A stale suggestion cannot touch the new/current score.
        page.evaluate('__coachTest.proposal({type:"set_tempo",bpm:90,from:0,to:0,hand:"both",mode:"practice"});__coachTest.stale()')
        page.click('#coachApply');assert page.evaluate('__coachTest.state().tempo')==60
        reject=True;page.click('#coachAsk');page.wait_for_function('document.getElementById("coachStatus").textContent.includes("usage limit")');assert page.evaluate('__coachTest.state().tempo')==60
        page.click('#coachClose');assert page.locator('#trainer').bounding_box()==rect
        # Controls remain usable after API failure.
        page.evaluate('document.getElementById("play").click()');page.wait_for_timeout(100);assert page.evaluate('__coachTest.state().playing');page.evaluate('__coachTest.pause()')
        page.set_viewport_size({'width':390,'height':740});page.click('#askCoach');page.wait_for_timeout(100)
        panel=page.locator('#coachPanel').bounding_box();assert panel['x']>=0 and panel['x']+panel['width']<=390
        assert panel['y']+panel['height']<=741
        page.screenshot(path=str(ROOT/'coach-mobile-test.png'))
        page.evaluate('document.body.classList.add("focus")');page.wait_for_timeout(100);assert not page.locator('#coachPanel').is_visible()
        assert not errors,errors
        browser.close()
print('PASS: real assembled app, two-staff mapping, local range/hand playback, silent practice, confirmed actions, recording/transcript review, voice/listener isolation, usage failure, stale actions, default privacy and mobile layout. API responses/audio were mocked; no paid API requests.')
