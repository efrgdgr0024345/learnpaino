/* LearnPiano optional coach v1. Inject after the existing extensions, inside
 * their closure. Does not replace the piano, score, layout or sound engine. */
const coachStyle=document.createElement('style');
coachStyle.textContent=`
#coachPanel{position:fixed;right:12px;top:62px;width:min(400px,calc(100vw - 24px));max-height:calc(100dvh - 82px);overflow:auto;z-index:9500;background:#0d1823;border:1px solid #406078;border-radius:14px;padding:16px;box-shadow:0 15px 50px #0009;color:#eaf5ff;font-size:14px;line-height:1.5}
#coachPanel[hidden],body.focus #coachPanel{display:none!important}
#coachPanel h2{font-size:18px;margin:0}#coachPanel h3{font-size:14px;margin:16px 0 5px}#coachPanel p{margin:8px 0}
#coachPanel .coachRow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0}
#coachPanel button,#coachPanel select,#coachPanel input,#coachPanel textarea{font:inherit;max-width:100%;border:1px solid #496377;border-radius:8px;padding:8px;background:#102333;color:inherit;min-height:40px}
#coachPanel textarea{width:100%;resize:vertical;min-height:78px}#coachPanel input[type=checkbox]{min-height:0}
#coachPanel .coachMuted{color:#b0c2cf;font-size:12px}#coachPanel label{display:inline-flex;align-items:center;gap:5px}
#coachPanel button:disabled{opacity:.5;cursor:default}#coachReply{white-space:pre-wrap;margin:10px 0}#coachStatus{font-size:12px;color:#cde2ef;min-height:18px}
#coachPanel .coachNotice{background:#0a111a;border-left:3px solid #669ab8;padding:8px;font-size:12px}#coachPanel summary{cursor:pointer}
#coachPanel progress{width:100%}#coachPanel .coachError{color:#ffb6b6}
@media(max-height:480px){#coachPanel{top:8px;max-height:calc(100dvh - 16px)}}
`;
document.head.append(coachStyle);
const coachButton=document.createElement('button');coachButton.id='askCoach';coachButton.textContent='Ask coach';coachButton.setAttribute('aria-expanded','false');
playB.insertAdjacentElement('afterend',coachButton);
const coachPanel=document.createElement('section');coachPanel.id='coachPanel';coachPanel.hidden=true;coachPanel.setAttribute('aria-label','Optional piano coach');
coachPanel.innerHTML=`
<div class="coachRow" style="justify-content:space-between"><h2>Piano coach</h2><button id="coachClose" aria-label="Close coach">×</button></div>
<p class="coachMuted">AI explanations and AI-generated voice. Your piano still works without the coach.</p>
<div id="coachStatus" role="status" aria-live="polite"></div>
<div id="coachSetup" hidden class="coachNotice">Not configured yet. The owner must run <code>php tools/configure-coach.php</code> in cPanel Terminal. See <code>docs/AI_COACH.md</code>. Never put your API key in this page, chat or GitHub.</div>
<form id="coachLogin" hidden><label>Coach password <input id="coachPassword" type="password" autocomplete="current-password" maxlength="200" required></label><button type="submit">Unlock coach</button></form>
<p id="coachUsage" class="coachMuted"></p>
<details><summary>Privacy &amp; limits</summary><p class="coachMuted">Ask sends your question, selected score excerpt and approximate detector summary to your server and OpenAI. Record sends only your explicitly recorded question for transcription. Piano microphone audio is not uploaded. Read aloud sends the latest reply to OpenAI. No automatic recording or paid request on page load. Request ceilings are not dollar budgets.</p></details>
<h3>Choose a short passage</h3><p id="coachSource" class="coachMuted"></p>
<div class="coachRow"><label>From <select id="coachFrom"></select></label><label>To <select id="coachTo"></select></label></div>
<div class="coachRow"><label>Part <select id="coachHand"><option value="both">Both / all written notes</option><option value="right">Right-hand staff</option><option value="left">Left-hand staff</option></select></label><label><input id="coachRepeat" type="checkbox"> Repeat passage</label></div>
<div class="coachRow"><button id="coachDemo">Hear passage</button><button id="coachPractise">Practise passage</button><button id="coachEnd">Stop passage</button></div>
<label>Lesson focus <select id="coachFocus"><option value="Listen to the selected phrase before practising.">1 · Listen first</option><option value="Practise the right-hand staff alone.">2 · Right hand</option><option value="Practise the left-hand staff alone, if it exists.">3 · Left hand</option><option value="Join both hands slowly and keep the pulse steady.">4 · Hands together</option><option value="Compare exact and soulful playback; explore melody balance without changing notes.">5 · Musical expression</option></select></label>
<p class="coachMuted">These are five practice templates, not five certified editions. Exact/Soulful remains your player setting. Hand labels follow notation; cross-hand passages need checking.</p>
<h3>Ask a question</h3>
<textarea id="coachQuestion" maxlength="1800" placeholder="Explain this passage, or suggest what to practise next."></textarea>
<div class="coachRow"><button id="coachAsk" disabled>Ask</button><button id="coachRecord" disabled>Record question</button><button id="coachCancel">Cancel</button></div>
<p class="coachMuted">Record: tap to start, tap again to finish (maximum 30 seconds). Review the transcript before pressing Ask.</p>
<div id="coachEvidence" class="coachNotice">No attempt measured. Suggestions are not performance grades.</div>
<div id="coachReply" aria-live="polite"></div>
<div class="coachRow"><button id="coachApply" hidden>Apply suggested action</button><button id="coachSpeak" disabled>Read aloud</button><button id="coachMute">Stop voice</button></div>
<div class="coachRow"><button id="coachFeedback" disabled>Ask about last attempt</button><label><input id="coachAutoFeedback" type="checkbox"> Ask after each passage (uses API)</label></div>
<details><summary>Progress &amp; account</summary><label><input id="coachSave" type="checkbox"> Save attempts on this browser</label><p id="coachProgress" class="coachMuted"></p><div class="coachRow"><button id="coachForget">Clear coach history &amp; progress</button><button id="coachLogout">Lock coach</button></div></details>`;
document.body.append(coachPanel);
const C=id=>document.getElementById('coach'+id);
let coachAuth=false,coachCsrf='',coachGeneration=0,coachRevision=0,coachRequest=null,coachAnswer=null,coachReplyId='',coachAudio=null,coachAudioURL='',coachVoiceGeneration=0;
let coachRecorder=null,coachRecordStream=null,coachRecordTimer=0,coachRecordingGeneration=0,coachRecordingCancelled=false;
let coachRange=null,coachAttempt=null,coachLastAttempt=null,coachLastScore=null,coachProgress=[];
const COACH_PROGRESS_KEY='learnpiano-coach-progress-v1';
try{const old=JSON.parse(localStorage.getItem(COACH_PROGRESS_KEY)||'[]');if(Array.isArray(old)){coachProgress=old.slice(-25);C('Save').checked=!!localStorage.getItem(COACH_PROGRESS_KEY);}}catch(_){}
function coachStatus(text,bad=false){C('Status').textContent=text;C('Status').classList.toggle('coachError',bad);}
function coachUsage(u){if(u)C('Usage').textContent=`API calls: ${u.daily}/${u.daily_limit} today · ${u.monthly}/${u.monthly_limit} this month (UTC). Not a dollar cap.`;}
function coachAuthUI(){C('Ask').disabled=!coachAuth;C('Record').disabled=!coachAuth||!window.MediaRecorder;C('Feedback').disabled=!coachAuth;C('AutoFeedback').disabled=!coachAuth;}
async function coachAPI(action,data={},signal){
  const res=await fetch('coach.php?action='+encodeURIComponent(action),{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':coachCsrf},body:JSON.stringify(data),signal});
  const answer=await res.json();if(!res.ok||!answer.ok)throw Error(answer.error||'Coach request failed.');coachUsage(answer.usage);return answer;
}
async function coachCheck(){
  try{const res=await fetch('coach.php?action=status',{credentials:'same-origin',cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.error||'Coach unavailable.');
    coachAuth=!!data.authenticated;coachCsrf=data.csrf||'';C('Setup').hidden=!!data.configured;C('Login').hidden=!data.configured||coachAuth;coachUsage(data.usage);coachAuthUI();
    coachStatus(coachAuth?'Coach unlocked. Ask only when you choose.':data.configured?'Unlock the optional paid coach.':'Local passage practice is available; AI is off.');
  }catch(e){coachStatus(e.message,true);coachAuth=false;coachAuthUI();}
}
function coachOpen(){coachPanel.hidden=false;coachButton.setAttribute('aria-expanded','true');coachCheck();}
function coachClose(){coachPanel.hidden=true;coachButton.setAttribute('aria-expanded','false');coachStopRecording(true);coachStopVoice();coachCancelRequest();}
coachButton.onclick=()=>coachPanel.hidden?coachOpen():coachClose();C('Close').onclick=coachClose;
C('Login').onsubmit=async e=>{e.preventDefault();try{const r=await coachAPI('login',{password:C('Password').value});C('Password').value='';coachCsrf=r.csrf;coachAuth=true;C('Login').hidden=true;coachAuthUI();coachStatus('Coach unlocked.');}catch(e){C('Password').value='';coachStatus(e.message,true);}};
function coachStopVoice(){coachVoiceGeneration++;if(coachAudio){coachAudio.pause();coachAudio.src='';coachAudio=null;}if(coachAudioURL){URL.revokeObjectURL(coachAudioURL);coachAudioURL='';}}
function coachCancelRequest(){coachGeneration++;coachRequest?.abort();coachRequest=null;coachAuthUI();}
function coachQuiet(){pause();coachStopVoice();if(micOn)stopMic();}
/** Preserve source staff metadata lost by the legacy parser. Do not invent a bass part. */
const coachOldParse=parseXML;
parseXML=function(text,label){
  const s=coachOldParse(text,label),doc=new DOMParser().parseFromString(text,'application/xml');
  const parts=[...doc.documentElement.children].filter(e=>e.tagName==='part'),mapping=new Map();
  const read=(e,q)=>e.querySelector(q)?.textContent?.trim()||'';
  const pitch=e=>{const p=e.querySelector('pitch');return p?(Number(read(p,'octave'))+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[read(p,'step')])+Number(read(p,'alter')||0):null;};
  let meter=4;
  parts.forEach((part,pi)=>{let base=0,div=1;for(const m of [...part.children].filter(e=>e.tagName==='measure')){
    const a=m.querySelector('attributes');if(a){div=Number(read(a,'divisions'))||div;const b=Number(read(a,'time beats')),u=Number(read(a,'time beat-type'));if(b&&u)meter=b*4/u;}
    let cur=0,max=0,last=base;for(const e of m.children){const dur=Number(read(e,'duration'))/div||0;
      if(e.tagName==='backup'||e.tagName==='forward'){cur=Math.max(0,cur+(e.tagName==='backup'?-dur:dur));max=Math.max(max,cur);}
      if(e.tagName!=='note')continue;const at=e.querySelector('chord')?last:base+cur;if(!e.querySelector('chord'))last=at;
      const midi=pitch(e),staff=Number(read(e,'staff'))||1;
      let hand=staff===2?'left':staff===1?'right':null;
      if(parts.length===2&&!read(e,'staff'))hand=pi===0?'right':'left';
      if(parts.length>2)hand=null;
      if(midi!==null)mapping.set([pi,midi,at.toFixed(4)].join(':'),hand);
      if(!e.querySelector('chord'))cur+=dur;max=Math.max(max,cur,at-base+dur);
    }base+=Math.max(.25,Math.max(max,m.getAttribute('implicit')==='yes'?0:meter));
  }});
  s.notes.forEach(n=>n.coachHand=mapping.get([n.part,n.m,n.s.toFixed(4)].join(':'))||null);
  s.coachLabels=[...parts[0].children].filter(e=>e.tagName==='measure').map(e=>e.getAttribute('number')||'');
  return s;
};
function coachBars(){return(score.measureStarts||[]).slice(0,500).map((s,i,all)=>({index:i+1,label:score.coachLabels?.[i]||String(i+1),start:s,end:all[i+1]??score.total}));}
function coachHands(){return [...new Set(score.notes.map(n=>n.coachHand).filter(Boolean))];}
function coachSong(){return LP_SONGS.find(s=>s.id===lpSongSelect.dataset.loaded);}
function coachRefreshScore(){
  const bars=coachBars();for(const id of ['From','To']){C(id).replaceChildren();bars.forEach(b=>{const o=document.createElement('option');o.value=b.index;o.textContent='Bar '+b.label;C(id).append(o);});}
  C('From').value='1';C('To').value=String(Math.min(4,bars.length));
  const hands=coachHands();for(const o of C('Hand').options)o.disabled=o.value!=='both'&&!hands.includes(o.value);
  C('Hand').value='both';C('Source').textContent=(coachLastScore?.kind||'Imported / not editorially verified')+' · '+(hands.includes('left')&&hands.includes('right')?'Two notated hand assignments found.':'No complete two-hand mapping confirmed.');
  C('Progress').textContent=coachProgress.length+' saved attempts on this browser. No cloud progress archive.';
}
const coachOldApply=apply;
apply=function(s,label){coachCancelRequest();coachStopRecording(true);coachQuiet();coachRange=null;coachAttempt=null;coachLastAttempt=null;coachAnswer=null;coachReplyId='';C('Apply').hidden=true;C('Speak').disabled=true;
  coachOldApply(s,label);coachRevision++;coachLastScore=LP_SONGS.find(t=>lpSongLabel(t)===label)||(/moonlight/i.test(s.title)?LP_SONGS[0]:null);coachRefreshScore();};
function coachSelection(){
  const bars=coachBars(),from=+C('From').value,to=+C('To').value,hand=C('Hand').value;
  if(!from||!to||to<from||to-from>=8||!bars[to-1])throw Error('Choose 1–8 consecutive bars.');
  if(hand!=='both'&&!coachHands().includes(hand))throw Error('This score has no mapped '+hand+'-hand staff.');
  return{from,to,hand,start:bars[from-1].start,end:bars[to-1].end,labels:bars[from-1].label+'–'+bars[to-1].label};
}
function coachEligible(n,r=coachRange){return !r||(n.s>=r.start-.0001&&n.s<r.end-.0001&&(r.hand==='both'||n.coachHand===r.hand));}
function coachCounts(){let correct=0,missed=0;for(const[i,k]of feedbackOutcomes){if(!score.notes[i]||!coachEligible(score.notes[i]))continue;if(k==='correct')correct++;else if(k==='missed')missed++;}return{correct,missed,wrong:feedbackWrongCount};}
function coachSnapshot(){
  const r=coachSelection(),attempt=coachLastAttempt?.revision===coachRevision?coachLastAttempt:null;
  return{song_id:coachLastScore?.id||'imported',title:score.title,source_type:coachLastScore?.kind||'unverified import',
    measures:coachBars(),from:r.from,to:r.to,tempo:+tempo.value,mode:performanceMode,hands:coachHands(),
    notes:score.notes.filter(n=>coachEligible(n,{...r,hand:'both'})).slice(0,180).map(n=>({midi:n.m,beat:n.s,duration:n.d,hand:n.coachHand})),
    detector:attempt?{has_attempt:attempt.listening,...attempt.counts}:{has_attempt:false,correct:0,wrong:0,missed:0},goal:C('Focus').value};
}
function coachEvidence(a){C('Evidence').textContent=!a?.listening?'No microphone assessment recorded. Musical advice is a suggestion, not an observation.':`Unvalidated detector report: ${a.counts.correct} matched · ${a.counts.wrong} unmatched · ${a.counts.missed} not detected. These may be recognition errors, especially in chords. No verified grade, dynamics or pedal assessment.`;}
async function coachAsk(question){
  if(!coachAuth){coachOpen();return;}
  let context;try{context=coachSnapshot();}catch(e){coachStatus(e.message,true);return;}
  coachStopRecording(true);coachQuiet();coachCancelRequest();
  const gen=coachGeneration,revision=coachRevision,controller=new AbortController();coachRequest=controller;
  C('Ask').disabled=true;C('Apply').hidden=true;C('Speak').disabled=true;coachStatus('Coach is thinking… Piano grading is paused.');
  try{const data=await coachAPI('ask',{question,context},controller.signal);if(gen!==coachGeneration||revision!==coachRevision)return;
    coachAnswer={...data.answer,revision};coachReplyId=data.reply_id;C('Reply').textContent=coachAnswer.reply;C('Apply').hidden=coachAnswer.action.type==='none';C('Speak').disabled=false;
    coachEvidence(coachLastAttempt);coachStatus(coachAnswer.action_rejected?'An invalid action was blocked; no controls changed.':'Suggestion ready. Apply is optional.');
  }catch(e){if(e.name!=='AbortError')coachStatus(e.message,true);}finally{if(gen===coachGeneration){coachRequest=null;coachAuthUI();}}
}
C('Ask').onclick=()=>coachAsk(C('Question').value.trim()||'Help me practise the selected passage with the chosen lesson focus.');
C('Feedback').onclick=()=>coachAsk('Explain what can and cannot be concluded from my last detector summary, then suggest one next exercise. Do not invent a performance assessment.');
C('Cancel').onclick=()=>{coachCancelRequest();coachStopRecording(true);coachStopVoice();coachStatus('Cancelled. No suggested action was applied.');};
async function coachSpeak(){
  if(!coachAuth||!coachReplyId)return;
  coachStopRecording(true);coachQuiet();const gen=coachVoiceGeneration,id=coachReplyId,revision=coachRevision;coachStatus('Preparing AI-generated voice…');
  try{const response=await fetch('coach.php?action=speak',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':coachCsrf},body:JSON.stringify({reply_id:id})});
    if(!response.ok){const e=await response.json();throw Error(e.error||'Speech unavailable.');}
    const blob=await response.blob();if(gen!==coachVoiceGeneration||revision!==coachRevision)return;
    coachAudioURL=URL.createObjectURL(blob);coachAudio=new Audio(coachAudioURL);
    coachAudio.onended=()=>{coachStopVoice();coachStatus('Voice finished. Press Listen again before a measured attempt.');};
    await coachAudio.play();coachStatus('Speaking · AI-generated voice. Piano and grading paused.');
  }catch(e){coachStatus(e.message+' Text is still available.',true);}
}
C('Speak').onclick=coachSpeak;C('Mute').onclick=()=>{coachStopVoice();coachStatus('Voice stopped.');};
function coachStopRecording(cancel=false){
  if(cancel){coachRecordingGeneration++;coachRecordingCancelled=true;}
  clearTimeout(coachRecordTimer);if(coachRecorder&&coachRecorder.state!=='inactive')coachRecorder.stop();
  coachRecordStream?.getTracks().forEach(t=>t.stop());coachRecordStream=null;C('Record').textContent='Record question';
}
C('Record').onclick=async()=>{
  if(coachRecorder?.state==='recording'){coachStopRecording(false);return;}
  if(!coachAuth||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){coachStatus('Recording unavailable. Type your question instead.',true);return;}
  coachQuiet();coachStopRecording(true);const gen=++coachRecordingGeneration;coachRecordingCancelled=false;
  try{coachStatus('Waiting for microphone permission…');const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true}});
    if(gen!==coachRecordingGeneration){stream.getTracks().forEach(t=>t.stop());return;}coachRecordStream=stream;
    const mime=['audio/webm;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
    if(!mime)throw Error('This browser cannot produce a supported recording. Type instead.');
    const recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:48000});coachRecorder=recorder;const chunks=[];let bytes=0;
    recorder.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>950000)coachStopRecording(true);}};
    recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());if(gen!==coachRecordingGeneration||coachRecordingCancelled)return;
      const blob=new Blob(chunks,{type:mime});if(blob.size<64||blob.size>1000000){coachStatus('Recording empty or too large. Please try again.',true);return;}
      const data=new FormData();data.append('audio',blob,mime.includes('mp4')?'question.mp4':'question.webm');
      coachStatus('Transcribing your question…');
      try{const res=await fetch('coach.php?action=transcribe',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':coachCsrf},body:data});const r=await res.json();if(!res.ok||!r.ok)throw Error(r.error||'Transcription failed.');
        if(gen!==coachRecordingGeneration)return;C('Question').value=r.text;coachUsage(r.usage);coachStatus('Review the transcript, then press Ask.');
      }catch(e){coachStatus(e.message,true);}
    };
    recorder.start(250);coachRecordTimer=setTimeout(()=>coachStopRecording(false),30000);C('Record').textContent='Finish recording';coachStatus('Recording question · maximum 30 seconds.');
  }catch(e){coachStopRecording(true);coachStatus(e.message,true);}
};
const coachOldTone=tone;
tone=function(m,dur,v,delay=0){
  if(coachRange&&playing){
    if(!coachRange.demo)return; // Silent student attempts cannot credit our own demo.
    const at=expressiveSeconds(beat)+Math.max(0,delay),end=expressiveSeconds(coachRange.end);
    if(at>=end-.001)return;
    const candidates=score.notes.filter(n=>n.m===m&&Math.abs(expressiveSeconds(n.s)-at)<.20);
    if(coachRange.hand!=='both'&&!candidates.some(n=>coachEligible(n)))return;
    dur=Math.min(dur,Math.max(.01,end-at));
  }
  return coachOldTone(m,dur,v,delay);
};
const coachOldMisses=feedbackMarkMisses;
feedbackMarkMisses=function(final=false){
  if(!coachRange)return coachOldMisses(final);
  if(!micOn)return;const sec=expressiveSeconds(beat);let changed=false;
  score.notes.forEach((n,i)=>{if(!coachEligible(n)||feedbackOutcomes.has(i)||n.s<feedbackListenStartBeat-.02)return;
    if(final||expressiveSeconds(n.s)+FEEDBACK_MISS_SEC<sec){feedbackOutcomes.set(i,'missed');feedbackMissedPitches.add(n.m);changed=true;}});
  if(changed){feedbackUpdateSummary();feedbackPaint();}
};
const coachOldCorrect=feedbackMarkCorrectPitch;
feedbackMarkCorrectPitch=function(m,source){if(coachRange&&!score.notes.some(n=>n.m===m&&coachEligible(n)&&Math.abs(expressiveSeconds(n.s)-expressiveSeconds(beat))<=FEEDBACK_CORRECT_LATE_SEC))return false;return coachOldCorrect(m,source);};
function coachFinishAttempt(){
  if(!coachAttempt)return;
  coachLastAttempt={...coachAttempt,counts:coachCounts(),at:new Date().toISOString()};coachAttempt=null;coachEvidence(coachLastAttempt);
  if(C('Save').checked){coachProgress.push({title:score.title,range:coachLastAttempt.labels,tempo:coachLastAttempt.tempo,mode:coachLastAttempt.mode,listening:coachLastAttempt.listening,counts:coachLastAttempt.counts,at:coachLastAttempt.at});coachProgress=coachProgress.slice(-25);try{localStorage.setItem(COACH_PROGRESS_KEY,JSON.stringify(coachProgress));}catch(_){}C('Progress').textContent=coachProgress.length+' attempts saved on this browser.';}
}
const coachOldFrame=frame;
frame=function(){
  const was=playing;coachOldFrame();
  if(coachRange&&was&&beat>=coachRange.end-.025){
    pause();beat=coachRange.end;feedbackMarkMisses(true);coachFinishAttempt();updateScrub();draw();
    if(C('Repeat').checked){const r=coachRange;seek(r.start);coachRange=r;coachAttempt=r.demo?null:{revision:coachRevision,labels:r.labels,tempo:+tempo.value,mode:performanceMode,listening:micOn};togglePlay();}
    else{coachStatus('Passage finished. Detector counts are approximate.');if(C('AutoFeedback').checked&&coachAuth){coachPanel.hidden=false;coachAsk('Give one practice suggestion after this attempt. Treat all microphone counts as unvalidated.');}}
  }
};
async function coachStart(demo){
  try{const r=coachSelection();coachCancelRequest();coachStopRecording(true);coachStopVoice();pause();if(demo&&micOn)stopMic();
    coachRange={...r,demo};seek(r.start);coachAttempt=demo?null:{revision:coachRevision,labels:r.labels,tempo:+tempo.value,mode:performanceMode,listening:micOn};
    coachPanel.hidden=true;coachButton.setAttribute('aria-expanded','false');await togglePlay();
    coachStatus(demo?'Demonstrating selected notation.':'Practice started; demo audio muted. Turn Listen on for approximate microphone cues.');
  }catch(e){coachStatus(e.message,true);}
}
C('Demo').onclick=()=>coachStart(true);C('Practise').onclick=()=>coachStart(false);
C('End').onclick=()=>{pause();coachFinishAttempt();coachRange=null;coachStatus('Passage practice stopped. Full-song playback restored.');};
const coachOldStartMic=startMic;
startMic=async function(){coachStopVoice();coachStopRecording(true);return coachOldStartMic();};
const coachOldToggle=togglePlay;
togglePlay=async function(){
  coachStopVoice();coachStopRecording(true);
  // Play after a completed passage starts that passage again, rather than
  // immediately stopping at its end boundary. A manual pause resumes in place.
  if(!playing&&coachRange&&(beat>=coachRange.end-.025||beat<coachRange.start)){
    seek(coachRange.start);
    coachAttempt=coachRange.demo?null:{revision:coachRevision,labels:coachRange.labels,tempo:+tempo.value,mode:performanceMode,listening:micOn};
  }
  return coachOldToggle();
};playB.onclick=()=>{coachCancelRequest();return togglePlay();};
const coachOldRestart=restartB.onclick;
restartB.onclick=()=>{coachRange=null;coachAttempt=null;coachOldRestart();};
C('Apply').onclick=async()=>{
  const answer=coachAnswer;if(!answer||answer.revision!==coachRevision){coachStatus('That suggestion belongs to a different score. Ask again.',true);return;}
  try{const a=answer.action,bars=coachBars();coachQuiet();
    if(!['set_tempo','select_range','set_hand','set_mode','demonstrate'].includes(a.type))return;
    if(['select_range','demonstrate'].includes(a.type)){if(!Number.isInteger(a.from)||!Number.isInteger(a.to)||a.from<1||a.to<a.from||a.to>bars.length||a.to-a.from>=8)throw Error('Invalid passage blocked.');C('From').value=a.from;C('To').value=a.to;}
    if(['set_tempo','demonstrate'].includes(a.type)){if(!Number.isInteger(a.bpm)||a.bpm<35||a.bpm>180)throw Error('Invalid tempo blocked.');tempo.value=a.bpm;tempo.dispatchEvent(new Event('input'));}
    if(['set_hand','demonstrate'].includes(a.type)){if(a.hand!=='both'&&!coachHands().includes(a.hand))throw Error('That hand is not available in this score.');C('Hand').value=a.hand;}
    if(['set_mode','demonstrate'].includes(a.type)){if(!['practice','performance'].includes(a.mode))throw Error('Invalid mode blocked.');modeSelect.value=a.mode;modeSelect.dispatchEvent(new Event('change'));}
    if(a.type==='demonstrate')await coachStart(true);else coachStatus('Applied. Press Hear passage or Practise passage when ready.');C('Apply').hidden=true;
  }catch(e){coachStatus(e.message,true);}
};
C('Save').onchange=()=>{if(!C('Save').checked){try{localStorage.removeItem(COACH_PROGRESS_KEY);}catch(_){}coachProgress=[];C('Progress').textContent='Local attempt saving is off.';}};
C('Forget').onclick=async()=>{coachCancelRequest();coachStopVoice();coachStopRecording(true);coachLastAttempt=null;coachProgress=[];try{localStorage.removeItem(COACH_PROGRESS_KEY);}catch(_){}
  C('Reply').textContent='';C('Question').value='';coachAnswer=null;coachReplyId='';C('Apply').hidden=true;C('Speak').disabled=true;coachEvidence(null);C('Progress').textContent='No saved attempts.';
  try{if(coachAuth)await coachAPI('forget');coachStatus('Current server coach conversation and local progress cleared.');}catch(e){coachStatus('Local progress cleared; server conversation could not be cleared: '+e.message,true);}};
C('Logout').onclick=async()=>{coachCancelRequest();coachStopVoice();coachStopRecording(true);try{await coachAPI('logout');}catch(_){}coachAuth=false;C('AutoFeedback').checked=false;coachAuthUI();coachCheck();};
// Entering clean fullscreen hides the coach rather than obscuring the keys.
new MutationObserver(()=>{if(document.body.classList.contains('focus')&&!coachPanel.hidden)coachClose();}).observe(document.body,{attributes:true,attributeFilter:['class']});
window.addEventListener('pagehide',()=>{coachStopRecording(true);coachStopVoice();coachCancelRequest();});
coachAuthUI();coachRefreshScore();coachEvidence(null);
