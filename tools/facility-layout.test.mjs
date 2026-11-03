import assert from 'node:assert/strict';
import {createRouter} from '../src/navigation.js';
import {FACTORY_TASKS,storagePoint,yardPoint} from '../src/factory-tasks.js';
import {worldPoint,facilityFootprint,footprintsOverlap,pointInOrientedRect,normalizeRotation} from '../src/facility-layout.js';
for(let quarter=0;quarter<4;quarter++){
 const factory={kind:'factory',type:0,x:65,z:65,rotation:quarter*Math.PI/2};
 const footprint=facilityFootprint(factory);
 assert.equal(footprint.angle,factory.rotation);
 assert.equal(normalizeRotation(factory.rotation+Math.PI*4),factory.rotation);
 assert.ok(!footprintsOverlap(footprint,
   facilityFootprint({kind:'worker',x:125,z:125,rotation:0})));
 assert.ok(footprintsOverlap(footprint,facilityFootprint({...factory,x:65.5})));
 const machines=FACTORY_TASKS[0].map(task=>{
   const location=worldPoint(factory,task.point[0],task.point[1]-1.15);
   return {...location,w:1.6,d:1.13,angle:factory.rotation};
 });
 const core={...worldPoint(factory,0,0),w:4.25,d:4.1,angle:factory.rotation};
 const raw=storagePoint(factory,false);
 const output=storagePoint(factory,true);
 const pallet={...worldPoint(factory,-7.25,3.42),w:1.35,d:.88,angle:factory.rotation};
 const blocked=(x,z)=>[core,pallet,...machines].some(rect=>pointInOrientedRect(x,z,rect,.38));
 const router=createRouter(blocked,{cell:1.15,maxVisits:1900});
 assert.equal(blocked(raw.x,raw.z),false,'pickup must stay clear of pallet');
 assert.equal(blocked(output.x,output.z),false);
 for(let i=0;i<5;i++){
   const goal=yardPoint(factory,FACTORY_TASKS[0][i].point);
   assert.equal(blocked(goal.x,goal.z),false,'operator must stand clear of machine');
   const route=router.route(raw,goal,{allowNearby:true,arrivalRadius:.6});
   assert.ok(route?.length,'all five stations must remain accessible from the raw pile');
   let previous=raw;
   for(const next of route){
     const length=Math.hypot(next.x-previous.x,next.z-previous.z);
     const count=Math.max(1,Math.ceil(length/.20));
     for(let j=1;j<=count;j++){
       const t=j/count;
       assert.equal(blocked(previous.x+(next.x-previous.x)*t,
         previous.z+(next.z-previous.z)*t),false,
         'worker must not cross actual machine models');
     }
     previous=next;
   }
 }
 const rotated=worldPoint(factory,0,4);
 assert.ok(Number.isFinite(rotated.x+rotated.z));
}
console.log('Four rotations, five refinery stations, storage clearances and obstacle-safe routes passed');
