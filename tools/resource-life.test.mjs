import assert from 'node:assert/strict';
import {createResourceLifecycle,resourceId} from '../src/resource-life.js';

// Resource exhaustion is deliberately permanent; only damaged, living nodes
// regenerate. Legacy respawn timestamps must not revive depleted resources.
let now=1_750_000_000_000;
const state={exhausted:{}},life=createResourceLifecycle(state,{now:()=>now});
const tree={type:0,x:34.6,z:12.4,max:40,hp:40,dead:false,mesh:{visible:true}};
life.spawn(tree);
tree.hp=25;
life.hit(tree);
now+=43000;
let progress=life.update([tree]);
assert.ok(tree.hp>25&&tree.hp<40,'damaged living nodes must regenerate gradually');
assert.ok(progress.healed>0&&progress.revived===0);
now+=180000;
life.update([tree]);
assert.equal(tree.hp,40,'a damaged living node must recover completely');
life.deplete(tree);
assert.equal(tree.hp,0);
assert.equal(tree.dead,true);
assert.equal(tree.mesh.visible,false);
assert.equal(tree.respawnAt,Infinity);
assert.equal(state.exhausted[resourceId(tree)],true,'exhaustion must be saved by stable resource ID');

const persisted=JSON.parse(JSON.stringify(state));
const restored=createResourceLifecycle(persisted,{now:()=>now});
const same={...tree,hp:40,dead:false,mesh:{visible:true}};
restored.spawn(same);
assert.equal(same.dead,true,'destroyed state must survive a chunk reload');
assert.equal(same.hp,0);
assert.equal(same.mesh.visible,false);
now+=365*24*3600000;
progress=restored.update([same]);
assert.equal(same.dead,true,'exhausted nodes must never respawn with elapsed time');
assert.deepEqual(progress,{revived:0,healed:0});
assert.equal(Object.keys(restored.exhausted).length,1);

const fresh={type:0,x:40.2,z:12.4,max:40,hp:40,dead:false,mesh:{visible:true}};
restored.spawn(fresh);
assert.equal(fresh.dead,false,'another resource location must remain harvestable');

// Previous saves may contain positive respawn deadlines. Treat them as
// exhausted, rather than accidentally resurrecting old depleted nodes.
const legacy={exhausted:{[resourceId(tree)]:1_750_000_010_000}};
const migrated=createResourceLifecycle(legacy,{now:()=>now});
const legacyNode={...tree,dead:false,hp:40,mesh:{visible:true}};
migrated.spawn(legacyNode);
assert.equal(legacyNode.dead,true,'legacy respawn timestamps remain depleted');
console.log('Living resource regeneration, permanent exhaustion, persistence and legacy migration verified');
