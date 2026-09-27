/* LearnPiano song library v1
 * Adds an 11-piece song menu (Moonlight + 10 additional public-domain works).
 * Every loaded score goes through the existing parseXML/apply pipeline, so the
 * Practice/exact-pulse and Performance/soulful modes remain available.
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
lpSongText.textContent='Song';
lpSongText.style.cssText='font-size:12px;color:#aecaDC';
const lpSongSelect=document.createElement('select');
lpSongSelect.id='lpSongSelect';
lpSongSelect.title='Choose a piano piece';
lpSongSelect.style.cssText='max-width:min(360px,38vw);min-width:170px';
for(const song of LP_SONGS){
  const opt=document.createElement('option');
  opt.value=song.id;
  opt.textContent=song.title+' — '+song.composer+(song.kind==='full score'?'':' ['+song.kind+']');
  lpSongSelect.append(opt);
}
lpSongSelect.value='moonlight';
lpSongWrap.append(lpSongText,lpSongSelect);

const lpTop=document.querySelector('.topbar');
const lpMode=document.querySelector('#expressionMode');
if(lpMode){
  for(const opt of lpMode.options){
    if(opt.value==='practice') opt.textContent='Exact notes · steady pulse';
    else if(opt.value==='performance') opt.textContent='Soulful · performance interpretation';
  }
  lpMode.title='Exact mode follows the selected score; Soulful mode adds illustrative phrasing, dynamics and timing shape.';
}
if(lpMode?.parentElement) lpMode.parentElement.insertAdjacentElement('beforebegin',lpSongWrap);
else if(lpTop) lpTop.append(lpSongWrap);

const lpSongInfo=document.createElement('span');
lpSongInfo.id='lpSongInfo';
lpSongInfo.className='badge';
lpSongInfo.textContent='Full score';
lpSongInfo.title='Score source type';
lpSongWrap.insertAdjacentElement('afterend',lpSongInfo);

const lpSongStyle=document.createElement('style');
lpSongStyle.textContent=`
#lpSongWrap select{background:#102130;color:#eef7ff;border:1px solid #38556d;border-radius:8px;padding:7px 8px}
#lpSongWrap select:disabled{opacity:.55}
#lpSongInfo{font-size:11px}
@media(max-width:900px){
  #lpSongWrap select{max-width:260px;min-width:150px;padding:6px}
}
@media(max-width:680px){
  #lpSongText,#lpSongInfo{display:none}
  #lpSongWrap select{max-width:48vw;min-width:140px}
}`;
document.head.append(lpSongStyle);

const lpSongCache=new Map();
function lpSongLabel(song){return song.title+' — '+song.composer}
function lpSongKindText(song){if(song.kind==='full score')return'Full score';if(song.kind==='full arrangement')return'Full arrangement';return'Melody arrangement'}
async function lpFetchSong(song){
  if(lpSongCache.has(song.id)) return lpSongCache.get(song.id);
  const response=await fetch(song.url,{cache:'force-cache'});
  if(!response.ok) throw new Error('HTTP '+response.status);
  const text=await response.text();
  if(!/<score-(partwise|timewise)\b/i.test(text)) throw new Error('Downloaded file is not MusicXML');
  lpSongCache.set(song.id,text);return text;
}
async function lpLoadSong(song){
  const previous=LP_SONGS.find(s=>s.id===lpSongSelect.dataset.loaded)||LP_SONGS[0];
  const previousMode=lpMode?.value||'practice';
  lpSongSelect.disabled=true;lpSongInfo.textContent='Loading…';
  try{
    if(typeof playing!=='undefined'&&playing&&typeof togglePlay==='function') togglePlay();
    if(typeof stopSources==='function') stopSources();
    if(typeof setStatus==='function') setStatus('Loading '+lpSongLabel(song)+'…');
    const xmlText=await lpFetchSong(song);
    const doc=new DOMParser().parseFromString(xmlText,'application/xml');
    if(doc.querySelector('parsererror')) throw new Error('MusicXML parse error');
    const parsed=parseXML(doc);
    apply(parsed,lpSongLabel(song));
    if(lpMode){lpMode.value=previousMode;lpMode.dispatchEvent(new Event('change',{bubbles:true}))}
    if(typeof bpm!=='undefined'&&bpm){
      bpm.value=String(song.bpm);
      bpm.dispatchEvent(new Event('input',{bubbles:true}));
      bpm.dispatchEvent(new Event('change',{bubbles:true}));
    }
    lpSongSelect.dataset.loaded=song.id;
    lpSongInfo.textContent=lpSongKindText(song);
    lpSongInfo.title=song.kind==='melody arrangement'
      ? 'This library source is a reduced public-domain teaching arrangement, not the complete original piano texture.'
      : 'This source contains the complete score/arrangement represented by the MusicXML file.';
    if(typeof setStatus==='function'){
      const suffix=song.kind==='melody arrangement'
        ? ' Teaching arrangement loaded; exact mode follows this arrangement exactly.'
        : ' Ready in exact-pulse or soulful Performance mode.';
      setStatus(lpSongLabel(song)+'.'+suffix);
    }
  }catch(err){
    lpSongSelect.value=previous.id;
    lpSongInfo.textContent=lpSongKindText(previous);
    if(typeof setStatus==='function') setStatus('Could not load '+lpSongLabel(song)+': '+String(err),true);
    if(typeof d==='function') d('error','song_load_failed',{song:song.id,error:String(err)});
  }finally{lpSongSelect.disabled=false}
}
lpSongSelect.addEventListener('change',()=>{const song=LP_SONGS.find(s=>s.id===lpSongSelect.value);if(song)lpLoadSong(song)});
lpSongSelect.dataset.loaded='moonlight';
