const frenchKeyboard=(navigator.language||'en').toLowerCase().startsWith('fr');
const defaults={
  language:(navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en',
  muted:false,volume:.5,mouseSensitivity:1,renderScale:1,viewDistance:160,quality:'balanced',shadows:true,
  effects:true,
  bindings:{
    forward:frenchKeyboard?'KeyZ':'KeyW',backward:'KeyS',left:frenchKeyboard?'KeyQ':'KeyA',right:'KeyD',
    sprint:'ShiftLeft',interact:'KeyF',build:'KeyB',talents:'KeyU',
    inventory:'KeyI',drop:'KeyG',vehicle:'KeyR',jump:'Space'
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
    bindings:{...defaults.bindings,...(stored.bindings||{})},
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
  if(action==='left')return !!(code==='KeyA'&&keys.KeyQ||code==='KeyQ'&&keys.KeyA||keys.ArrowLeft);
  if(action==='backward')return !!keys.ArrowDown;
  if(action==='right')return !!keys.ArrowRight;
  if(action==='sprint')return !!keys.ShiftRight;
  return false;
}
export function applyQuality(renderer,sun,quality,renderScale=1){
  const settings={
    low:{pixel:0.72,shadows:false},
    balanced:{pixel:1,shadows:true},
    high:{pixel:1.4,shadows:true}
  }[quality]||{pixel:1,shadows:true};
  const ratio=Math.max(.45,Math.min(window.devicePixelRatio||1,settings.pixel)*Math.max(.5,Math.min(1.5,renderScale)));
  renderer.setPixelRatio(ratio);
  renderer.shadowMap.enabled=settings.shadows;
  if(sun){sun.castShadow=settings.shadows;sun.shadow.mapSize.set(settings.shadows?1024:512,settings.shadows?1024:512);
    sun.shadow.map?.dispose();sun.shadow.map=null}
  renderer.setSize(window.innerWidth,window.innerHeight);
  return ratio;
}
