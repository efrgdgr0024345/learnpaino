/* LearnPiano song library v1.1
 * Every song uses the existing text-based MusicXML importer and both playback
 * modes. Loading a new song must not change the calibrated trainer geometry.
 */
const LP_SONG_SOURCE_COMMIT='c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05';
const LP_SONG_RAW='https://raw.githubusercontent.com/SBurrell23/Sheets/'+LP_SONG_SOURCE_COMMIT+'/';

const LP_SONGS=[{"id":"moonlight","title":"Moonlight Sonata — I. Adagio sostenuto","composer":"Ludwig van Beethoven","kind":"two-hand score","bpm":52,"url":"scores/moonlight.musicxml","sha256":"d74353ffc8f45eb64e277eee6991fa50e1661f892c1fc7d893f4e4de38cd5779","difficulty":{"level":5,"technical":4,"reading":5,"musical":7,"status":"provisional; not an exam grade"},"skills":["Even triplets","Melody balance","Pedal control"],"lesson":"Keep the triplets flowing quietly beneath the sustained melody. Compare balance before adding expressive timing.","profile":{"phraseBeats":16,"rubatoAmount":0.19,"melodyBoost":1.25,"innerLevel":0.65,"bassLevel":0.8,"pedalFallback":true},"source":{"repository":"fosfrancesco/piano_corpora_dcml","commit":"aa732b635bc75c6583d86c6ac488e77b08b1b37e","path":"scores/beethoven_piano_sonatas/14-1.musicxml","containerRoot":"","original_sha256":"d74353ffc8f45eb64e277eee6991fa50e1661f892c1fc7d893f4e4de38cd5779","blob_sha":"47724248cedb52c3749e50c262cca97ab9e1f3d1","edition_url":"","rights_in_file":"","licence_note":"Existing research-corpus source; check its non-commercial/share-alike terms before reuse."},"validation":{"status":"structural checks; pianist edition review pending","writtenMeasures":69,"pitchedNotes":1182,"staffNotes":{"1":816,"2":366},"parts":2,"repeats":0}},{"id":"minuet-g","title":"Minuet in G major, BWV Anh. 114","composer":"Christian Petzold","kind":"two-hand score","bpm":88,"url":"scores/minuet-g.musicxml","sha256":"ded31aa50a2122143f7e362d2d7161b5b8aa218148cab09c9bdca2c4248a5abd","difficulty":{"level":3,"technical":3,"reading":3,"musical":4,"status":"provisional; not an exam grade"},"skills":["Two-hand coordination","Dance pulse","Articulation"],"lesson":"Keep a gentle three-beat dance pulse. Practise the two written staves separately, then join them without accents on every note.","profile":{"phraseBeats":12,"rubatoAmount":0.035,"melodyBoost":1.25,"innerLevel":0.65,"bassLevel":0.8,"pedalFallback":false},"source":{"repository":"musetrainer/library","commit":"9128876f6164d96997c877a2be843349a32bdabb","path":"scores/Bach_Minuet_in_G_Major_BWV_Anh._114.mxl","containerRoot":"lg-151411412.xml","original_sha256":"490aba9a679e06429e0b7e6e58e50701658389d64c3b5c91511af3ec68355b4d","blob_sha":"dd7f1b37b37d8a031a71379b4ee1bb4ceaddd968","edition_url":"http://api.musescore.com/score/2086106","rights_in_file":"Public Domain (PianoXML typeset)","licence_note":"Source collection declares public domain; retained source and edition credits. Not an independent legal certification."},"validation":{"status":"structural checks; pianist edition review pending","writtenMeasures":32,"pitchedNotes":204,"staffNotes":{"1":129,"2":75},"parts":1,"repeats":3}},{"id":"bach-prelude-c","title":"Prelude in C Major, BWV 846","composer":"J. S. Bach","kind":"legacy melody demo","bpm":60,"url":"https://raw.githubusercontent.com/SBurrell23/Sheets/c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05/songs/classical/bach-prelude-in-c.musicxml","legacy":true,"lesson":"Melody-only legacy demo; replacement edition is still under review."},{"id":"gymnopedie-1","title":"Gymnopédie No. 1","composer":"Erik Satie","kind":"two-hand score","bpm":66,"url":"scores/gymnopedie-1.musicxml","sha256":"8bb973333e72c3f8971899fbdf1983a908373dd09026e19be4f0e9a962d90917","difficulty":{"level":4,"technical":4,"reading":3,"musical":6,"status":"provisional; not an exam grade"},"skills":["Left-hand leaps","Quiet chords","Legato melody"],"lesson":"Prepare the left-hand movement early and keep the chords soft. Let the melody sing above the accompaniment without losing the three-beat pulse.","profile":{"phraseBeats":12,"rubatoAmount":0.16,"melodyBoost":1.25,"innerLevel":0.65,"bassLevel":0.8,"pedalFallback":true},"source":{"repository":"musetrainer/library","commit":"9128876f6164d96997c877a2be843349a32bdabb","path":"scores/Gymnopdie_No._1__Satie.mxl","containerRoot":"score.xml","original_sha256":"caa620432bb90503e62f5978e60935bc881e633e594f2d83eb655152968e424b","blob_sha":"7843b33af2714d9ff982f04002177daa09982c7f","edition_url":"https://musescore.com/user/19710/scores/4766391","rights_in_file":"","licence_note":"Source collection declares public domain; retained source and edition credits. Not an independent legal certification."},"validation":{"status":"structural checks; pianist edition review pending","writtenMeasures":78,"pitchedNotes":469,"staffNotes":{"1":152,"2":317},"parts":1,"repeats":0}},{"id":"fur-elise","title":"Für Elise, WoO 59","composer":"Ludwig van Beethoven","kind":"two-hand score","bpm":72,"url":"scores/fur-elise.musicxml","sha256":"6e08c8dfd297eb67531fd3ea884167b8bb1d4320f3f4c81f643a1e64769c9307","difficulty":{"level":6,"technical":6,"reading":5,"musical":6,"status":"provisional; not an exam grade"},"skills":["Repeated notes","Changing textures","Middle-section technique"],"lesson":"This is the full source edition, not just the familiar opening. Work in short sections; the middle passages are harder than the opening theme.","profile":{"phraseBeats":12,"rubatoAmount":0.12,"melodyBoost":1.25,"innerLevel":0.65,"bassLevel":0.8,"pedalFallback":false},"source":{"repository":"musetrainer/library","commit":"9128876f6164d96997c877a2be843349a32bdabb","path":"scores/Fur_Elise.mxl","containerRoot":"score.xml","original_sha256":"21787ffe3196193718ecfdca7c8b631d63d7fe66b532635f4c5e9cab039c524f","blob_sha":"3650e302b256339d833eef40618a7991daa2b50d","edition_url":"https://musescore.com/user/19710/scores/33816","rights_in_file":"","licence_note":"Source collection declares public domain; retained source and edition credits. Not an independent legal certification."},"validation":{"status":"structural checks; pianist edition review pending","writtenMeasures":106,"pitchedNotes":904,"staffNotes":{"1":517,"2":387},"parts":1,"repeats":3}},{"id":"chopin-nocturne","title":"Nocturne in E-flat major, Op. 9 No. 2","composer":"Frédéric Chopin","kind":"two-hand score","bpm":60,"url":"scores/chopin-nocturne.musicxml","sha256":"bf6b258690f41f63ec67c0c4a3b64563ae3d1776e369b2253735673f368ad1a8","difficulty":{"level":8,"technical":7,"reading":7,"musical":8,"status":"provisional; not an exam grade"},"skills":["Cantabile melody","Ornaments","Left-hand balance"],"lesson":"Keep the accompaniment quiet and connected beneath the melody. Treat timing and ornament choices as interpretation, not a single compulsory model.","profile":{"phraseBeats":24,"rubatoAmount":0.28,"melodyBoost":1.25,"innerLevel":0.65,"bassLevel":0.8,"pedalFallback":false},"source":{"repository":"musetrainer/library","commit":"9128876f6164d96997c877a2be843349a32bdabb","path":"scores/Chopin_-_Nocturne_Op_9_No_2_E_Flat_Major.mxl","containerRoot":"lg-209166603.xml","original_sha256":"271cb6b0be8bad3f784bad4ea30fba26848f929d257b47ec9b43a77d39bc7969","blob_sha":"f62fecfbcbebee884f4a82456c562d75c5417e2d","edition_url":"http://musescore.com/user/6662591/scores/4383881","rights_in_file":"","licence_note":"Source collection declares public domain; retained source and edition credits. Not an independent legal certification."},"validation":{"status":"structural checks; pianist edition review pending","writtenMeasures":38,"pitchedNotes":1253,"staffNotes":{"1":478,"2":775},"parts":1,"repeats":0}},{"id":"clair-de-lune","title":"Clair de Lune","composer":"Claude Debussy","kind":"legacy melody demo","bpm":54,"url":"https://raw.githubusercontent.com/SBurrell23/Sheets/c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05/songs/classical/clair-de-lune.musicxml","legacy":true,"lesson":"Reduced or unreviewed demo. Not a complete two-hand piano lesson."},{"id":"turkish-march","title":"Rondo alla Turca (Turkish March)","composer":"W. A. Mozart","kind":"legacy melody demo","bpm":100,"url":"https://raw.githubusercontent.com/SBurrell23/Sheets/c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05/songs/classical/turkish-march.musicxml","legacy":true,"lesson":"Reduced or unreviewed demo. Not a complete two-hand piano lesson."},{"id":"entertainer","title":"The Entertainer","composer":"Scott Joplin","kind":"legacy melody demo","bpm":92,"url":"https://raw.githubusercontent.com/SBurrell23/Sheets/c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05/songs/ragtime/ragtime/the-entertainer.musicxml","legacy":true,"lesson":"Reduced or unreviewed demo. Not a complete two-hand piano lesson."},{"id":"maple-leaf","title":"Maple Leaf Rag","composer":"Scott Joplin","kind":"legacy melody demo","bpm":90,"url":"https://raw.githubusercontent.com/SBurrell23/Sheets/c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05/songs/ragtime/ragtime/maple-leaf-rag.musicxml","legacy":true,"lesson":"Reduced or unreviewed demo. Not a complete two-hand piano lesson."},{"id":"easy-winners","title":"The Easy Winners","composer":"Scott Joplin","kind":"legacy melody demo","bpm":88,"url":"https://raw.githubusercontent.com/SBurrell23/Sheets/c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05/songs/ragtime/ragtime/the-easy-winners.musicxml","legacy":true,"lesson":"Reduced or unreviewed demo. Not a complete two-hand piano lesson."},{"id":"solace","title":"Solace — A Mexican Serenade","composer":"Scott Joplin","kind":"legacy melody demo","bpm":76,"url":"https://raw.githubusercontent.com/SBurrell23/Sheets/c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05/songs/ragtime/ragtime/solace.musicxml","legacy":true,"lesson":"Reduced or unreviewed demo. Not a complete two-hand piano lesson."}];

const lpSongWrap=document.createElement('label');
lpSongWrap.id='lpSongWrap';
lpSongWrap.style.cssText='display:flex;align-items:center;gap:5px;flex:0 0 auto;white-space:nowrap';
const lpSongText=document.createElement('span');
lpSongText.id='lpSongText';lpSongText.textContent='Song';
lpSongText.style.cssText='font-size:12px;color:#aecaDC';
const lpSongSelect=document.createElement('select');
lpSongSelect.id='lpSongSelect';lpSongSelect.title='Choose a piano piece';
lpSongSelect.setAttribute('aria-label','Choose a piano piece');
lpSongSelect.style.cssText='max-width:min(360px,38vw);min-width:170px';
for(const song of LP_SONGS){
  const opt=document.createElement('option');opt.value=song.id;
  opt.textContent=song.title+' — '+song.composer+(song.kind==='full score'?'':' ['+song.kind+']');
  lpSongSelect.append(opt);
}
lpSongSelect.value='moonlight';lpSongWrap.append(lpSongText,lpSongSelect);
const lpTop=document.querySelector('.topbar');
const lpMode=document.querySelector('#expressionMode');
if(lpMode){
  for(const opt of lpMode.options){
    if(opt.value==='practice')opt.textContent='Exact notes · steady pulse';
    else if(opt.value==='performance')opt.textContent='Soulful · performance interpretation';
  }
  lpMode.title='Exact mode follows the selected score; Soulful mode adds illustrative interpretation.';
}
// expressionMode is already a child of the toolbar, not a wrapper for it.
if(lpTop&&lpMode?.parentElement===lpTop)lpTop.insertBefore(lpSongWrap,lpMode);
else if(lpTop)lpTop.append(lpSongWrap);
const lpSongInfo=document.createElement('span');
lpSongInfo.id='lpSongInfo';lpSongInfo.className='badge';
lpSongInfo.textContent='Full score';lpSongInfo.title='Score source type';
lpSongWrap.insertAdjacentElement('afterend',lpSongInfo);
const lpSongStyle=document.createElement('style');
lpSongStyle.textContent=`
#lpSongWrap select{background:#102130;color:#eef7ff;border:1px solid #38556d;border-radius:8px;padding:7px 8px}
#lpSongWrap select:disabled{opacity:.55}
#lpSongInfo{font-size:11px}
@media(max-width:900px){#lpSongWrap select{max-width:260px;min-width:150px;padding:6px}}
@media(max-width:680px){#lpSongText,#lpSongInfo{display:none}#lpSongWrap select{max-width:48vw;min-width:140px}}
`;
document.head.append(lpSongStyle);

const lpSongCache=new Map();
let lpSongRequest=0,lpSongController=null;
function lpSongLabel(song){return song.title+' — '+song.composer}
function lpSongKindText(song){return song.legacy?'Legacy demo':song.difficulty?'Two-hand score · provisional level '+song.difficulty.level+'/10':song.kind}
function lpValidateSongText(text){
  if(typeof text!=='string'||!text.trim())throw Error('The score download is empty.');
  if(text.length>5000000)throw Error('The score exceeds the 5 MB import limit.');
  const documentXML=new DOMParser().parseFromString(text,'application/xml');
  const error=documentXML.querySelector('parsererror');
  if(error)throw Error('Malformed XML: '+error.textContent.trim().replace(/\s+/g,' ').slice(0,180));
  const root=documentXML.documentElement?.localName;
  if(root==='score-timewise')throw Error('This importer requires partwise MusicXML, not timewise MusicXML.');
  if(root!=='score-partwise')throw Error('The download is not a partwise MusicXML score.');
}
async function lpFetchSong(song,signal){
  if(lpSongCache.has(song.id))return lpSongCache.get(song.id);
  const response=await fetch(song.url,{cache:'no-cache',signal});
  if(!response.ok)throw Error('Score download failed (HTTP '+response.status+').');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength>5000000)throw Error('Score exceeds the 5 MB limit.');
  if(song.sha256){
    if(!globalThis.crypto?.subtle)throw Error('Use HTTPS to verify the bundled score.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==song.sha256)throw Error('Score integrity mismatch. Run loader.php to reinstall the matched library.');
  }
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);lpValidateSongText(text);
  return text;
}
async function lpLoadSong(song){
  const previousId=lpSongSelect.dataset.loaded||'moonlight';
  const previousInfo={text:lpSongInfo.textContent,title:lpSongInfo.title};
  const request=++lpSongRequest;
  lpSongController?.abort();
  const controller=new AbortController();lpSongController=controller;
  let timedOut=false,stage='download';
  const timer=setTimeout(()=>{timedOut=true;controller.abort()},20000);
  lpSongSelect.disabled=true;lpSongSelect.setAttribute('aria-busy','true');
  lpSongInfo.textContent='Loading…';
  // Stop the current transport AND its sounding/scheduled voices, synchronously.
  pause();setStatus('Loading '+lpSongLabel(song)+'…');
  try{
    const xmlText=await lpFetchSong(song,controller.signal);
    if(request!==lpSongRequest)return false;
    stage='parse';
    // parseXML performs its own DOM parsing. Passing an XMLDocument here made
    // valid files fail as "Invalid MusicXML" (it received [object XMLDocument]).
    const parsed=parseXML(xmlText,lpSongLabel(song));
    if(!parsed.notes?.length||!Number.isFinite(parsed.total)||parsed.total<=0)throw Error('No playable notes were imported.');
    const suggested=Number(song.bpm);
    if(Number.isFinite(suggested)&&suggested>0){
      parsed.scoreBpm=parsed.bpm;parsed.bpm=suggested;
      parsed.tempoSource='library practice suggestion';
    }
    const selectedMode=lpMode?.value||'practice';
    stage='apply';
    // apply() already updates the real tempo slider, timeline and listener.
    // There is no global "bpm" control. Set the score tempo BEFORE applying it.
    parsed.libraryProfile=song.profile||null;parsed.libraryInfo=song;
    apply(parsed,lpSongLabel(song));
    if(lpMode){lpMode.value=selectedMode;lpMode.dispatchEvent(new Event('change',{bubbles:true}))}
    lpSongCache.set(song.id,xmlText);
    lpSongSelect.value=song.id;lpSongSelect.dataset.loaded=song.id;
    lpSongInfo.textContent=lpSongKindText(song);
    lpSongInfo.title=song.kind==='melody arrangement'
      ? 'Reduced teaching arrangement; exact mode follows this arrangement, not the complete original piano score.'
      : 'The MusicXML score/arrangement supplied by the listed source.';
    setStatus(lpSongLabel(song)+' — '+parsed.notes.length+' notes. '+lpSongKindText(song)+'. Both playback modes available; ♩ = '+parsed.bpm+' BPM (practice suggestion).');
    d('info','song_loaded',{song:song.id,notes:parsed.notes.length,bpm:parsed.bpm,mode:selectedMode,sourceType:song.kind});
    return true;
  }catch(err){
    if(request!==lpSongRequest)return false;
    lpSongCache.delete(song.id);
    lpSongSelect.value=previousId;
    lpSongInfo.textContent=previousInfo.text;lpSongInfo.title=previousInfo.title;
    const message=timedOut?'The score download timed out after 20 seconds. Please try again.':String(err.message||err);
    setStatus('Could not load '+lpSongLabel(song)+': '+message,true);
    d('error','song_load_failed',{song:song.id,stage,error:message});
    return false;
  }finally{
    clearTimeout(timer);
    if(request===lpSongRequest){lpSongController=null;lpSongSelect.disabled=false;lpSongSelect.removeAttribute('aria-busy')}
  }
}
lpSongSelect.addEventListener('change',()=>{const song=LP_SONGS.find(s=>s.id===lpSongSelect.value);if(song)lpLoadSong(song)});
lpSongSelect.dataset.loaded='moonlight';
// The default uses the same local verified score path as every library song.
loadDemo=async function(){return lpLoadSong(LP_SONGS[0]);};
