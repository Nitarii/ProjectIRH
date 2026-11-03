import assert from 'node:assert/strict';
import {decorationCollider} from '../src/decor-collision.js';
for(const kind of [0,1,2,4,5]){
  for(const scale of [.55,.9,1.25,1.75,2.05]){
    assert.equal(decorationCollider(kind,scale),null,
      'ground pebbles and flexible vegetation must be fully passable');
  }
}
assert.equal(decorationCollider(3,.60),null,'ankle-high cacti should not block a worker');
assert.equal(decorationCollider(3,1.05),null,'low cactus should not be solid');
const large=decorationCollider(3,1.8);
assert.ok(large?.height>1.8&&large.r>.16,'large rigid cactus must remain solid');
console.log('Scenery collision classification verified');
