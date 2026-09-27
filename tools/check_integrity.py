"""Verify (default) or deliberately regenerate reviewed bootstrap hashes (--write).
Do not run --write on an untrusted server copy; use only reviewed build sources.
"""
from pathlib import Path
import base64,gzip,hashlib,re,sys
ROOT=Path(__file__).resolve().parents[1]
fn=ROOT/'index.php';text=fn.read_text()
for key,path,z in [('PAYLOAD','index.payload.b64.gz',1),('EXPRESSION','expression-engine.b64.gz',1),('SONG_LIBRARY','song-library.js',0),('FEEDBACK','listener-feedback.js',0),('ISOLATION','audio-isolation.js',0),('COACH','coach.js',0),('LIBRARY_ENGINE','library-engine.js',0)]:
    raw=(ROOT/path).read_bytes();raw=gzip.decompress(base64.b64decode(raw)) if z else raw
    digest=hashlib.sha256(raw).hexdigest();pattern=r"(LEARNPIANO_"+key+r"_SHA256 = ')[a-f0-9]{64}(')"
    assert len(re.findall(pattern,text))==1,key
    if '--write' in sys.argv:text=re.sub(pattern,lambda m:m[1]+digest+m[2],text)
    else:assert digest == re.search(r'LEARNPIANO_'+key+r"_SHA256 = '([a-f0-9]{64})'",text).group(1),path+' mismatch'
    print('Integrity OK:',path)
if '--write' in sys.argv:fn.write_text(text)
