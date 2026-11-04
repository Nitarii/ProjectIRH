import assert from 'node:assert/strict';
import {startingBiomes,openingBiome} from '../src/spawn-biomes.js';
for(let seed=10000;seed<10600;seed++){
  assert.deepEqual(startingBiomes(seed),[0],'forest is the sole biome');
  assert.equal(openingBiome(0,9,seed),-1,'camp keeps its clearing');
  for(const [x,z] of [[0,30],[60,15],[-60,15],[500,700],[-1000,0]])
    assert.equal(openingBiome(x,z,seed),0,'all directions stay forest');
}
console.log('One infinite forest and central camp verified over 600 seeds');
