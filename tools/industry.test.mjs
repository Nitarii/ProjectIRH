import assert from 'node:assert/strict';
import {createIndustry} from '../src/industry.js';

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
