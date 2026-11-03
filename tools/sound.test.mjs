import assert from 'node:assert/strict';
import {createSound} from '../src/sound.js';
let context=null,notes=0,invalid=0,maximumActive=0;
class Param{
  setValueAtTime(value){if(!Number.isFinite(value))invalid++}
  linearRampToValueAtTime(value){if(!Number.isFinite(value))invalid++}
  exponentialRampToValueAtTime(value){if(!Number.isFinite(value))invalid++}
  setTargetAtTime(value){if(!Number.isFinite(value))invalid++}
  cancelScheduledValues(){}
}
class Node{
  constructor(){this.gain=new Param();this.frequency=new Param()}
  connect(){}
  disconnect(){}
  start(){}
  stop(){}
  addEventListener(){}
}
class FakeAudioContext{
  constructor(){context=this;this.currentTime=0;this.state='running';this.sampleRate=11025;this.destination=new Node()}
  createGain(){return new Node()}
  createOscillator(){notes++;return new Node()}
  createBufferSource(){return new Node()}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)}}
  createBiquadFilter(){const n=new Node();n.type='lowpass';return n}
  resume(){this.state='running';return Promise.resolve()}
}
globalThis.window={AudioContext:FakeAudioContext};
const sound=createSound();
sound.boot();
assert.ok(context);
sound.setVolume(.5);
const variants=new Set();
for(let i=0;i<720;i++){
  context.currentTime=i;
  sound.update(Math.floor(i/95)%6-1,1);
  const track=sound.currentMusic;
  variants.add(track.biome+':'+track.variant);
  maximumActive=Math.max(maximumActive,track.tracks);
}
assert.equal(invalid,0,'musical frequencies and WebAudio envelopes must remain finite');
assert.ok(notes>300,'long soundtracks must sustain quiet ambience');
assert.ok(variants.size>=4,'songs should vary continuously');
assert.ok(maximumActive<=3,'track crossfades must not leak sound channels');
sound.setEnabled(false);sound.setEnabled(true);
console.log(JSON.stringify({scheduledNotes:notes,uniqueThemes:variants.size,maximumActive,invalid}));
console.log('Twelve minutes of crossfaded ambient music passed');
