const frenchKeyboard=(navigator.language||'en').toLowerCase().startsWith('fr');
const defaults={
  language:(navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en',
  muted:false,volume:.5,mouseSensitivity:1,renderScale:1,viewDistance:128,quality:'balanced',shadows:true,
  effects:true,
  bindings:{
    forward:frenchKeyboard?'KeyZ':'KeyW',backward:'KeyS',left:'KeyQ',right:'KeyD',
    sprint:'ShiftLeft',interact:'KeyF',market:'KeyC',build:'KeyB',talents:'KeyU',
    auto:'KeyA',drop:'KeyG',vehicle:'KeyR',jump:'Space'
  }
};
export const ACTIONS=Object.keys(defaults.bindings);
export function loadSettings(){
  let stored={};
  try{stored=JSON.parse(localStorage.getItem('irh-options')||'{}')}catch{}
  const clamp=(v,min,max,base)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):base;
  return {...defaults,...stored,
    volume:clamp(stored.volume,0,1,defaults.volume),
    mouseSensitivity:clamp(stored.mouseSensitivity,.2,3,defaults.mouseSensitivity),
    renderScale:clamp(stored.renderScale,.5,1.5,defaults.renderScale),
    viewDistance:clamp(stored.viewDistance,64,256,defaults.viewDistance),
    bindings:(()=>{
      const binds={...defaults.bindings,...(stored.bindings||{})};
      delete binds.inventory;
      // A must be reserved for auto mode, including older saved WASD layouts.
      if(binds.left===binds.auto)binds.left='KeyQ';
      if(binds.market===binds.auto)binds.market='KeyC';
      return binds;
    })(),
    language:stored.language==='fr'?'fr':stored.language==='en'?'en':defaults.language};
}
export function storeSettings(settings){
  try{localStorage.setItem('irh-options',JSON.stringify(settings))}catch{}
}
export function keyLabel(code){
  const variants={Space:'SPACE',ShiftLeft:'SHIFT',ShiftRight:'SHIFT',Escape:'ESC',
    ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};
  if(variants[code])return variants[code];
  return code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'NUM ');
}
export function isPressed(keys,settings,action){
  const code=settings.bindings[action];
  if(keys[code])return true;
  if(action==='forward')return !!(code==='KeyW'&&keys.KeyZ||code==='KeyZ'&&keys.KeyW||keys.ArrowUp);
  if(action==='left')return !!keys.ArrowLeft;
  if(action==='backward')return !!keys.ArrowDown;
  if(action==='right')return !!keys.ArrowRight;
  if(action==='sprint')return !!keys.ShiftRight;
  return false;
}
export function applyQuality(renderer,sun,quality,renderScale=1){
  const settings={
    low:{shadows:false,shadowSize:512},
    balanced:{shadows:true,shadowSize:1024},
    high:{shadows:true,shadowSize:2048}
  }[quality]||{pixel:1,shadows:true};
  const ratio=Math.max(.45,Math.min(window.devicePixelRatio||1,1.5)*Math.max(.5,Math.min(1.5,renderScale)));
  renderer.setPixelRatio(ratio);
  renderer.shadowMap.enabled=settings.shadows;
  if(sun){sun.castShadow=settings.shadows;sun.shadow.mapSize.set(settings.shadowSize,settings.shadowSize);
    sun.shadow.map?.dispose();sun.shadow.map=null}
  renderer.setSize(window.innerWidth,window.innerHeight);
  return ratio;
}
