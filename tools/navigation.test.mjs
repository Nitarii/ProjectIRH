import assert from 'node:assert/strict';
import {createRouter} from '../src/navigation.js';

const solid=(x,z)=>x>3&&x<9&&Math.abs(z)<3;
const router=createRouter(solid,{cell:1.2,maxVisits:1600});
const origin={x:0,z:0},destination={x:14,z:0};
const path=router.route(origin,destination);
assert.ok(path&&path.length>=2,'must find detour around building');
for(const p of path)assert.ok(!solid(p.x,p.z),'route must never cross a building');
assert.ok(Math.hypot(path.at(-1).x-destination.x,path.at(-1).z-destination.z)<.01,
  'route must end at goal');
const noPath=createRouter((x,z)=>x>2&&x<5,{cell:1.2,maxVisits:240}).route(origin,destination);
assert.equal(noPath,null,'fully blocking infinite wall should be rejected');
console.log('Navigation checks passed',path.length);

function requireCollisionFree(path,from,obstacle,label){
  let prior=from;
  for(const next of path){
    const length=Math.hypot(next.x-prior.x,next.z-prior.z);
    const steps=Math.ceil(length/.18);
    for(let i=1;i<=steps;i++){
      const t=i/steps,x=prior.x+(next.x-prior.x)*t,z=prior.z+(next.z-prior.z)*t;
      assert.ok(!obstacle(x,z),label+': edge collides at '+x.toFixed(2)+','+z.toFixed(2));
    }
    prior=next;
  }
}
requireCollisionFree(path,origin,solid,'building detour');
const impassableGap=(x,z)=>Math.hypot(x-5,z-.56)<.90||
  Math.hypot(x-5,z+.56)<.90;
const gapRoute=createRouter(impassableGap,{cell:1.15,maxVisits:1800})
  .route({x:0,z:0},{x:12,z:0});
assert.ok(gapRoute?.length>=2,'worker must detour instead of squeezing between nodes');
requireCollisionFree(gapRoute,{x:0,z:0},impassableGap,'narrow resource gap');
assert.equal(createRouter((x,z)=>Math.hypot(x-5,z)<2,{cell:1.15})
  .route({x:0,z:0},{x:5,z:0}),null,'must refuse a blocked destination');
assert.ok(createRouter(()=>false).route({x:0,z:0},{x:14,z:9}).length===1,
  'unobstructed travel should avoid expensive search');
console.log('Collision-free detours and unreachable destinations verified');
