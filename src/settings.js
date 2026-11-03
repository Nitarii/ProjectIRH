// Movement is based on physical key position, not the browser interface language.
// navigator.keyboard.getLayoutMap supplies actual labels for AZERTY, QWERTY,
// QWERTZ, Dvorak and other layouts whenever the browser makes it available.
const locale=(typeof navigator!=='undefined'?navigator.language:'en')||'en';
const defaults={
 language:locale.toLowerCase().startsWith('fr')?'fr':'en',
 muted:false,goldSound:true,volume:.5,mouseSensitivity:1,renderScale:1,viewDistance:128,
 quality:'balanced',shadows:true,effects:true,
 bindings:{
  forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD',
  sprint:'ShiftLeft',interact:'KeyF',market:'KeyC',build:'KeyB',talents:'KeyT',map:'KeyM',
  auto:'KeyR',drop:'KeyX',vehicle:'KeyV',jump:'Space'
 }
};
let keyboardMap=null;
const fallbackFrench=locale.toLowerCase().startsWith('fr');
export const ACTIONS=Object.keys(defaults.bindings);
export async function detectKeyboardLayout(){
  try{
    if(typeof navigator!=='undefined'&&navigator.keyboard?.getLayoutMap){
      keyboardMap=await navigator.keyboard.getLayoutMap();
    }
  }catch{/* Permission or browser availability varies. Physical bindings remain valid. */}
  return keyboardMap;
}
export function loadSettings(){
 let stored={};
 try{stored=JSON.parse(localStorage.getItem('irh-options')||'{}')}catch{}
 const clamp=(v,min,max,base)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):base;
 const previouslySaved=stored.bindings&&typeof stored.bindings==='object'
   ?stored.bindings:{};
 const bindings={...defaults.bindings,...previouslySaved};
 delete bindings.inventory;
 // Migrate only recognisable historic shipped layouts. Explicit custom
 // bindings must survive subsequent reloads, even when they use Z or Q.
 if(!stored.controlsVersion){
   const oldAzerty=previouslySaved.forward==='KeyZ'&&
     previouslySaved.left==='KeyQ';
   if(oldAzerty){bindings.forward='KeyW';bindings.left='KeyA'}
   if(previouslySaved.auto==='KeyA'&&
      (oldAzerty||previouslySaved.vehicle==='KeyR'))bindings.auto='KeyR';
   if(previouslySaved.vehicle==='KeyR'&&previouslySaved.auto==='KeyA')
     bindings.vehicle='KeyV';
   if(previouslySaved.drop==='KeyG'&&previouslySaved.auto==='KeyA')
     bindings.drop='KeyX';
 }
 // Migrate the former default progression shortcut without overwriting custom bindings.
 if((Number(stored.controlsVersion)||0)<3&&previouslySaved.talents==='KeyU')bindings.talents='KeyT';
 // Never leave duplicated bindings after migrating a pre-existing saved game.
 const assigned=new Set();
 const alternatives=['KeyR','KeyC','KeyV','KeyX','KeyU','KeyB',
   'KeyT','KeyG','KeyH','KeyJ','KeyK','KeyL','KeyP','KeyO','KeyI','KeyN','KeyM'];
 for(const action of ACTIONS){
   const candidate=bindings[action];
   if(typeof candidate!=='string'||!candidate||assigned.has(candidate)){
     const fallback=[defaults.bindings[action],...alternatives].find(k=>!assigned.has(k));
     bindings[action]=fallback||defaults.bindings[action];
   }
   assigned.add(bindings[action]);
 }
 return {...defaults,...stored,
   volume:clamp(stored.volume,0,1,defaults.volume),
   mouseSensitivity:clamp(stored.mouseSensitivity,.2,3,defaults.mouseSensitivity),
   renderScale:clamp(stored.renderScale,.5,1.5,defaults.renderScale),
   viewDistance:clamp(stored.viewDistance,64,256,defaults.viewDistance),
   bindings,controlsVersion:3,
   language:stored.language==='fr'?'fr':stored.language==='en'?'en':defaults.language};
}
export function storeSettings(settings){
 try{localStorage.setItem('irh-options',JSON.stringify(settings))}catch{}
}
export function keyLabel(code){
 if(!code)return '—';
 const variants={Space:'SPACE',ShiftLeft:'SHIFT',ShiftRight:'SHIFT',
  Escape:'ESC',Tab:'TAB',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',
  ControlLeft:'CTRL',ControlRight:'CTRL',AltLeft:'ALT',AltRight:'ALT'};
 if(variants[code])return variants[code];
 if(keyboardMap?.get){
  const label=keyboardMap.get(code);
  if(label&&label.length<=8)return label.toLocaleUpperCase();
 }
 const french=fallbackFrench?{
  KeyW:'Z',KeyA:'Q',KeyQ:'A',KeyZ:'W',KeyM:',',
  Digit1:'&',Digit2:'É',Digit3:'"',Digit4:"'",Digit5:'('
 }:{};
 return french[code]||code.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'NUM ');
}
export function isPressed(keys,settings,action){
 const code=settings.bindings[action];
 if(keys[code])return true;
 if(action==='forward')return !!keys.ArrowUp;
 if(action==='backward')return !!keys.ArrowDown;
 if(action==='left')return !!keys.ArrowLeft;
 if(action==='right')return !!keys.ArrowRight;
 if(action==='sprint')return !!keys.ShiftRight;
 return false;
}
export function applyQuality(renderer,sun,quality,renderScale=1){
 const preset={
  low:{shadows:false,shadowSize:512},balanced:{shadows:true,shadowSize:1024},
  high:{shadows:true,shadowSize:2048}
 }[quality]||{shadows:true,shadowSize:1024};
 const ratio=Math.max(.45,Math.min(window.devicePixelRatio||1,1.5)*
   Math.max(.5,Math.min(1.5,renderScale)));
 renderer.setPixelRatio(ratio);
 renderer.shadowMap.enabled=preset.shadows;
 if(sun){
  sun.castShadow=preset.shadows;
  sun.shadow.mapSize.set(preset.shadowSize,preset.shadowSize);
  sun.shadow.map?.dispose();sun.shadow.map=null;
 }
 renderer.setSize(window.innerWidth,window.innerHeight);
 return ratio;
}
