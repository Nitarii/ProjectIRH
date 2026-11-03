import assert from 'node:assert/strict';
import {isPressed,keyLabel,loadSettings,detectKeyboardLayout,ACTIONS} from '../src/settings.js';
const settings={bindings:{
  left:'KeyA',right:'KeyD',forward:'KeyW',backward:'KeyS',
  auto:'KeyR',drop:'KeyX',vehicle:'KeyV'
}};
assert.equal(isPressed({KeyA:true},settings,'left'),true,'physical left key must strafe');
assert.equal(isPressed({KeyQ:true},settings,'left'),false);
assert.equal(isPressed({ArrowLeft:true},settings,'left'),true);
assert.equal(isPressed({KeyR:true},settings,'auto'),true,'R toggles autonomous gathering');
assert.equal(isPressed({KeyX:true},settings,'drop'),true,'X drops carried trunks');
assert.equal(isPressed({KeyV:true},settings,'vehicle'),true,'V mounts bicycle');
assert.equal(isPressed({KeyA:true},settings,'auto'),false);
assert.ok(ACTIONS.includes('auto')&&ACTIONS.includes('drop')&&ACTIONS.includes('vehicle'));
assert.equal(keyLabel(settings.bindings.auto),'R');
const navigatorMock={language:'fr-FR',keyboard:{
  async getLayoutMap(){return new Map([['KeyW','z'],['KeyA','q'],['KeyR','r']])}
}};
const original=globalThis.navigator;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:navigatorMock});
try{
 await detectKeyboardLayout();
 assert.equal(keyLabel('KeyW'),'Z');
 assert.equal(keyLabel('KeyA'),'Q');
 assert.equal(keyLabel('KeyR'),'R');
}finally{Object.defineProperty(globalThis,'navigator',{configurable:true,value:original})}
const priorStorage=globalThis.localStorage;
let settingsJSON='{}';
globalThis.localStorage={
  getItem(key){return key==='irh-options'?settingsJSON:null},
  setItem(key,value){if(key==='irh-options')settingsJSON=value}
};
try{
  settingsJSON=JSON.stringify({controlsVersion:2,bindings:{
    forward:'KeyZ',left:'KeyQ',auto:'KeyR',drop:'KeyX',vehicle:'KeyV'
  }});
  const custom=loadSettings();
  assert.equal(custom.bindings.forward,'KeyZ','custom Z must not silently be rewritten');
  assert.equal(custom.bindings.left,'KeyQ','custom Q must survive browser reload');
  settingsJSON=JSON.stringify({bindings:{
    forward:'KeyZ',left:'KeyQ',auto:'KeyA',drop:'KeyG',vehicle:'KeyR'
  }});
  const migrated=loadSettings();
  assert.equal(migrated.bindings.forward,'KeyW');
  assert.equal(migrated.bindings.left,'KeyA');
  assert.equal(migrated.bindings.auto,'KeyR');
  assert.equal(migrated.bindings.drop,'KeyX');
  assert.equal(migrated.bindings.vehicle,'KeyV');
  assert.equal(new Set(Object.values(migrated.bindings)).size,Object.keys(migrated.bindings).length,
    'migrated controls must not contain duplicate bindings');
  assert.equal(migrated.controlsVersion,3,'migrated bindings use the current control schema');
}finally{
  if(priorStorage===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=priorStorage;
}
console.log('Physical AZERTY/QWERTY controls, R/X/V bindings and browser layout labels verified');
