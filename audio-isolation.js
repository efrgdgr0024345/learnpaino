/* LearnPiano audio isolation + fullscreen calibration v1 */
const isolationStyle=document.createElement('style');
isolationStyle.textContent=`
body.focus #trainer{overflow:visible!important}
body.focus #dragbar{display:flex!important;top:0!important;height:30px!important;opacity:.72;background:#071018cc!important;cursor:move!important}
body.focus #fallWrap{top:30px!important}
body.focus .rz{display:block!important;opacity:.78}
body.focus #scrubWrap{display:none!important}
body.focus #hud{display:flex!important;top:36px!important}
body.focus #focusClose{display:flex!important}
#echoState{font-size:11px;color:#9fc7d9}
`;
document.head.append(isolationStyle);

const echoState=document.createElement('span');
echoState.id='echoState';echoState.className='badge';echoState.textContent='AEC auto';
feedbackSummary.insertAdjacentElement('afterend',echoState);

startMic=async function(){
  if(!navigator.mediaDevices?.getUserMedia){setStatus('Microphone requires HTTPS and a modern browser.',true);return}
  try{
    audio();
    micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false,channelCount:1}});
    micSrc=AC.createMediaStreamSource(micStream);
    ana=AC.createAnalyser();ana.fftSize=16384;ana.smoothingTimeConstant=0;micSrc.connect(ana);
    buf=new Float32Array(ana.fftSize);down=new Float32Array(ana.fftSize/4);
    micOn=true;listenB.classList.add('listening');listenB.textContent='■ Stop listen';micB.textContent='Mic listening';micB.classList.add('live');
    const settings=micStream.getAudioTracks()[0]?.getSettings?.()||{};
    echoState.textContent=settings.echoCancellation===false?'AEC unavailable':'AEC on';
    echoState.title='Browser acoustic echo cancellation: '+String(settings.echoCancellation);
    d('info','mic_started_aec',{rate:AC.sampleRate,echoCancellation:settings.echoCancellation});
    feedbackReset();feedbackListenStartBeat=beat;document.body.classList.add('listener-grading');
    setStatus('Listening with speaker echo cancellation. Green correct · red wrong · blue missed.');matchUpdate();micLoop();
  }catch(e){d('error','mic_failed_aec',{error:String(e)});echoState.textContent='AEC error';setStatus('Microphone failed. Check permission/HTTPS, then copy diagnostics.',true)}
};

function focusApplyBounds(){
  if(!document.body.classList.contains('focus'))return;
  const wr=workspace.getBoundingClientRect(),tr=trainer.getBoundingClientRect();
  let left=parseFloat(trainer.style.left)||0,width=tr.width;
  width=Math.max(320,Math.min(width,wr.width));left=Math.max(0,Math.min(left,wr.width-width));
  trainer.style.left=left+'px';trainer.style.width=width+'px';trainer.style.top='0px';trainer.style.height='100%';
  document.body.style.setProperty('--calLeft',left+'px');document.body.style.setProperty('--calWidth',width+'px');
}
window.addEventListener('resize',()=>{if(document.body.classList.contains('focus')){focusApplyBounds();resize()}});

const fullKbResize=document.createElement('div');
fullKbResize.id='fullKbResize';
fullKbResize.title='Drag to change keyboard height';
fullKbResize.style.cssText='display:none;position:absolute;left:0;right:0;height:14px;z-index:85;cursor:ns-resize;touch-action:none;background:linear-gradient(transparent,#29d6ff66,transparent)';
trainer.append(fullKbResize);
const isolationExtraStyle=document.createElement('style');
isolationExtraStyle.textContent=`body.focus #fullKbResize{display:block;bottom:calc(var(--kbH) - 7px)} body.focus .rz.e,body.focus .rz.w{display:block!important;width:16px!important;z-index:90} body.focus .rz.n,body.focus .rz.s,body.focus .rz.ne,body.focus .rz.nw,body.focus .rz.se,body.focus .rz.sw{display:none!important}`;
document.head.append(isolationExtraStyle);

let focusSideState=null;
for(const z of trainer.querySelectorAll('.rz.e,.rz.w')){
  z.addEventListener('pointerdown',e=>{
    if(!document.body.classList.contains('focus'))return;
    e.preventDefault();e.stopPropagation();
    const tr=trainer.getBoundingClientRect(),wr=workspace.getBoundingClientRect();
    focusSideState={id:e.pointerId,d:z.dataset.d,sx:e.clientX,left:tr.left-wr.left,width:tr.width};
    z.setPointerCapture(e.pointerId);
  });
  z.addEventListener('pointermove',e=>{
    if(!focusSideState||focusSideState.id!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    const wr=workspace.getBoundingClientRect(),dx=e.clientX-focusSideState.sx,minW=Math.min(320,wr.width);
    let left=focusSideState.left,width=focusSideState.width;
    if(focusSideState.d==='e')width=Math.max(minW,Math.min(wr.width-left,focusSideState.width+dx));
    else{const q=Math.max(-focusSideState.left,Math.min(focusSideState.width-minW,dx));left=focusSideState.left+q;width=focusSideState.width-q;}
    trainer.style.left=left+'px';trainer.style.width=width+'px';document.body.style.setProperty('--calLeft',left+'px');document.body.style.setProperty('--calWidth',width+'px');resize();
  });
  z.addEventListener('pointerup',()=>focusSideState=null);
  z.addEventListener('pointercancel',()=>focusSideState=null);
}

let focusDragState=null;
drag.addEventListener('pointerdown',e=>{
  if(!document.body.classList.contains('focus'))return;
  e.preventDefault();e.stopPropagation();const tr=trainer.getBoundingClientRect(),wr=workspace.getBoundingClientRect();
  focusDragState={id:e.pointerId,dx:e.clientX-tr.left,width:tr.width,wrLeft:wr.left};drag.setPointerCapture(e.pointerId);
});
drag.addEventListener('pointermove',e=>{
  if(!focusDragState||focusDragState.id!==e.pointerId)return;
  e.preventDefault();e.stopPropagation();const wr=workspace.getBoundingClientRect();
  const left=Math.max(0,Math.min(e.clientX-wr.left-focusDragState.dx,wr.width-focusDragState.width));
  trainer.style.left=left+'px';document.body.style.setProperty('--calLeft',left+'px');
});
drag.addEventListener('pointerup',()=>focusDragState=null);drag.addEventListener('pointercancel',()=>focusDragState=null);

let kbResizeState=null;
fullKbResize.addEventListener('pointerdown',e=>{
  if(!document.body.classList.contains('focus'))return;
  e.preventDefault();kbResizeState={id:e.pointerId,sy:e.clientY,kb:parseFloat(getComputedStyle(trainer).getPropertyValue('--kbH'))||132};fullKbResize.setPointerCapture(e.pointerId);
});
fullKbResize.addEventListener('pointermove',e=>{
  if(!kbResizeState||kbResizeState.id!==e.pointerId)return;
  const tr=trainer.getBoundingClientRect();const dy=e.clientY-kbResizeState.sy;
  const h=Math.max(72,Math.min(tr.height*.48,kbResizeState.kb-dy));
  trainer.style.setProperty('--kbH',h+'px');document.body.style.setProperty('--calKbH',h+'px');resize();
});
fullKbResize.addEventListener('pointerup',()=>kbResizeState=null);fullKbResize.addEventListener('pointercancel',()=>kbResizeState=null);
