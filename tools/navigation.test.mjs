import assert from 'node:assert/strict';
import {createRouter} from '../src/navigation.js';

const solid=(x,z)=>x>3&&x<9&&Math.abs(z)<3;
const router=createRouter(solid,{cell:1.2,maxVisits:1600});
const origin={x:0,z:0},destination={x:14,z:0};
const path=router.route(origin,destination);
assert.ok(path&&path.length>4,'must find detour around building');
for(const p of path)assert.ok(!solid(p.x,p.z),'route must never cross a building');
assert.ok(Math.hypot(path.at(-1).x-destination.x,path.at(-1).z-destination.z)<.01,
  'route must end at goal');
const noPath=createRouter((x,z)=>x>2&&x<5,{cell:1.2,maxVisits:240}).route(origin,destination);
assert.equal(noPath,null,'fully blocking infinite wall should be rejected');
console.log('Navigation checks passed',path.length);
