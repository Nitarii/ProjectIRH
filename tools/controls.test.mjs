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
console.log('Physical AZERTY/QWERTY controls, R/X/V bindings and browser layout labels verified');
