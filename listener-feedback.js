/* LearnPiano listener + UI v2 */
const feedbackStyle=document.createElement('style');
feedbackStyle.textContent=`
:root{--lpbar:52px}
html,body{height:100%;overflow:hidden}
body{display:flex;flex-direction:column}
.topbar{min-height:var(--lpbar);padding:6px 8px;gap:6px;display:flex;align-items:center;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid #24384a}
.topbar::-webkit-scrollbar{display:none}
.topbar .brand{flex:0 0 auto;margin-right:3px}
.topbar button,.topbar .fileLabel,.topbar select{flex:0 0 auto;padding:7px 9px;white-space:nowrap}
.topbar .ctrl{flex:0 0 auto}.topbar .ctrl input[type=range]{width:74px}
#status{height:24px;min-height:24px;padding:3px 9px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#workspace{flex:1;min-height:0!important;height:auto!important}
#trainer{left:8px;right:8px;top:8px;width:auto;height:calc(100% - 16px);min-height:260px}
#help{display:none!important;right:10px;top:10px;width:min(360px,46vw);max-height:calc(100% - 20px);overflow:auto}
body.lp-settings-open #help{display:block!important}
#lpSettings{flex:0 0 auto;border:1px solid #31475b;background:#142434;color:#eaf5ff;border-radius:9px;padding:7px 9px;cursor:pointer}
#feedbackSummary{font-variant-numeric:tabular-nums;border-color:#426077;color:#d9efff}
#feedbackLegend{color:#b9cddd;font-size:12px}
body.listener-grading .key.active.white:not(.feedback-correct):not(.feedback-wrong):not(.feedback-missed){background:linear-gradient(#f5f5f5,#c4ced7)!important}
body.listener-grading .key.active.black:not(.feedback-correct):not(.feedback-wrong):not(.feedback-missed){background:linear-gradient(#2a3540,#0b1017)!important}
body.listener-grading .key.heard.white:not(.feedback-correct):not(.feedback-wrong):not(.feedback-missed){background:linear-gradient(#f5f5f5,#c4ced7)!important;box-shadow:none!important}
body.listener-grading .key.heard.black:not(.feedback-correct):not(.feedback-wrong):not(.feedback-missed){background:linear-gradient(#2a3540,#0b1017)!important;box-shadow:none!important}
#trainer .key.feedback-correct.white,#trainer .key.feedback-correct.black{background:linear-gradient(#aaffca,#13a449)!important;box-shadow:0 0 20px #4cfc82,inset 0 0 0 2px #e8fff2!important}
#trainer .key.feedback-wrong.white,#trainer .key.feedback-wrong.black{background:linear-gradient(#ffb1ac,#d52b40)!important;box-shadow:0 0 20px #fc415c,inset 0 0 0 2px #fff0ed!important}
#trainer .key.feedback-missed.white,#trainer .key.feedback-missed.black{background:linear-gradient(#a8dcff,#2276d4)!important;box-shadow:0 0 15px #409dff,inset 0 0 0 2px #d8eeff!important}
@media(max-width:900px){
  :root{--lpbar:46px}.topbar{padding:4px 5px;gap:4px}
  .topbar button,.topbar .fileLabel,.topbar select,#lpSettings{padding:6px 7px;font-size:12px}
  .topbar .brand{font-size:13px}.topbar .ctrl{font-size:11px}.topbar .ctrl input[type=range]{width:60px}
  #trainer{left:4px;right:4px;top:4px;height:calc(100% - 8px)}
}
@media(max-width:680px){
  .topbar #diag,.topbar #reset,.topbar #test,.topbar #heard,.topbar #match{display:none}
  #status{display:none}#trainer{top:2px;height:calc(100% - 4px)}#help{width:calc(100vw - 20px);max-height:70vh}
}`;
document.head.append(feedbackStyle);

const lpSettings=document.createElement('button');
lpSettings.id='lpSettings';lpSettings.textContent='⚙ Settings';
fullB.insertAdjacentElement('afterend',lpSettings);
lpSettings.onclick=()=>document.body.classList.toggle('lp-settings-open');
const helpEl=$('help');
for(const el of [diagB,$('reset')]){if(el){el.style.display='';helpEl.append(el)}}
const compactIntro=document.createElement('div');
compactIntro.style.cssText='font-size:12px;line-height:1.35;margin-bottom:8px;color:#c7d8e7';
compactIntro.innerHTML='<b>Lesson view:</b> keep this panel closed while playing. Open it only for calibration, microphone tuning and diagnostics.';
helpEl.prepend(compactIntro);

const feedbackSummary=document.createElement('span');
feedbackSummary.id='feedbackSummary';feedbackSummary.className='badge';feedbackSummary.textContent='✓0  ✕0  •0';
listenB.insertAdjacentElement('afterend',feedbackSummary);
const feedbackLegend=document.createElement('div');
feedbackLegend.id='feedbackLegend';feedbackLegend.style.cssText='margin-top:7px;padding-top:7px;border-top:1px solid #31475b';
feedbackLegend.textContent='Feedback colours: green = played correctly, red = wrong detected note, blue = expected note missed. Chords are checked against several expected frequencies at once; this is score-aware practice feedback, not full general-purpose polyphonic transcription.';
helpEl.append(feedbackLegend);

const feedbackOutcomes=new Map(),feedbackMissedPitches=new Set(),feedbackGoodUntil=new Map(),feedbackWrongUntil=new Map();
let feedbackWrongCount=0,feedbackListenStartBeat=0,feedbackEpisodePitch=null,feedbackLastObservedAt=-Infinity,feedbackLastDecision=null;
const FEEDBACK_EARLY_SEC=.38,FEEDBACK_MISS_SEC=.95,FEEDBACK_CORRECT_LATE_SEC=1.15;
function feedbackCounts(){let correct=0,missed=0;for(const v of feedbackOutcomes.values()){if(v==='correct')correct++;else if(v==='missed')missed++;}return{correct,missed,wrong:feedbackWrongCount}}
function feedbackUpdateSummary(){const c=feedbackCounts();feedbackSummary.textContent='✓'+c.correct+'  ✕'+c.wrong+'  •'+c.missed;feedbackSummary.title='Correct '+c.correct+' · wrong '+c.wrong+' · missed '+c.missed}
function feedbackReset(){feedbackOutcomes.clear();feedbackMissedPitches.clear();feedbackGoodUntil.clear();feedbackWrongUntil.clear();feedbackWrongCount=0;feedbackListenStartBeat=beat;feedbackEpisodePitch=null;feedbackLastObservedAt=-Infinity;feedbackLastDecision=null;polyStable.clear();feedbackUpdateSummary();feedbackPaint()}
function feedbackPaint(){const now=performance.now();for(const[m,k]of keyEls){const held=micOn&&lastMidi===m&&now-lastAt<500&&feedbackLastDecision?.m===m;const green=(feedbackGoodUntil.get(m)||0)>now||(held&&feedbackLastDecision.kind==='correct');const red=!green&&((feedbackWrongUntil.get(m)||0)>now||(held&&feedbackLastDecision.kind==='wrong'));k.classList.toggle('feedback-correct',green);k.classList.toggle('feedback-wrong',red);k.classList.toggle('feedback-missed',!green&&!red&&feedbackMissedPitches.has(m));}}
function feedbackMarkMisses(final=false){if(!micOn||!score.notes.length)return;const nowSeconds=expressiveSeconds(beat);let changed=false;for(let i=0;i<score.notes.length;i++){const n=score.notes[i];if(feedbackOutcomes.has(i)||n.s<feedbackListenStartBeat-.02)continue;if(final||expressiveSeconds(n.s)+FEEDBACK_MISS_SEC<nowSeconds){feedbackOutcomes.set(i,'missed');feedbackMissedPitches.add(n.m);changed=true;}}if(changed){feedbackUpdateSummary();feedbackPaint();}}
function feedbackMarkCorrectPitch(m,source='mono'){
  if(!micOn||!score.notes.length)return false;
  const now=performance.now(),currentSeconds=expressiveSeconds(beat);let best=-1,dist=Infinity;
  for(let i=0;i<score.notes.length;i++){const n=score.notes[i];if(n.m!==m||n.s<feedbackListenStartBeat-.02||feedbackOutcomes.get(i)==='correct')continue;const dt=currentSeconds-expressiveSeconds(n.s);if(dt< -FEEDBACK_EARLY_SEC||dt>FEEDBACK_CORRECT_LATE_SEC)continue;if(Math.abs(dt)<dist){best=i;dist=Math.abs(dt)}}
  if(best<0)return false;
  const ref=score.notes[best];
  for(let i=0;i<score.notes.length;i++){const n=score.notes[i];if(n.m===m&&Math.abs(expressiveSeconds(n.s)-expressiveSeconds(ref.s))<.08&&feedbackOutcomes.get(i)!=='correct')feedbackOutcomes.set(i,'correct')}
  feedbackMissedPitches.delete(m);feedbackGoodUntil.set(m,now+1400);feedbackWrongUntil.delete(m);feedbackLastDecision={kind:'correct',m,until:now+1400};d('info','listener_correct',{note:name(m),beat,referenceBeat:ref.s,source});feedbackUpdateSummary();feedbackPaint();return true;
}
function feedbackJudgeWrong(m){if(feedbackMarkCorrectPitch(m,'mono')){matchUpdate();return}const now=performance.now();feedbackWrongCount++;feedbackWrongUntil.set(m,now+1400);feedbackGoodUntil.delete(m);feedbackLastDecision={kind:'wrong',m,until:now+1400};d('info','listener_wrong',{note:name(m),beat});feedbackUpdateSummary();feedbackPaint();matchUpdate()}
const feedbackPreviousMatchUpdate=matchUpdate;
matchUpdate=function(){if(!micOn){feedbackPreviousMatchUpdate();return}matchB.classList.remove('good','bad');const e=feedbackLastDecision;if(e&&e.until>performance.now()){matchB.textContent=(e.kind==='correct'?'Correct ':'Wrong ')+name(e.m);matchB.classList.add(e.kind==='correct'?'good':'bad')}else matchB.textContent=playing?'Listening…':'Listen ready'};

let polyFreq=null;const polyStable=new Map();
function expectedPitchesNearNow(){const t=expressiveSeconds(beat),out=new Set();for(const n of score.notes){if(n.s<feedbackListenStartBeat-.02)continue;const dt=t-expressiveSeconds(n.s);if(dt>=-FEEDBACK_EARLY_SEC&&dt<=FEEDBACK_CORRECT_LATE_SEC)out.add(n.m)}return [...out]}
function binDb(arr,bin,r=1){let best=-Infinity;for(let i=Math.max(0,bin-r);i<=Math.min(arr.length-1,bin+r);i++)best=Math.max(best,arr[i]);return best}
function localFloor(arr,bin){let s=0,n=0;for(let d=-12;d<=12;d++){if(Math.abs(d)<=2)continue;const i=bin+d;if(i>=0&&i<arr.length&&Number.isFinite(arr[i])){s+=arr[i];n++}}return n?s/n:-100}
function polyScore(m){if(!polyFreq||!ana||!AC)return -99;const f=m2f(m,+a4.value),hzPerBin=AC.sampleRate/ana.fftSize;let total=0,w=0;for(let h=1;h<=4;h++){const fh=f*h;if(fh>AC.sampleRate*.48)break;const bin=Math.round(fh/hzPerBin),peak=binDb(polyFreq,bin,1),floor=localFloor(polyFreq,bin),weight=1/h;total+=(peak-floor)*weight;w+=weight}return w?total/w:-99}
function polyDetectExpected(){if(!micOn||!playing||!ana)return;if(!polyFreq||polyFreq.length!==ana.frequencyBinCount)polyFreq=new Float32Array(ana.frequencyBinCount);ana.getFloatFrequencyData(polyFreq);const candidates=expectedPitchesNearNow(),seen=new Set();for(const m of candidates){const sc=polyScore(m),need=m<48?9:m<72?8:7,prev=polyStable.get(m)||0,next=sc>need?Math.min(4,prev+1):Math.max(0,prev-1);polyStable.set(m,next);seen.add(m);if(next>=2)feedbackMarkCorrectPitch(m,'poly')}for(const m of [...polyStable.keys()])if(!seen.has(m))polyStable.delete(m)}

micLoop=function(){if(!micOn||!ana)return;ana.getFloatTimeDomainData(buf);let rms=0;for(let i=0,j=0;i<buf.length;i+=4,j++){const v=(buf[i]+buf[i+1]+buf[i+2]+buf[i+3])*.25;down[j]=v;rms+=v*v}rms=Math.sqrt(rms/down.length);if(rms>=+sens.value){polyDetectExpected();const r=yin(down,AC.sampleRate/4);if(r&&r.c>=+conf.value)accept(r.f,r.c);else decay()}else decay();micTimer=setTimeout(micLoop,90)};

const feedbackPreviousAccept=accept;
accept=function(f,c){feedbackPreviousAccept(f,c);if(!micOn||lastMidi===null)return;const now=performance.now(),m=lastMidi,same=m===feedbackEpisodePitch&&now-feedbackLastObservedAt<480;feedbackEpisodePitch=m;feedbackLastObservedAt=now;if(!same)feedbackJudgeWrong(m)};
const feedbackPreviousClearHeard=clearHeard;clearHeard=function(){feedbackPreviousClearHeard();feedbackEpisodePitch=null};
const feedbackPreviousDraw=draw;draw=function(){feedbackPreviousDraw();if(micOn&&playing)feedbackMarkMisses();feedbackPaint()};
const feedbackPreviousBuildKeys=buildKeys;buildKeys=function(){feedbackPreviousBuildKeys();feedbackPaint()};
const feedbackPreviousApply=apply;apply=function(s,label){feedbackReset();feedbackPreviousApply(s,label);feedbackReset()};
const feedbackPreviousStartMic=startMic;startMic=async function(){await feedbackPreviousStartMic();if(micOn){feedbackReset();feedbackListenStartBeat=beat;document.body.classList.add('listener-grading');setStatus('Listening: green correct · red wrong · blue missed. Chords use score-aware multi-note detection.');matchUpdate()}};
const feedbackPreviousStopMic=stopMic;stopMic=function(){feedbackPreviousStopMic();document.body.classList.remove('listener-grading');feedbackEpisodePitch=null;polyStable.clear();feedbackUpdateSummary();feedbackPaint()};
const feedbackPreviousSeek=seek;seek=function(b){feedbackPreviousSeek(b);feedbackReset()};
const feedbackPreviousFrame=frame;frame=function(){const before=playing;feedbackPreviousFrame();if(before&&!playing&&beat>=score.total-.001&&micOn){feedbackMarkMisses(true);feedbackPaint()}};
const feedbackPreviousRestart=restartB.onclick;restartB.onclick=function(){feedbackPreviousRestart();feedbackReset()};
listenB.onclick=function(){micOn?stopMic():startMic()};
feedbackUpdateSummary();
