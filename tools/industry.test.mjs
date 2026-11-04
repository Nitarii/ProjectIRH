import assert from 'node:assert/strict';
import {createIndustry} from '../src/industry.js';
import {FACTORY_TASKS,workstation} from '../src/factory-tasks.js';

class Vec{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
}
class Group{
  constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.visible=true}
  add(...objects){this.children.push(...objects)}
}
class Mesh extends Group{
  constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}
}
class Geometry{constructor(...args){this.args=args}}
class Material{constructor(o){Object.assign(this,o)}}
const T={Group,Mesh,
  BoxGeometry:Geometry,CylinderGeometry:Geometry,ConeGeometry:Geometry,
  IcosahedronGeometry:Geometry,MeshLambertMaterial:Material};
const scene={objects:[],add(g){this.objects.push(g)},remove(g){this.objects=this.objects.filter(o=>o!==g)}};
const st={gold:100,buildings:[
  {id:'b1',kind:'worker',type:0,x:10,z:29,workers:1,stockRaw:15},
  {id:'b2',kind:'factory',type:0,x:24,z:33,workers:1,stockProcessed:4},
  {id:'b3',kind:'transport',type:0,x:16,z:41,workers:1},
  {id:'b4',kind:'seller',type:0,x:25,z:18,workers:1}
]};
const raw={type:0,x:5,z:35,hp:40,max:40,dead:false,mesh:{visible:true}};
const resources=[raw];
const sales=[];
const industry=createIndustry(T,scene,st,resources,()=>0,{x:10,z:1,w:10,d:9},[12,15,22,10,14],{onSale(amount){sales.push(amount)}});
st.buildings.forEach(b=>industry.register(b));
assert.equal(industry.readStats().employees,0); // stats populated after first update
for(let i=0;i<15;i++)industry.update(.15,10,29);
assert.equal(industry.readStats().employees,4);
assert.ok(industry.readStats().visible>=1,'workers should be represented by visible models');

let observedHarvest=raw.hp<40;
for(let i=0;i<3500;i++){industry.update(.2,800,800);if(raw.hp<40||raw.dead)observedHarvest=true}
const stats=industry.readStats();
console.log(JSON.stringify({stats,gold:st.gold,buildings:st.buildings.map(b=>({
  id:b.id,kind:b.kind,raw:b.stockRaw,input:b.inputRaw,processed:b.stockProcessed
}))},null,2));
assert.ok(stats.delivered>0,'transporters must deliver raw material to matching factories');
assert.ok(stats.processed>0,'factory operators must process the inputs');
assert.ok(stats.soldProcessed>0,'sellers must prioritize finished goods');
assert.ok(st.gold>100,'sellers must make money through the sale zone');
assert.ok(observedHarvest,'harvesters must interact with existing resources during the simulation');
console.log('Industry logistics checks passed');

const refinery={id:'b20',kind:'factory',type:0,x:45,z:42,workers:9,inputRaw:90,stockProcessed:2};
const isolated={gold:0,buildings:[refinery]};
const scene2={objects:[],add(g){this.objects.push(g)},remove(g){this.objects=this.objects.filter(o=>o!==g)}};
const local=createIndustry(T,scene2,isolated,[],()=>0,{x:7,z:0,w:10,d:9},[12,15,22,10,14]);
local.register(refinery);
assert.equal(refinery.workers,5,'no structure may hire more than five workers');
assert.equal(local.buildingGeometry('b20').workstations,5,'each factory needs five workstations');
assert.ok(local.buildingGeometry('b20').colliders>=7,'machinery must create physical obstacles');
const touched=new Set();
let minSpacing=Infinity;
for(let i=0;i<550;i++){
  local.update(.18,45,42);
  const staff=local.snapshot();
  for(const person of staff)if(person.state==='factoryWork')touched.add(person.slot);
  for(let a=0;a<staff.length;a++)for(let b=a+1;b<staff.length;b++){
    const delta=Math.hypot(staff[a].x-staff[b].x,staff[a].z-staff[b].z);
    minSpacing=Math.min(minSpacing,delta);
  }
}
const workshop=local.readStats();
console.log(JSON.stringify({refineryProduced:refinery.stockProcessed,touched:[...touched],
  minimumSpacing:minSpacing,performance:workshop},null,2));
assert.ok(minSpacing>.35,'workers should not overlap');
assert.ok(refinery.stockProcessed>2,'the production line should complete finished items');
assert.ok(touched.size>=3,'multiple independent workstations should run');
const remote=createIndustry(T,scene2,{gold:0,buildings:[{
  id:'b50',kind:'factory',type:4,x:420,z:400,workers:5,inputRaw:60
}]},[],()=>4,{x:7,z:0,w:10,d:9},[12,15,22,10,14]);
remote.sync();
for(let i=0;i<500;i++)remote.update(.2,0,0);
assert.equal(remote.readStats().visible,0,'out-of-view workers must have no active models');
assert.equal(remote.readStats().abstract,5,'all distant staff must use data-only simulation');
console.log('Crowd spacing, factory stations and remote simulation checks passed');

for(let type=0;type<5;type++){
  const tasks=FACTORY_TASKS[type];
  assert.equal(tasks.length,5,'every processing industry needs five roles');
  assert.equal(new Set(tasks.map(x=>x.name)).size,5,'roles must be independently recognizable');
  assert.equal(new Set(tasks.map(x=>x.point.join(','))).size,5,'jobs must occupy different workstations');
  assert.ok(tasks.every((x,i)=>workstation(type,i)===x),'the assigned workstation must be stable');
}
assert.ok(remote.readStats().processed>0,'offscreen production must continue as numeric data');
console.log('All twenty-five specialist jobs and remote output verified');


const crowdedResources=[
  {type:0,x:6,z:29.7,hp:40,max:40,dead:false,mesh:{visible:true}},
  {type:0,x:6.7,z:31.25,hp:40,max:40,dead:false,mesh:{visible:true}},
  {type:0,x:7.0,z:27.05,hp:40,max:40,dead:false,mesh:{visible:true}}
];
const chokepointProps=[
  {x:10.6,z:29,r:1.20},
  {x:10.6,z:31,r:1.20},
  {x:11.9,z:30,r:.55}
];
const crowdState={gold:100,buildings:[
  {id:'b-crew',kind:'worker',type:0,x:17,z:30,workers:2,stockRaw:0}
]};
const crowd=createIndustry(T,scene2,crowdState,crowdedResources,()=>0,
  {x:80,z:90,w:8,d:8},[12,15,22,10,14],{
    blocked(x,z,radius){
      return chokepointProps.some(o=>(o.x-x)**2+(o.z-z)**2<(o.r+radius)**2);
    }
  });
crowd.sync();
let minCrewSpacing=Infinity,maxDelay=0,finishedTasks=0;
for(let i=0;i<1050;i++){
  crowd.update(.12,17,30);
  const crew=crowd.snapshot();
  if(crew.length===2){
    minCrewSpacing=Math.min(minCrewSpacing,
      Math.hypot(crew[0].x-crew[1].x,crew[0].z-crew[1].z));
    maxDelay=Math.max(maxDelay,...crew.map(w=>w.blockedAge||0));
  }
  if(crowdState.buildings[0].stockRaw>finishedTasks)
    finishedTasks=crowdState.buildings[0].stockRaw;
}
assert.ok(minCrewSpacing>.48,'harvesters must not overlap at tight trees');
assert.ok(maxDelay<8,'blocked-worker watchdog must not accumulate without bound');
assert.ok(crowdedResources.some(r=>r.hp<r.max||r.dead)||finishedTasks>0,
  'harvesters must eventually work around tightly packed nodes');
const crowdStats=crowd.readStats();
assert.ok(crowdStats.replans<500,'routing must not run expensive searches every frame');
console.log(JSON.stringify({minCrewSpacing,maxDelay,finishedTasks,crowdStats},null,2));
console.log('Tight-tree congestion and worker recovery verified');


const enclosedTree={type:0,x:6,z:29,hp:40,max:40,dead:false,mesh:{visible:true}};
const trappedState={gold:100,buildings:[
  {id:'b-walled',kind:'worker',type:0,x:17,z:29,workers:1,stockRaw:0}
]};
const unreachableCrew=createIndustry(T,scene2,trappedState,[enclosedTree],()=>0,
  {x:70,z:70,w:9,d:9},[12,15,22,10,14],{
    blocked(x,z,radius){
      const distanceToTree=Math.hypot(x-enclosedTree.x,z-enclosedTree.z);
      return distanceToTree>2.7-radius&&distanceToTree<4.3+radius;
    }
  });
unreachableCrew.sync();
for(let i=0;i<550;i++)unreachableCrew.update(.19,17,29);
const recovered=unreachableCrew.readStats();
assert.ok(recovered.routeFailures>0,'closed passages must produce explicit failed plans');
assert.ok(recovered.stuckRecoveries>0,'an isolated tree must eventually be abandoned');
assert.ok(enclosedTree.unreachableUntil>0,'unreachable nodes must be temporarily blacklisted');
assert.ok(unreachableCrew.snapshot()[0].blockedAge<8,
  'worker must not remain permanently locked in an unreachable route');
assert.ok(recovered.replans<90,'unreachable targets must not trigger endless A* calculations');
console.log(JSON.stringify({unreachableTree:recovered,blacklistedUntil:enclosedTree.unreachableUntil}));
console.log('Impassable resource recovery verified');


const oldLog={type:0,x:13,z:40,hp:0,max:40,dead:true,
  log:{kind:'fallen trunk',position:{x:12,z:42}},mesh:{visible:false},logPlacedAt:0};
const reclaimedState={gold:0,buildings:[{
  id:'reclaimer',kind:'worker',type:0,x:23,z:35,rotation:Math.PI/2,
  workers:1,carryLevel:1,stockRaw:0
}]};
let loggingAge=0,brokenLogs=0;
const reclaim=createIndustry(T,scene2,reclaimedState,[oldLog],()=>0,
  {x:200,z:200,w:10,d:9},[12,15,22,10,14],{
    canBreakLog(node){return node===oldLog&&!!node.log&&loggingAge>=60},
    onLogCut(node){node.log=null;brokenLogs++}
  });
reclaim.sync();
for(let i=0;i<290;i++){loggingAge+=.20;reclaim.update(.20,23,35)}
assert.equal(brokenLogs,0,'loggers must not collect player logs before one minute');
for(let i=0;i<320;i++){loggingAge+=.20;reclaim.update(.20,23,35)}
assert.equal(brokenLogs,1,'logger must cut an unattended log exactly once');
assert.ok(reclaimedState.buildings[0].stockRaw>0,'chopped trunk must become stock of raw wood');
console.log('Minute-old abandoned log recovery and correct reprocessing verified');


// Full logging huts must NEVER dispatch their loggers directly to the market.
// Transport employees alone bring the wood to a seller's own warehouse.
const fullLoggingState={gold:275,buildings:[
  {id:'full-logging-hut',kind:'worker',type:0,x:10,z:29,workers:1,stockRaw:100},
  {id:'empty-selling-house',kind:'seller',type:0,x:25,z:18,workers:1,
    warehouseRaw:[0,0,0,0,0],warehouseProcessed:[0,0,0,0,0]}
]};
const nearbyTree={type:0,x:5,z:35,hp:40,max:40,dead:false,mesh:{visible:true}};
const fullCrew=createIndustry(T,scene2,fullLoggingState,[nearbyTree],()=>0,
  {x:10,z:1,w:10,d:9},[12,15,22,10,14]);
fullCrew.sync();
for(let i=0;i<1100;i++){
  fullCrew.update(.2,10,29);
  const logger=fullCrew.snapshot().find(a=>a.role==='worker');
  assert.ok(!['toPickup','pickupStock','toMarket','selling'].includes(logger.state),
    'logging workers must never pick up stock for direct selling');
}
assert.equal(fullLoggingState.gold,275,'a full logging hut must not generate direct sales');
assert.equal(fullCrew.readStats().sold,0,'an empty seller must not sell untransported wood');
assert.equal(fullLoggingState.buildings[0].stockRaw,100,'full hut stock must remain stored');
assert.equal(nearbyTree.hp,40,'loggers must wait when their storage is full');

// Once a hauler creates storage room, logging must resume automatically.
fullLoggingState.buildings[0].stockRaw=90;
let resumed=false;
for(let i=0;i<3000;i++){
  fullCrew.update(.2,10,29);
  if(nearbyTree.hp<40){resumed=true;break}
}
assert.ok(resumed,'logging must resume when the hut has room again');
assert.equal(fullLoggingState.gold,275,'resuming harvest must not trigger sales');
console.log('Full logging hut no-sale and automatic harvest resumption verified');
