import assert from 'node:assert/strict';
import {isPressed,keyLabel} from '../src/settings.js';
const settings={bindings:{
  left:'KeyQ',right:'KeyD',forward:'KeyW',backward:'KeyS',auto:'KeyA'
}};
assert.equal(isPressed({KeyA:true},settings,'left'),false,'A must not strafe while enabling automatic gathering');
assert.equal(isPressed({KeyQ:true},settings,'left'),true);
assert.equal(isPressed({ArrowLeft:true},settings,'left'),true);
assert.equal(isPressed({KeyA:true},settings,'auto'),true);
assert.equal(keyLabel(settings.bindings.auto),'A');
console.log('A auto and lateral movement no longer conflict');
