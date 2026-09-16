/* LearnPiano microphone feedback v1. The existing monophonic pitch detector
 * supplies stable notes; this layer judges note attacks against the active
 * score and displays per-key colour, rather than treating mere playback as a
 * correct performance. Inject AFTER expression-engine inside its closure.
 */
const feedbackStyle = document.createElement('style');
feedbackStyle.textContent = `
  /* During grading, expected notes alone must never be painted green. */
  body.listener-grading .key.active.white:not(.feedback-correct):not(.feedback-wrong):not(.feedback-missed) {background:linear-gradient(#f5f5f5,#c4ced7)!important;}
  body.listener-grading .key.active.black:not(.feedback-correct):not(.feedback-wrong):not(.feedback-missed) {background:linear-gradient(#2a3540,#0b1017)!important;}
  body.listener-grading .key.heard:not(.feedback-correct):not(.feedback-wrong):not(.feedback-missed) {box-shadow:none!important;}
  #trainer .key.feedback-correct.white,#trainer .key.feedback-correct.black {background:linear-gradient(#aaffca,#13a449)!important;box-shadow:0 0 20px #4cfc82,inset 0 0 0 2px #e8fff2!important;}
  #trainer .key.feedback-wrong.white,#trainer .key.feedback-wrong.black {background:linear-gradient(#ffb1ac,#d52b40)!important;box-shadow:0 0 20px #fc415c,inset 0 0 0 2px #fff0ed!important;}
  #trainer .key.feedback-missed.white,#trainer .key.feedback-missed.black {background:linear-gradient(#a8dcff,#2276d4)!important;box-shadow:0 0 15px #409dff,inset 0 0 0 2px #d8eeff!important;}
  #feedbackSummary {font-variant-numeric:tabular-nums;border-color:#426077;color:#d9efff;}
  #feedbackLegend {color:#b9cddd;font-size:12px;}
`;
document.head.append(feedbackStyle);
const feedbackSummary = document.createElement('span');
feedbackSummary.id = 'feedbackSummary';feedbackSummary.className = 'badge';
feedbackSummary.textContent = 'Listen: correct 0 · wrong 0 · missed 0';
listenB.insertAdjacentElement('afterend', feedbackSummary);
const feedbackLegend = document.createElement('div');
feedbackLegend.id = 'feedbackLegend';
feedbackLegend.style.cssText = 'margin-top:7px;padding-top:7px;border-top:1px solid #31475b';
feedbackLegend.textContent = 'Listening feedback: green = played correct, red = wrong detected key, blue = expected key missed. Misses are only judged while Listen AND Play are on; restart clears results. This microphone detects only one pitch at a time and cannot reliably grade chords or rapid repeated notes. Use headphones or mute the demo sound to prevent speaker feedback.';
$('help').append(feedbackLegend);

const feedbackOutcomes = new Map(); // score.notes index -> 'correct' | 'missed'
const feedbackMissedPitches = new Set();
const feedbackGoodUntil = new Map();
const feedbackWrongUntil = new Map();
let feedbackWrongCount = 0;
let feedbackListenStartBeat = 0;
let feedbackEpisodePitch = null;
let feedbackLastObservedAt = -Infinity;
let feedbackLastDecision = null;
const FEEDBACK_EARLY_SEC = .35;
// Includes the detector's 3-frame stability filter + microphone processing.
const FEEDBACK_MISS_SEC = .85;
const FEEDBACK_CORRECT_LATE_SEC = 1.10;

function feedbackCounts(){
  let correct=0,missed=0;
  for(const outcome of feedbackOutcomes.values()){
    if(outcome==='correct')correct++;
    else if(outcome==='missed')missed++;
  }
  return {correct,missed,wrong:feedbackWrongCount};
}
function feedbackUpdateSummary(){
  const c=feedbackCounts();
  feedbackSummary.textContent = 'Listen: correct '+c.correct+' · wrong '+c.wrong+' · missed '+c.missed;
}
function feedbackReset(){
  feedbackOutcomes.clear();feedbackMissedPitches.clear();
  feedbackGoodUntil.clear();feedbackWrongUntil.clear();
  feedbackWrongCount=0;feedbackListenStartBeat=beat;
  feedbackEpisodePitch=null;feedbackLastObservedAt=-Infinity;
  feedbackLastDecision=null;feedbackUpdateSummary();feedbackPaint();
}
function feedbackPaint(){
  const now=performance.now();
  for(const [m,k] of keyEls){
    const green=(feedbackGoodUntil.get(m)||0)>now;
    const red=!green&&(feedbackWrongUntil.get(m)||0)>now;
    k.classList.toggle('feedback-correct',green);
    k.classList.toggle('feedback-wrong',red);
    k.classList.toggle('feedback-missed',!green&&!red&&feedbackMissedPitches.has(m));
  }
}
function feedbackMarkMisses(final=false){
  if(!micOn||!score.notes.length)return;
  const nowSeconds=expressiveSeconds(beat);
  let changed=false;
  for(let i=0;i<score.notes.length;i++){
    const n=score.notes[i];
    if(feedbackOutcomes.has(i)||n.s<feedbackListenStartBeat-.02)continue;
    if(final||expressiveSeconds(n.s)+FEEDBACK_MISS_SEC<nowSeconds){
      feedbackOutcomes.set(i,'missed');feedbackMissedPitches.add(n.m);changed=true;
    }
  }
  if(changed){feedbackUpdateSummary();feedbackPaint();}
}
function feedbackJudge(m){
  if(!micOn||!score.notes.length)return;
  const now=performance.now(),currentSeconds=expressiveSeconds(beat);
  let bestIndex=-1,bestDistance=Infinity;
  for(let i=0;i<score.notes.length;i++){
    const n=score.notes[i];
    if(n.m!==m||n.s<feedbackListenStartBeat-.02||feedbackOutcomes.get(i)==='correct')continue;
    const dt=currentSeconds-expressiveSeconds(n.s);
    if(dt< -FEEDBACK_EARLY_SEC||dt>FEEDBACK_CORRECT_LATE_SEC)continue;
    const distance=Math.abs(dt);
    if(distance<bestDistance){bestIndex=i;bestDistance=distance;}
  }
  if(bestIndex>=0){
    const reference=score.notes[bestIndex];
    // If the score duplicates the exact same pitch/onset across voices, a
    // single real key strike represents that event in all duplicated voices.
    for(let i=0;i<score.notes.length;i++){
      const n=score.notes[i];
      if(n.m===m&&Math.abs(expressiveSeconds(n.s)-expressiveSeconds(reference.s))<.07&&feedbackOutcomes.get(i)!=='correct')feedbackOutcomes.set(i,'correct');
    }
    feedbackMissedPitches.delete(m);
    feedbackGoodUntil.set(m,now+1400);
    feedbackWrongUntil.delete(m);
    feedbackLastDecision={kind:'correct',m,until:now+1400};
    d('info','listener_correct',{note:name(m),beat:beat,referenceBeat:reference.s});
  }else{
    feedbackWrongCount++;
    feedbackWrongUntil.set(m,now+1400);
    feedbackGoodUntil.delete(m);
    feedbackLastDecision={kind:'wrong',m,until:now+1400};
    d('info','listener_wrong',{note:name(m),beat:beat});
  }
  feedbackUpdateSummary();feedbackPaint();matchUpdate();
}
// Do NOT reuse the earlier match logic: it considers a score note 'correct'
// merely because the lesson itself is currently playing that pitch.
const feedbackPreviousMatchUpdate = matchUpdate;
matchUpdate=function(){
  if(!micOn){feedbackPreviousMatchUpdate();return;}
  matchB.classList.remove('good','bad');
  const event=feedbackLastDecision;
  if(event&&event.until>performance.now()){
    if(event.kind==='correct'){
      matchB.textContent='Correct '+name(event.m);matchB.classList.add('good');
    }else{
      matchB.textContent='Wrong '+name(event.m);matchB.classList.add('bad');
    }
  }else matchB.textContent=playing?'Listening for notes…':'Listening · press Play to track misses';
};
const feedbackPreviousAccept=accept;
accept=function(f,c){
  // Preserve existing pitch label, confidence smoothing and live camera-free
  // microphone workflow, then judge only distinct stable pitch episodes.
  feedbackPreviousAccept(f,c);
  if(!micOn||lastMidi===null)return;
  const now=performance.now(),m=lastMidi;
  const sameEpisode=m===feedbackEpisodePitch&&now-feedbackLastObservedAt<480;
  feedbackEpisodePitch=m;feedbackLastObservedAt=now;
  if(!sameEpisode)feedbackJudge(m);
};
const feedbackPreviousClearHeard=clearHeard;
clearHeard=function(){feedbackPreviousClearHeard();feedbackEpisodePitch=null;};
const feedbackPreviousDraw=draw;
draw=function(){
  feedbackPreviousDraw();
  if(micOn&&playing)feedbackMarkMisses();
  feedbackPaint();
};
const feedbackPreviousBuildKeys=buildKeys;
buildKeys=function(){feedbackPreviousBuildKeys();feedbackPaint();};
const feedbackPreviousApply=apply;
apply=function(s,label){feedbackReset();feedbackPreviousApply(s,label);feedbackReset();};
const feedbackPreviousStartMic=startMic;
startMic=async function(){
  await feedbackPreviousStartMic();
  if(micOn){
    feedbackReset();feedbackListenStartBeat=beat;
    document.body.classList.add('listener-grading');
    setStatus('Listening for actual notes. Green = correct, red = wrong, blue = missed. Use headphones or mute demo audio.');
    matchUpdate();
  }
};
const feedbackPreviousStopMic=stopMic;
stopMic=function(){
  feedbackPreviousStopMic();document.body.classList.remove('listener-grading');
  feedbackEpisodePitch=null;
  feedbackUpdateSummary();feedbackPaint();
};
const feedbackPreviousSeek=seek;
seek=function(b){feedbackPreviousSeek(b);feedbackReset();};
const feedbackPreviousFrame=frame;
frame=function(){
  const before=playing;
  feedbackPreviousFrame();
  // At natural completion, give every unplayed note a result. Do not do this
  // when the user manually pauses, seeks or turns off the mic.
  if(before&&!playing&&beat>=score.total-.001&&micOn){
    feedbackMarkMisses(true);feedbackPaint();
  }
};
const feedbackPreviousRestart=restartB.onclick;
restartB.onclick=function(){feedbackPreviousRestart();feedbackReset();};
listenB.onclick=function(){micOn?stopMic():startMic();};
feedbackUpdateSummary();
