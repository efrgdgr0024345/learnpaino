"""Recreate bundled MusicXML from pinned source bytes; refuse silent changes.
Run on a build machine, not on each user's page load. MXL container root and
SHA-256 values come from scores/source-manifest.json reviewed alongside code.
No keys, cloud models, transcription or invented musical parts are used.
"""
import hashlib,io,json,sys,urllib.request,urllib.parse,zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'scores/source-manifest.json').read_text())
source_dir=Path(sys.argv[1]) if len(sys.argv)>1 else None
for song in manifest:
    s=song['source']; name=Path(s['path']).name
    if source_dir:
        source=source_dir/('moonlight.musicxml' if song['id']=='moonlight' else name)
        raw=source.read_bytes()
    else:
        url='https://raw.githubusercontent.com/'+s['repository']+'/'+s['commit']+'/'+urllib.parse.quote(s['path'],safe='/')
        req=urllib.request.Request(url,headers={'User-Agent':'LearnPiano-Pinned-Score-Builder/2'})
        with urllib.request.urlopen(req,timeout=45) as r:raw=r.read(8000001)
    assert 0<len(raw)<=8000000
    assert hashlib.sha256(raw).hexdigest()==s['original_sha256'],song['id']+' source changed'
    if s['containerRoot']:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            root=ET.fromstring(z.read('META-INF/container.xml')).find('.//rootfile').get('full-path')
            assert root==s['containerRoot']
            assert z.getinfo(root).file_size<=5000000
            xml=z.read(root)
    else:xml=raw
    assert hashlib.sha256(xml).hexdigest()==song['sha256'],song['id']+' XML mismatch'
    doc=ET.fromstring(xml);assert doc.tag=='score-partwise'
    assert len(doc.findall('.//note/pitch'))==song['validation']['pitchedNotes']
    destination=ROOT/song['url'];assert destination.parent==ROOT/'scores';destination.write_bytes(xml)
    print('Pinned score OK:',song['id'],len(xml),'bytes; source credits retained')
