/* LearnPiano library/import v2. Runs inside the existing trainer closure, last.
 * Scores remain notation, not generated accompaniment. Levels/profile choices
 * are provisional teaching suggestions, never examination grades or recordings.
 */
function libraryXML(text){
  if(typeof text!=='string')throw Error('Invalid MusicXML');
  if(!text.trim()||text.length>5000000)throw Error('Choose a non-empty MusicXML score below 5 MB.');
  if(/<!ENTITY\b|<!DOCTYPE[^>]*\[/i.test(text))throw Error('Custom XML entities are not accepted. Export plain MusicXML.');
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')||doc.documentElement?.localName!=='score-partwise')throw Error('Invalid MusicXML: expected a partwise score.');
  if(doc.querySelectorAll('note').length>50000)throw Error('This score exceeds the 50,000-note limit.');
  return doc;
}
/* Expand ordinary forward/backward repeats and first/second endings. Complex
 * navigation is explicitly reported and left in written order, not guessed. */
function libraryUnfold(doc){
  const parts=[...doc.documentElement.children].filter(e=>e.localName==='part');
  if(!parts.length)throw Error('No score parts.');
  const bars=[...parts[0].children].filter(e=>e.localName==='measure'),warnings=[];
  const complex=doc.querySelector('sound[dacapo],sound[dalsegno],sound[tocoda],segno,coda');
  if(complex){warnings.push('D.C./D.S./coda navigation is not expanded; playback uses written order.');return{doc,warnings};}
  if(!bars.some(m=>m.querySelector('repeat')))return{doc,warnings};
  if(parts.some(p=>[...p.children].filter(e=>e.localName==='measure').length!==bars.length)){
    warnings.push('Unequal part measure counts: repeats left in written order.');return{doc,warnings};
  }
  const endings=[];let ending=null;
  for(const bar of bars){
    const events=[...bar.querySelectorAll('ending')];
    const begin=events.find(e=>e.getAttribute('type')==='start');
    if(begin)ending=(begin.getAttribute('number')||'').split(/[, ]+/).map(Number).filter(Number.isFinite);
    endings.push(ending);
    if(events.some(e=>['stop','discontinue'].includes(e.getAttribute('type'))))ending=null;
  }
  const order=[],visits=new Map();let start=0,pass=1,i=0,steps=0;
  while(i<bars.length){
    if(++steps>4096)throw Error('Repeat structure exceeds the supported limit.');
    const bar=bars[i];
    if(bar.querySelector('repeat[direction="forward"]')&&i!==start){start=i;pass=1;}
    const allowed=!endings[i]?.length||endings[i].includes(pass);
    if(allowed)order.push(i);
    const back=bar.querySelector('repeat[direction="backward"]');
    if(back&&allowed){
      const times=Number(back.getAttribute('times')||2);
      if(!Number.isInteger(times)||times<1||times>4)throw Error('Repeat count must be between 1 and 4.');
      const count=visits.get(i)||0;
      if(count<times-1){visits.set(i,count+1);pass=count+2;i=start;continue;}
    }
    i++;
  }
  for(const p of parts){
    const original=[...p.children].filter(e=>e.localName==='measure');
    original.forEach(m=>p.removeChild(m));
    order.forEach(index=>{const clone=original[index].cloneNode(true);clone.querySelectorAll('repeat,ending').forEach(e=>e.remove());p.append(clone);});
  }
  warnings.push('Standard written repeats expanded; repeated bars retain their original labels.');
  return{doc,warnings};
}
const libraryPreviousParse=parseXML;
parseXML=function(text,label='Imported score'){
  const initial=libraryXML(text),pitched=initial.querySelectorAll('note pitch').length;
  const writtenMeasures=initial.querySelector('part')?.querySelectorAll('measure').length||0;
  const unsupported=[];
  if(initial.querySelector('grace,ornaments'))unsupported.push('Grace notes/ornaments need interpretation review; not all ornament playback is implemented.');
  if(initial.querySelector('transpose'))unsupported.push('Instrument transposition is not applied; use a concert-pitch piano score.');
  const {doc,warnings}=libraryUnfold(initial);
  // Translate metronome beat-units into quarter-note BPM when sound tempo is absent.
  doc.querySelectorAll('direction').forEach(e=>{
    if(e.querySelector('sound[tempo]'))return;
    const m=e.querySelector('metronome');if(!m)return;
    const per=Number(m.querySelector('per-minute')?.textContent),unit=m.querySelector('beat-unit')?.textContent;
    const mult={whole:4,half:2,quarter:1,eighth:.5,'16th':.25}[unit];
    const dots=m.querySelectorAll('beat-unit-dot').length;
    if(per>0&&mult){const sound=doc.createElement('sound');sound.setAttribute('tempo',String(per*mult*(2-Math.pow(.5,dots))));e.append(sound);}
  });
  const s=libraryPreviousParse(new XMLSerializer().serializeToString(doc),label);
  // The existing coach preserves hand assignments from actual staves/parts.
  for(const n of s.notes){
    if(n.coachHand==='left')n.staff=2;else if(n.coachHand==='right')n.staff=1;
    if(!s.moonlight)n.role=n.coachHand==='left'?'bass':n.coachHand==='right'?(n.voice===1?'melody':'inner'):'inner';
  }
  s.importReview={sourcePitchedNotes:pitched,writtenMeasures,
    warnings:[...warnings,...unsupported],hands:[...new Set(s.notes.map(n=>n.coachHand).filter(Boolean))],editoriallyVerified:false};
  return s;
};
/* Smooth, invertible timing; the same function is used for audio, falling notes,
 * seeking and feedback. Profile choices are illustrative, never random jitter. */
const libraryOldSeconds=expressiveSeconds,libraryOldVelocity=expressionVelocity,libraryOldRelease=noteReleaseBeat;
expressiveSeconds=function(b){
  const p=score.libraryProfile;
  if(!p)return libraryOldSeconds(b);
  const q=60/(+tempo.value||52);
  return (b+(performanceMode==='performance'?p.rubatoAmount*Math.sin(2*Math.PI*b/p.phraseBeats):0))*q;
};
expressionVelocity=function(n){
  const p=score.libraryProfile;if(!p)return libraryOldVelocity(n);
  if(performanceMode!=='performance')return .56;
  const balance=n.role==='melody'?p.melodyBoost:n.role==='bass'?p.bassLevel:p.innerLevel;
  return clamp((Number.isFinite(n.v)?n.v:.56)*balance*(.96+.06*Math.sin(2*Math.PI*n.s/p.phraseBeats)),.12,.92);
};
noteReleaseBeat=function(n){
  const end=libraryOldRelease(n),p=score.libraryProfile;
  if(performanceMode!=='performance'||!p?.pedalFallback||score.pedals?.length)return end;
  const next=(score.measureStarts||[]).find(b=>b>n.s+.03);
  return next?Math.max(end,Math.min(next-.04,n.s+4)):end;
};
const libraryOldFrame=frame;
frame=function(){libraryOldFrame();const p=score.libraryProfile;if(!p)return;
  const factor=performanceMode==='performance'?1+p.rubatoAmount*2*Math.PI/p.phraseBeats*Math.cos(2*Math.PI*beat/p.phraseBeats):1;
  expressBadge.textContent=(performanceMode==='practice'?'Exact pulse':'Illustrative phrase profile')+' · ♩≈'+Math.round(+tempo.value/factor);
  pedalBadge.textContent=performanceMode==='practice'?'Pedal: off':score.pedals?.length?'Pedal: score':p.pedalFallback?'Pedal: illustrative bar changes':'Pedal: no added sustain';
};

/* Bounded local MXL reader. Only META-INF/container.xml and its root XML are
 * decompressed. No image/URL resolution, upload, disk extraction or script exec. */
async function libraryReadFile(f){
  if(!f||f.size>8000000)throw Error('Maximum file size is 8 MB (5 MB unpacked MusicXML).');
  if(!/\.mxl$/i.test(f.name)){const text=await f.text();libraryXML(text);return text;}
  const bytes=new Uint8Array(await f.arrayBuffer()),v=new DataView(bytes.buffer),len=bytes.length;
  const u16=o=>v.getUint16(o,true),u32=o=>v.getUint32(o,true);let eocd=-1;
  for(let i=len-22;i>=Math.max(0,len-65557);i--)if(u32(i)===0x06054b50&&i+22+u16(i+20)===len){eocd=i;break;}
  if(eocd<0||u16(eocd+4)||u16(eocd+6))throw Error('Invalid or split ZIP archive.');
  const count=u16(eocd+10),centralSize=u32(eocd+12),offset=u32(eocd+16);
  if(!count||count>512||offset+centralSize>eocd)throw Error('Unsupported MXL archive size.');
  const entries=new Map();let at=offset;
  for(let i=0;i<count;i++){
    if(at+46>len||u32(at)!==0x02014b50)throw Error('Invalid MXL directory.');
    const flags=u16(at+8),method=u16(at+10),crc=u32(at+16),compressed=u32(at+20),size=u32(at+24);
    const nl=u16(at+28),el=u16(at+30),cl=u16(at+32),local=u32(at+42);
    if(at+46+nl+el+cl>offset+centralSize)throw Error('Truncated MXL directory.');
    const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.slice(at+46,at+46+nl));
    if(flags&1||!([0,8].includes(method))||[compressed,size,local].includes(0xffffffff))throw Error('Encrypted/ZIP64/unsupported compression is not accepted.');
    if(name.startsWith('/')||name.includes('\\')||name.includes(':')||name.includes('\0')||name.split('/').includes('..')||entries.has(name))throw Error('Unsafe or duplicate MXL path.');
    entries.set(name,{flags,method,crc,compressed,size,local});at+=46+nl+el+cl;
  }
  const crc32=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
  async function extract(name,limit){
    const e=entries.get(name);if(!e||e.size>limit||e.local+30>offset)throw Error('Missing or oversized MXL component.');
    const p=e.local;if(u32(p)!==0x04034b50||u16(p+8)!==e.method||(u16(p+6)&1))throw Error('Invalid MXL local header.');
    const nl=u16(p+26),start=p+30+nl+u16(p+28);
    if(new TextDecoder().decode(bytes.slice(p+30,p+30+nl))!==name||start+e.compressed>offset)throw Error('Truncated or mismatched MXL component.');
    const raw=bytes.slice(start,start+e.compressed);let out;
    if(e.method===0)out=raw;else{
      let ds;try{ds=new DecompressionStream('deflate-raw');}catch(_){throw Error('This browser cannot unpack MXL. Export uncompressed MusicXML instead.');}
      const reader=new Blob([raw]).stream().pipeThrough(ds).getReader(),chunks=[];let total=0;
      try{for(;;){const r=await reader.read();if(r.done)break;total+=r.value.length;if(total>limit||total>e.size)throw Error('MXL unpacked size limit exceeded.');chunks.push(r.value);}}
      finally{await reader.cancel().catch(()=>{});}
      out=new Uint8Array(total);let pos=0;for(const b of chunks){out.set(b,pos);pos+=b.length;}
    }
    if(out.length!==e.size||crc32(out)!==e.crc)throw Error('MXL CRC/length check failed.');
    return new TextDecoder('utf-8',{fatal:true}).decode(out);
  }
  const container=await extract('META-INF/container.xml',65536);
  if(/<!ENTITY\b|<!DOCTYPE[^>]*\[/i.test(container))throw Error('Custom container entities are not accepted.');
  const doc=new DOMParser().parseFromString(container,'application/xml');
  if(doc.querySelector('parsererror')||doc.documentElement?.localName!=='container')throw Error('Invalid MXL container.');
  const root=doc.querySelector('rootfile')?.getAttribute('full-path');if(!root)throw Error('MXL rootfile missing.');
  const text=await extract(root,5000000);libraryXML(text);return text;
}

const libraryStyle=document.createElement('style');libraryStyle.textContent=`
/* Toolbar metadata is non-wrapping: changing titles must not move calibration. */
.topbar{box-sizing:border-box;flex:0 0 var(--lpbar,52px);height:var(--lpbar,52px);min-height:var(--lpbar,52px);max-height:var(--lpbar,52px);overflow-x:auto;overflow-y:hidden}
.topbar>*{flex-shrink:0;white-space:nowrap}
.topbar .badge{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.topbar #fileInfo{max-width:180px}
@media(max-width:680px){.topbar #fileInfo{display:none}}
#lpLibrary{box-sizing:border-box;width:min(940px,calc(100vw - 24px));max-height:calc(100dvh - 24px);background:#0d1823;color:#eaf5ff;border:1px solid #426177;border-radius:16px;padding:20px;overflow:auto;font:15px/1.5 system-ui}
#lpLibrary::backdrop{background:#000b}#lpLibrary .libTop{display:flex;justify-content:space-between;gap:12px;align-items:center}#lpLibrary h2{margin:0;font-size:23px}#lpLibrary p{margin:8px 0;color:#bfd0df}
#lpLibrary .libFilters{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}#lpLibrary input[type=search]{flex:1;min-width:170px;background:#071019;color:white;border:1px solid #426177;border-radius:8px;padding:10px}
#lpLibrary .libGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}#lpLibrary article{padding:14px;border:1px solid #2c4154;border-radius:12px;background:#102130}#lpLibrary h3{margin:0;font-size:17px}#lpLibrary button{min-height:42px}#lpLibrary .libMeta{font-size:12px;color:#9fb5c7}#lpLibrary #libPreview{white-space:pre-wrap}#lpLibrary [hidden]{display:none!important}
body.focus #lpLibrary{display:none!important}@media(max-width:600px){#lpLibrary{padding:14px}#lpLibrary .libGrid{grid-template-columns:1fr}}
`;document.head.append(libraryStyle);
const libraryButton=document.createElement('button');libraryButton.id='lpBrowse';libraryButton.textContent='Library';lpSongWrap.insertAdjacentElement('beforebegin',libraryButton);
const libraryDialog=document.createElement('dialog');libraryDialog.id='lpLibrary';
libraryDialog.innerHTML=`<div class="libTop"><h2>Piano library</h2><button id="libClose" aria-label="Close library">× Close</button></div><p>Two-hand source scores, with suggested practice levels and individual expressive profiles. Levels are provisional 1–10 suggestions, not examination grades.</p><div class="libFilters"><input id="libSearch" type="search" placeholder="Search title, composer or skill" aria-label="Search piano library"><select id="libLevel" aria-label="Difficulty filter"><option value="all">All levels</option><option value="4">Up to level 4</option><option value="6">Up to level 6</option><option value="8">Up to level 8</option></select><label><input id="libLegacy" type="checkbox"> Show old melody demos</label></div><section id="libPreview" hidden></section><div id="libCards" class="libGrid"></div><p class="libMeta">Structural import checks are not a pianist's edition review. Original sources, warnings and credits stay with each score. Local score files are previewed on this device, not published. Score metadata may appear in diagnostics; Ask coach sends the selected excerpt only when requested.</p>`;
document.body.append(libraryDialog);
const L=id=>document.getElementById('lib'+id);
function libraryClose(){libraryDialog.close();libraryButton.focus();}
L('Close').onclick=libraryClose;
function libraryCards(){
  const q=L('Search').value.trim().toLowerCase(),max=Number(L('Level').value)||10;L('Cards').replaceChildren();
  for(const song of LP_SONGS){
    if(song.legacy&&!L('Legacy').checked)continue;
    if(song.difficulty&&song.difficulty.level>max)continue;
    if(q&&![song.title,song.composer,...(song.skills||[])].join(' ').toLowerCase().includes(q))continue;
    const card=document.createElement('article'),h=document.createElement('h3'),sub=document.createElement('p'),detail=document.createElement('p'),skills=document.createElement('p'),pick=document.createElement('button');
    h.textContent=song.title;sub.className='libMeta';sub.textContent=song.composer+' · '+(song.difficulty?'Level '+song.difficulty.level+'/10 (provisional)':'Unrated legacy demo');
    detail.textContent=song.lesson||'';skills.className='libMeta';skills.textContent=song.validation?`${song.validation.writtenMeasures} written measures · two notated staves/parts · ${song.skills.join(' · ')}`:'Incomplete/unreviewed demo; no two-hand completeness claim.';
    pick.textContent='Choose piece';pick.onclick=async()=>{libraryClose();lpSongSelect.value=song.id;await lpLoadSong(song);};card.append(h,sub,detail,skills,pick);
    if(song.source){const credit=document.createElement('a');credit.href='https://github.com/'+song.source.repository+'/blob/'+song.source.commit+'/'+song.source.path;credit.target='_blank';credit.rel='noopener noreferrer';credit.textContent='Source edition';credit.style.cssText='display:block;margin-top:8px;color:#8dd5ff';card.append(credit);}
    L('Cards').append(card);
  }
  if(!L('Cards').children.length)L('Cards').textContent='No pieces match those filters.';
}
libraryButton.onclick=()=>{L('Preview').hidden=true;libraryCards();libraryDialog.showModal();L('Search').focus();};
for(const id of ['Search','Level','Legacy'])L(id).addEventListener('input',libraryCards);
// Hide old reductions in their own optgroup; keep them accessible without
// presenting them as the new complete two-hand learning collection.
lpSongSelect.replaceChildren();for(const legacy of [false,true]){const g=document.createElement('optgroup');g.label=legacy?'Legacy melody demos — incomplete':'Two-hand source scores — provisional levels';for(const s of LP_SONGS.filter(s=>!!s.legacy===legacy)){const o=document.createElement('option');o.value=s.id;o.textContent=s.title+(s.difficulty?' · level '+s.difficulty.level:' [legacy demo]');g.append(o);}lpSongSelect.append(g);}lpSongSelect.value='moonlight';
let libraryImportGeneration=0;
file.accept='.musicxml,.xml,.mxl';file.parentElement.firstChild.textContent='Import sheet music';
file.onchange=async()=>{
  const f=file.files?.[0];if(!f)return;const gen=++libraryImportGeneration;lpSongController?.abort();lpSongRequest++;lpSongController=null;lpSongSelect.disabled=false;coachQuiet();setStatus('Reviewing local score…');
  try{const text=await libraryReadFile(f);if(gen!==libraryImportGeneration)return;
    const s=parseXML(text,f.name),review=s.importReview;L('Preview').replaceChildren();L('Preview').hidden=false;
    const heading=document.createElement('h3');heading.textContent='Import preview: '+s.title;
    const summary=document.createElement('p');summary.textContent=`${s.notes.length} playable note events · ${s.measureStarts.length} playback measures · ${review.hands.join(' + ')||'unassigned'} hand staff mapping.\n`+(review.hands.length<2?'Warning: this may be a melody-only or one-hand score.\n':'')+review.warnings.join('\n');
    const use=document.createElement('button');use.textContent='Load this score for practice';use.onclick=()=>{const mode=performanceMode;apply(s,f.name);lpMode.value=mode;lpMode.dispatchEvent(new Event('change'));lpSongSelect.selectedIndex=-1;lpSongSelect.dataset.loaded='imported';lpSongInfo.textContent='Private import · not reviewed';libraryClose();setStatus('Loaded local MusicXML. '+review.warnings.join(' '));};
    L('Preview').append(heading,summary,use);L('Cards').replaceChildren();libraryDialog.showModal();
  }catch(e){setStatus('Import failed: '+e.message,true);}finally{file.value='';}
};
const libraryOldCoachRefresh=coachRefreshScore;
coachRefreshScore=function(){libraryOldCoachRefresh();const info=score.libraryInfo;if(!info)return;
  C('Focus').querySelectorAll('[data-library-focus]').forEach(e=>e.remove());
  if(info.lesson){const opt=document.createElement('option');opt.dataset.libraryFocus='1';opt.value=info.lesson;opt.textContent='Piece focus · '+(info.skills||[]).join(', ');C('Focus').append(opt);C('Focus').value=opt.value;}
  C('Source').textContent+=(info.difficulty?' Provisional level '+info.difficulty.level+'/10. ':' ')+(score.importReview?.warnings||[]).join(' ');
};
// Preserve calibration exactly; only titles, notes and lesson metadata change.
libraryCards();
