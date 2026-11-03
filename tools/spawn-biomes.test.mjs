import assert from 'node:assert/strict';
import {startingBiomes,openingBiome} from '../src/spawn-biomes.js';
const first=new Set();
for(let seed=10000;seed<10600;seed++){
  const b=startingBiomes(seed);
  assert.equal(new Set(b).size,3,'the starting region must offer exactly three different biomes');
  assert.ok(b.every(x=>x>=0&&x<=4));
  assert.equal(openingBiome(0,30,seed),b[0],'front of camp must use random starting biome');
  assert.equal(openingBiome(60,32,seed),b[1],'right side must offer a second biome');
  assert.equal(openingBiome(-60,32,seed),b[2],'left side must offer a third biome');
  assert.equal(openingBiome(0,9,seed),-1,'camp center must remain unobstructed');
  assert.equal(openingBiome(0,250,seed),null,'larger map must continue using open procedural regions');
  first.add(b[0]);
}
assert.equal(first.size,5,'all biomes must be possible starting biomes');
console.log('Randomized three-biome procedural crossroads verified over 600 seeds');
