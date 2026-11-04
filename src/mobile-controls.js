// Pointer-first virtual controls. Events are routed through the same action
// bindings as hardware keyboards so remapping, AZERTY and game logic stay in sync.
export function createMobileControls({root,canvas,onAction,onLook,onZoom,isActive,isLookActive=isActive}){
  const touchCapable=matchMedia('(pointer: coarse)').matches||
    (navigator.maxTouchPoints>0&&innerWidth<1100);
  if(!touchCapable)return {enabled:false,dispose(){}};
  root.classList.remove('hidden');
  document.documentElement.classList.add('touch-enabled');
  const pad=root.querySelector('#touchPad'),knob=root.querySelector('#touchKnob');
  let padPointer=null,activeDirections=new Set();
  const dispatchDirections=next=>{
    for(const action of activeDirections)if(!next.has(action))onAction(action,false);
    for(const action of next)if(!activeDirections.has(action))onAction(action,true);
    activeDirections=next;
  };
  function updatePad(e){
    const rect=pad.getBoundingClientRect();
    const dx=e.clientX-(rect.left+rect.width/2);
    const dy=e.clientY-(rect.top+rect.height/2);
    const extent=Math.max(25,rect.width*.35);
    const length=Math.hypot(dx,dy),factor=Math.min(1,extent/Math.max(1,length));
    knob.style.transform='translate('+Math.round(dx*factor)+'px,'+Math.round(dy*factor)+'px)';
    const normalizedX=dx/extent,normalizedY=dy/extent;
    const next=new Set();
    if(normalizedY<-.28)next.add('forward');
    if(normalizedY>.28)next.add('backward');
    if(normalizedX<-.28)next.add('left');
    if(normalizedX>.28)next.add('right');
    dispatchDirections(next);
  }
  function releasePad(){
    if(padPointer===null)return;
    padPointer=null;knob.style.transform='translate(0,0)';
    dispatchDirections(new Set());
  }
  pad.addEventListener('pointerdown',e=>{
    if(padPointer!==null||!isActive())return;
    e.preventDefault();padPointer=e.pointerId;
    pad.setPointerCapture(e.pointerId);updatePad(e);
  });
  pad.addEventListener('pointermove',e=>{if(e.pointerId===padPointer){e.preventDefault();updatePad(e)}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])
    pad.addEventListener(type,e=>{if(e.pointerId===padPointer)releasePad()});
  const pressedButtons=new Map();
  for(const button of root.querySelectorAll('[data-touch-action]')){
    button.addEventListener('pointerdown',e=>{
      if(!isActive()||pressedButtons.has(e.pointerId))return;
      e.preventDefault();e.stopPropagation();
      button.setPointerCapture(e.pointerId);
      const action=button.dataset.touchAction;
      pressedButtons.set(e.pointerId,action);
      button.classList.add('pressed');
      onAction(action,true);
      if(button.dataset.touchHold!=='true')onAction(action,false);
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])
      button.addEventListener(type,e=>{
        if(pressedButtons.get(e.pointerId)!==button.dataset.touchAction)return;
        const action=pressedButtons.get(e.pointerId);
        pressedButtons.delete(e.pointerId);button.classList.remove('pressed');
        if(button.dataset.touchHold==='true')onAction(action,false);
      });
  }
  const lookPointers=new Map();
  let pinchDistance=null;
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'||!isLookActive())return;
    e.preventDefault();
    lookPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    canvas.setPointerCapture(e.pointerId);
    if(lookPointers.size!==2)pinchDistance=null;
  });
  canvas.addEventListener('pointermove',e=>{
    const previous=lookPointers.get(e.pointerId);
    if(!previous||!isLookActive())return;
    e.preventDefault();
    const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
    previous.x=e.clientX;previous.y=e.clientY;
    if(lookPointers.size===1)onLook(dx,dy);
    else if(lookPointers.size===2){
      const [a,b]=[...lookPointers.values()];
      const nextDistance=Math.hypot(a.x-b.x,a.y-b.y);
      if(pinchDistance!==null)onZoom((pinchDistance-nextDistance)*.018);
      pinchDistance=nextDistance;
    }
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])
    canvas.addEventListener(type,e=>{lookPointers.delete(e.pointerId);pinchDistance=null});
  const preventMenu=e=>{if(e.pointerType!=='mouse')e.preventDefault()};
  canvas.addEventListener('contextmenu',preventMenu);
  const clear=()=>{releasePad();for(const action of pressedButtons.values())onAction(action,false);
    pressedButtons.clear();lookPointers.clear();pinchDistance=null};
  addEventListener('blur',clear);
  addEventListener('orientationchange',clear);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
  return {enabled:true,clear,dispose(){clear();root.classList.add('hidden')}};
}
