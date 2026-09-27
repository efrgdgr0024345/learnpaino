/* LearnPiano song library v1.1
 * Every song uses the existing text-based MusicXML importer and both playback
 * modes. Loading a new song must not change the calibrated trainer geometry.
 */
const LP_SONG_SOURCE_COMMIT='c2a1e72b83cc74514d796d9bfd6e50f5a1af9a05';
const LP_SONG_RAW='https://raw.githubusercontent.com/SBurrell23/Sheets/'+LP_SONG_SOURCE_COMMIT+'/';

const LP_SONGS=[
  {id:'moonlight',title:'Moonlight Sonata — I. Adagio sostenuto',composer:'Ludwig van Beethoven',kind:'full score',bpm:52,url:'https://raw.githubusercontent.com/fosfrancesco/piano_corpora_dcml/aa732b635bc75c6583d86c6ac488e77b08b1b37e/scores/beethoven_piano_sonatas/14-1.musicxml'},
  {id:'fur-elise',title:'Für Elise',composer:'Ludwig van Beethoven',kind:'melody arrangement',bpm:72,url:LP_SONG_RAW+'songs/classical/fur-elise.musicxml'},
  {id:'bach-prelude-c',title:'Prelude in C Major, BWV 846',composer:'J. S. Bach',kind:'melody arrangement',bpm:60,url:LP_SONG_RAW+'songs/classical/bach-prelude-in-c.musicxml'},
  {id:'gymnopedie-1',title:'Gymnopédie No. 1',composer:'Erik Satie',kind:'melody arrangement',bpm:66,url:LP_SONG_RAW+'songs/classical/gymnopedie-no1.musicxml'},
  {id:'clair-de-lune',title:'Clair de Lune',composer:'Claude Debussy',kind:'melody arrangement',bpm:54,url:LP_SONG_RAW+'songs/classical/clair-de-lune.musicxml'},
  {id:'chopin-nocturne',title:'Nocturne in E-flat Major, Op. 9 No. 2',composer:'Frédéric Chopin',kind:'melody arrangement',bpm:60,url:LP_SONG_RAW+'songs/classical/nocturne-op9-no2.musicxml'},
  {id:'turkish-march',title:'Rondo alla Turca (Turkish March)',composer:'W. A. Mozart',kind:'melody arrangement',bpm:100,url:LP_SONG_RAW+'songs/classical/turkish-march.musicxml'},
  {id:'entertainer',title:'The Entertainer',composer:'Scott Joplin',kind:'full arrangement',bpm:92,url:LP_SONG_RAW+'songs/ragtime/ragtime/the-entertainer.musicxml'},
  {id:'maple-leaf',title:'Maple Leaf Rag',composer:'Scott Joplin',kind:'full arrangement',bpm:90,url:LP_SONG_RAW+'songs/ragtime/ragtime/maple-leaf-rag.musicxml'},
  {id:'easy-winners',title:'The Easy Winners',composer:'Scott Joplin',kind:'full arrangement',bpm:88,url:LP_SONG_RAW+'songs/ragtime/ragtime/the-easy-winners.musicxml'},
  {id:'solace',title:'Solace — A Mexican Serenade',composer:'Scott Joplin',kind:'full arrangement',bpm:76,url:LP_SONG_RAW+'songs/ragtime/ragtime/solace.musicxml'}
];

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
function lpSongKindText(song){return song.kind==='full score'?'Full score':song.kind==='full arrangement'?'Full arrangement':'Melody arrangement'}
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
  const text=await response.text();lpValidateSongText(text);
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
// Wait for the existing automatic demo load before enabling manual selection.
// Otherwise its late response could overwrite a just-selected menu song.
const lpOriginalLoadDemo=loadDemo;
loadDemo=async function(){
  lpSongSelect.disabled=true;
  try{return await lpOriginalLoadDemo()}
  finally{if(!lpSongController)lpSongSelect.disabled=false}
};
