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

for(let i=0;i<3500;i++)industry.update(.2,800,800);
const stats=industry.readStats();
console.log(JSON.stringify({stats,gold:st.gold,buildings:st.buildings.map(b=>({
  id:b.id,kind:b.kind,raw:b.stockRaw,input:b.inputRaw,processed:b.stockProcessed
}))},null,2));
assert.ok(stats.delivered>0,'transporters must deliver raw material to matching factories');
assert.ok(stats.processed>0,'factory operators must process the inputs');
assert.ok(stats.soldProcessed>0,'sellers must prioritize finished goods');
assert.ok(st.gold>100,'sellers must make money through the sale zone');
assert.ok(raw.hp<40||raw.dead,'visible harvesters must work on actual nearby resources');
console.log('Industry logistics checks passed');
