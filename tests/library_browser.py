"""Offline regression suite: actual PHP assembly, real bundled scores, no API key.
Does not certify musical editions or assess acoustic performance.
"""
from pathlib import Path
import base64,gzip,hashlib,io,json,re,subprocess,zipfile,xml.etree.ElementTree as E
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'scores/catalogue.json').read_text())['songs']
bootstrap=(ROOT/'index.php').read_text()
for key,fn,compressed in [('PAYLOAD','index.payload.b64.gz',True),('EXPRESSION','expression-engine.b64.gz',True),('SONG_LIBRARY','song-library.js',False),('FEEDBACK','listener-feedback.js',False),('ISOLATION','audio-isolation.js',False),('COACH','coach.js',False),('LIBRARY_ENGINE','library-engine.js',False)]:
    expected=re.search('LEARNPIANO_'+key+r"_SHA256 = '([a-f0-9]{64})'",bootstrap)[1]
    raw=(ROOT/fn).read_bytes(); raw=gzip.decompress(base64.b64decode(raw)) if compressed else raw
    assert hashlib.sha256(raw).hexdigest()==expected,fn
subprocess.run(['php','-l',str(ROOT/'index.php')],check=True)
html=subprocess.check_output(['php',str(ROOT/'index.php')],text=True)
assert '<!doctype html>' in html.lower() and 'startup error' not in html
for code in re.findall(r'<script[^>]*>(.*?)</script>',html,re.S|re.I):
    subprocess.run(['node','--check'],input=code,text=True,check=True)
for song in manifest:
    raw=(ROOT/song['url']).read_bytes(); assert hashlib.sha256(raw).hexdigest()==song['sha256']
    doc=E.fromstring(raw);assert len(doc.findall('.//note/pitch'))==song['validation']['pitchedNotes']
    assert song['validation']['staffNotes']['1']>0 and song['validation']['staffNotes']['2']>0
hook='''window.__libTest={songs:LP_SONGS,load:id=>lpLoadSong(LP_SONGS.find(s=>s.id===id)),parse:t=>parseXML(t),read:b=>libraryReadFile(new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],'test.mxl')),state:()=>({notes:score.notes.length,hands:coachHands(),bars:coachBars().length,playing,beat,mode:performanceMode,loaded:lpSongSelect.dataset.loaded,level:score.libraryInfo?.difficulty?.level,profile:score.libraryProfile,time:expressiveSeconds(score.total),goal:C('Focus').value}),sample:()=>({plain:score.notes.slice(0,30).map(n=>[n.m,n.s,n.d]),times:score.notes.slice(0,30).map(n=>expressiveSeconds(n.s)),vel:score.notes.slice(0,30).map(n=>expressionVelocity(n))})};\n'''
html=html.replace('fit();loadDemo();d(',hook+'fit();loadDemo();d(')
with sync_playwright() as p:
    kw={'headless':True}
    b=p.chromium.launch(**kw);page=b.new_page(viewport={'width':1280,'height':800});errors=[];paid=[];overrides={}
    page.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
        from urllib.parse import urlsplit,unquote
        path=unquote(urlsplit(r.request.url).path).lstrip('/')
        if path=='index.php' and 'diag=' not in r.request.url:r.fulfill(content_type='text/html',body=html)
        elif path.startswith('scores/'):
            r.fulfill(content_type='application/xml',body=overrides.get(path,(ROOT/path).read_bytes()))
        elif 'diag=append' in r.request.url:r.fulfill(content_type='application/json',body='{"ok":true}')
        elif 'coach.php' in r.request.url:
            if 'action=status' not in r.request.url:paid.append(r.request.url)
            r.fulfill(content_type='application/json',body='{"ok":true,"configured":false,"authenticated":false}')
        else:r.abort()
    page.route('**/*',route);page.goto('http://localhost:8873/index.php');page.wait_for_function('__libTest.state().notes>0')
    initial=page.locator('#trainer').bounding_box();report=[]
    for s in manifest:
        ok=page.evaluate('(id)=>__libTest.load(id)',s['id']);assert ok,s['id']
        state=page.evaluate('__libTest.state()');assert set(state['hands'])=={'left','right'},state
        assert state['notes']>150 and state['level']==s['difficulty']['level'],state
        assert state['goal']==s['lesson'],(state['goal'],s['lesson'])
        assert page.locator('#trainer').bounding_box()==initial,'calibration changed'
        page.select_option('#expressionMode','practice');plain=page.evaluate('__libTest.sample()')
        page.select_option('#expressionMode','performance');perf=page.evaluate('__libTest.sample()')
        assert plain['plain']==perf['plain'],'expression changed score notes'
        assert plain['times']!=perf['times'] and plain['vel']!=perf['vel'],s['id']
        for mode in ['practice','performance']:
            page.select_option('#expressionMode',mode);page.click('#play');page.wait_for_timeout(200)
            assert page.evaluate('__libTest.state().playing && __libTest.state().beat>0')
            page.click('#play');assert not page.evaluate('__libTest.state().playing')
        report.append({'id':s['id'],'notes':state['notes'],'playbackMeasures':state['bars'],'hands':state['hands'],'level':state['level']})
    assert next(r['playbackMeasures'] for r in report if r['id']=='minuet-g')==64
    # No stale/corrupt source accepted, previous score survives.
    victim=manifest[0];overrides[victim['url']]=b'<html>tampered</html>'
    # Cache is private; use a fresh browser to exercise digest validation.
    second=b.new_page();second.route('**/*',route);second.goto('http://localhost:8873/index.php')
    second.wait_for_function('document.getElementById("status").textContent.includes("integrity mismatch")');second.close();del overrides[victim['url']]
    page.click('#lpBrowse');assert page.locator('#libCards article').count()==5
    page.fill('#libSearch','Chopin');assert page.locator('#libCards article').count()==1
    page.fill('#libSearch','');page.select_option('#libLevel','4');assert page.locator('#libCards article').count()==2
    page.screenshot(path=str(ROOT/'library-desktop-test.png'));page.click('#libClose')
    page.set_viewport_size({'width':390,'height':780});page.evaluate('document.getElementById("lpBrowse").click()')
    box=page.locator('#lpLibrary').bounding_box();assert 0<=box['x'] and box['x']+box['width']<=390 and box['y']+box['height']<=781
    page.screenshot(path=str(ROOT/'library-mobile-test.png'));page.click('#libClose')
    # Standard compressed score import: container selects nested XML, not first ZIP member.
    def mxl(bad=False):
        zbuf=io.BytesIO()
        with zipfile.ZipFile(zbuf,'w',compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('unrelated.txt','do not parse me');z.writestr('META-INF/container.xml','<container><rootfiles><rootfile full-path="music/score.xml"/></rootfiles></container>')
            z.writestr('music/score.xml',(ROOT/'scores/minuet-g.musicxml').read_bytes())
            if bad:z.writestr('../escape.xml','not allowed')
        return zbuf.getvalue()
    text=page.evaluate('(b)=>__libTest.read(b)',base64.b64encode(mxl()).decode());assert 'score-partwise' in text
    try:page.evaluate('(b)=>__libTest.read(b)',base64.b64encode(mxl(True)).decode());raise AssertionError('unsafe ZIP accepted')
    except Exception as e:assert 'Unsafe' in str(e),str(e)
    before=page.evaluate('__libTest.state()')
    page.locator('#file').set_input_files({'name':'minuet.mxl','mimeType':'application/vnd.recordare.musicxml','buffer':mxl()})
    page.wait_for_selector('#libPreview:visible');assert page.evaluate('__libTest.state().loaded')==before['loaded']
    assert 'right + left' in page.locator('#libPreview').inner_text() or 'left + right' in page.locator('#libPreview').inner_text()
    page.locator('#libPreview button').click();assert page.evaluate('__libTest.state().loaded')=='imported'
    assert set(page.evaluate('__libTest.state().hands'))=={'left','right'}
    assert paid==[] and not errors,(paid,errors)
    b.close()
(ROOT/'library-test-results.json').write_text(json.dumps(report,indent=2)+'\n')
print('PASS: five real two-hand source scores; 10 mode/playback cases; repeats; score integrity; local MXL validation; confirmed import; responsive library; calibration unchanged; zero paid requests.')
print(json.dumps(report,indent=2))
