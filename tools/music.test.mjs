import assert from 'node:assert/strict';
import {createScore,MUSIC_BIOMES} from '../src/music.js';
assert.equal(MUSIC_BIOMES,6,'five biomes and the central base');
const signatures=new Set();
for(let biome=-1;biome<5;biome++){
  for(let variant=0;variant<3;variant++){
    const score=createScore(biome,variant);
    assert.ok(score.duration>=70&&score.duration<135,'long ambient piece required');
    assert.equal(score.beats,128);
    assert.ok(score.events.length>95&&score.events.length<460,'sparse continuous arrangement');
    assert.ok(score.events.every(e=>e.freq>25&&e.freq<2100&&
      e.time>=0&&e.time<score.duration&&e.length>.08&&e.volume>0&&e.volume<.04));
    assert.ok(score.events.every((e,i)=>!i||score.events[i-1].time<=e.time));
    const signature=score.events.filter(e=>e.volume>.012).slice(0,10)
      .map(e=>Math.round(e.freq)).join(',');
    signatures.add(signature);
  }
}
assert.ok(signatures.size>=12,'biome tracks must be distinct');
console.log('18 long, original, gentle musical arrangements validated');
