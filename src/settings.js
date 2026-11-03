const frenchKeyboard=(navigator.language||'en').toLowerCase().startsWith('fr');
const defaults={
  language:(navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en',
  muted:false,volume:.65,quality:'balanced',shadows:true,
  effects:true,
  bindings:{
    forward:frenchKeyboard?'KeyZ':'KeyW',backward:'KeyS',left:frenchKeyboard?'KeyQ':'KeyA',right:'KeyD',
    sprint:'ShiftLeft',interact:'KeyF',build:'KeyB',talents:'KeyU',
    inventory:'KeyI',drop:'KeyG',vehicle:'KeyR'
  }
};
export const ACTIONS=Object.keys(defaults.bindings);
export function loadSettings(){
  let stored={};
  try{stored=JSON.parse(localStorage.getItem('irh-options')||'{}')}catch{}
  return {...defaults,...stored,
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
export function applyQuality(renderer,sun,quality){
  const settings={
    low:{pixel:0.72,shadows:false},
    balanced:{pixel:1,shadows:true},
    high:{pixel:1.4,shadows:true}
  }[quality]||{pixel:1,shadows:true};
  const ratio=Math.min(window.devicePixelRatio||1,settings.pixel);
  renderer.setPixelRatio(ratio);
  renderer.shadowMap.enabled=settings.shadows;
  if(sun){sun.castShadow=settings.shadows;sun.shadow.mapSize.set(settings.shadows?1024:512,settings.shadows?1024:512);
    sun.shadow.map?.dispose();sun.shadow.map=null}
  renderer.setSize(window.innerWidth,window.innerHeight);
  return ratio;
}
