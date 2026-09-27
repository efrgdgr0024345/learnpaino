"""Browser regression tests for the real PHP-assembled trainer.

Run: python -m pip install playwright==1.57.0
     python -m playwright install chromium
     python tests/song_import.py

Downloads the 11 pinned score sources, but never uses microphone recordings or
production credentials. Audio uses a short test WAV, not real piano recordings.
"""
import base64
from concurrent.futures import ThreadPoolExecutor
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import urllib.request
import wave
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
report = []

def run(*args, **kwargs):
    return subprocess.check_output(args, text=True, **kwargs)

# Verify exactly the bytes that PHP will verify, including decoded payloads.
bootstrap = (ROOT / 'index.php').read_text()
for key, filename, compressed in [
    ('PAYLOAD', 'index.payload.b64.gz', True),
    ('EXPRESSION', 'expression-engine.b64.gz', True),
    ('SONG_LIBRARY', 'song-library.js', False),
    ('FEEDBACK', 'listener-feedback.js', False),
    ('ISOLATION', 'audio-isolation.js', False),
]:
    expected = re.search(r"LEARNPIANO_" + key + r"_SHA256 = '([a-f0-9]{64})'", bootstrap)[1]
    data = (ROOT / filename).read_bytes()
    if compressed:
        data = gzip.decompress(base64.b64decode(data))
    assert hashlib.sha256(data).hexdigest() == expected, filename + ' checksum mismatch'
    print('Integrity OK:', filename, flush=True)

# Evaluate only our static catalogue, before the browser-dependent UI code.
catalogue = (ROOT / 'song-library.js').read_text().split('const lpSongWrap=')[0]
js = 'console.log(JSON.stringify(require("vm").runInNewContext(' + json.dumps(catalogue + '\nLP_SONGS') + ')))'
songs = json.loads(run('node', '-e', js))
assert len(songs) == 11 and len({s['id'] for s in songs}) == 11

def fetch_score(song):
    assert song['url'].startswith('https://raw.githubusercontent.com/')
    req = urllib.request.Request(song['url'], headers={'User-Agent': 'LearnPiano-Regression/1.1'})
    with urllib.request.urlopen(req, timeout=30) as response:
        content = response.read(5000001)
    assert 0 < len(content) <= 5000000
    return song['url'], content

with ThreadPoolExecutor(max_workers=4) as pool:
    scores = dict(pool.map(fetch_score, songs))
moonlight = scores[songs[0]['url']]

# A silent WAV makes the test independent of the sampled-piano host. Playback
# scheduling and mode behaviour are tested, not acoustic quality or microphones.
wav_data = io.BytesIO()
with wave.open(wav_data, 'wb') as wav:
    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(8000)
    wav.writeframes(b'\x00\x00' * 16000)

hook = '''window.__lpTest = {
  songs: LP_SONGS,
  state: () => ({notes:score.notes.length,title:score.title,bpm:+tempo.value,
    mode:performanceMode,beat,playing,voices:activeSources.size,
    loaded:lpSongSelect.dataset.loaded,disabled:lpSongSelect.disabled}),
  clearCache: id => lpSongCache.delete(id),
  load: id => lpLoadSong(LP_SONGS.find(s=>s.id===id)),
  probe: text => {
    const doc=new DOMParser().parseFromString(text,'application/xml');
    let oldError='';try{parseXML(doc)}catch(e){oldError=e.message}
    return {oldError,notes:parseXML(text).notes.length};
  }
};\n'''

with tempfile.TemporaryDirectory() as directory:
    release = Path(directory)
    for filename in ['index.php', 'index.payload.b64.gz', 'expression-engine.b64.gz',
                     'listener-feedback.js', 'audio-isolation.js', 'song-library.js']:
        shutil.copy2(ROOT / filename, release / filename)
    for filename in ['demo.musicxml', 'moonlight_sonata_mvt1.musicxml']:
        (release / filename).write_bytes(moonlight)
    run('php', '-l', str(release / 'index.php'))
    html = run('php', str(release / 'index.php'), timeout=45)
    assert '<!doctype html>' in html.lower(), html[:400]
    assert 'LearnPiano startup error:' not in html
    run('php', '-l', str(release / '.learnpiano-runtime.php'))
    for i, script in enumerate(re.findall(r'<script[^>]*>(.*?)</script>', html, flags=re.S | re.I)):
        path = release / ('rendered-' + str(i) + '.js')
        path.write_text(script)
        run('node', '--check', str(path))
    anchor = 'fit();loadDemo();d('
    assert html.count(anchor) == 1
    html = html.replace(anchor, hook + anchor)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        overrides = {}
        def route_request(route):
            url = route.request.url
            if url in overrides:
                status, body = overrides[url]
                route.fulfill(status=status, content_type='application/xml', body=body)
            elif url in scores:
                route.fulfill(content_type='application/xml', body=scores[url])
            elif 'diag=append' in url:
                route.fulfill(content_type='application/json', body='{"ok":true}')
            elif '.musicxml' in url and url.startswith('https://learnpiano.test/'):
                route.fulfill(content_type='application/xml', body=moonlight)
            elif url.startswith('https://tonejs.github.io/audio/salamander/'):
                route.fulfill(content_type='audio/wav', body=wav_data.getvalue())
            elif url == 'https://learnpiano.test/index.php':
                route.fulfill(content_type='text/html', body=html)
            else:
                route.abort()
        page.route('**/*', route_request)
        page.goto('https://learnpiano.test/index.php')
        page.wait_for_function('window.__lpTest && __lpTest.state().notes > 0 && !__lpTest.state().disabled')
        assert page.locator('.topbar #lpSongSelect').count() == 1
        chopin = next(s for s in songs if s['id'] == 'chopin-nocturne')
        probe = page.evaluate('(text)=>__lpTest.probe(text)', scores[chopin['url']].decode('utf-8'))
        assert probe['oldError'] == 'Invalid MusicXML' and probe['notes'] > 0, probe
        print('Reproduced old XMLDocument error; original Chopin XML text imports:', probe, flush=True)
        for song in songs:
            for mode in ['practice', 'performance']:
                page.select_option('#expressionMode', mode)
                result = page.evaluate('(id)=>__lpTest.load(id)', song['id'])
                state = page.evaluate('__lpTest.state()')
                assert result and state['notes'] > 0 and not state['playing'], (song['id'], state)
                assert state['mode'] == mode and state['bpm'] == song['bpm'], state
                assert state['beat'] == 0 and state['loaded'] == song['id'], state
                assert not state['disabled']
                page.locator('#play').click()
                page.wait_for_timeout(250)
                assert page.evaluate('__lpTest.state().playing && __lpTest.state().beat > 0')
                page.locator('#play').click()
                assert not page.evaluate('__lpTest.state().playing')
                report.append({'id': song['id'], 'mode': mode, 'notes': state['notes'], 'bpm': state['bpm'], 'result': 'passed'})
                print('PASS', report[-1], flush=True)
        # Failed import leaves the previous score and mode intact and is retryable.
        for status, invalid in [(200, b'<score-partwise><part>'), (200, b'<html>not a score</html>'), (404, b'Not found')]:
            before = page.evaluate('__lpTest.state()')
            page.evaluate('(id)=>__lpTest.clearCache(id)', chopin['id'])
            overrides[chopin['url']] = (status, invalid)
            assert page.evaluate('(id)=>__lpTest.load(id)', chopin['id']) is False
            after = page.evaluate('__lpTest.state()')
            assert (after['title'], after['notes'], after['loaded'], after['mode']) == (before['title'], before['notes'], before['loaded'], before['mode'])
            assert not after['disabled']
            assert 'Could not load' in page.locator('#status').inner_text()
            del overrides[chopin['url']]
            assert page.evaluate('(id)=>__lpTest.load(id)', chopin['id']) is True
        assert not errors, errors
        browser.close()
print('PASS: 22 song/mode playback cases; XML, HTML and HTTP failure/retry cases; all component hashes; PHP and JavaScript syntax.')
(ROOT / 'song-test-results.json').write_text(json.dumps(report, indent=2) + '\n')
