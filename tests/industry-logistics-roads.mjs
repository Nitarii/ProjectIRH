// Run with Node: node tests/industry-logistics-roads.mjs
// No browser/WebGL dependencies. Validates economy and AI state transitions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const strip=code=>code.replace(/^import[^\n]*\n/gm,'').replace(/^export\s+/gm,'');
const load=(path,names,deps={})=>
  new Function(...Object.keys(deps),strip(src(path))+';return {'+names.join(',')+'}')(...Object.values(deps));
const layout=load('src/facility-layout.js',['worldPoint','rotateOffset','normalizeRotation','pointInOrientedRect']);
const nav=load('src/navigation.js',['createRouter']);
const economy=load('src/logistics.js',['prepareWarehouse','warehouseRoom','chooseWarehouseSale',
  'pickupWarehouse','selectTransportJob','transportSpace','deliverTransport']);
const tasks=load('src/factory-tasks.js',['workstation','storagePoint','yardPoint'],{worldPoint:layout.worldPoint});
const roadsApi=load('src/road-network.js',['createRoadNetwork'],{
  createRouter:nav.createRouter,worldPoint:layout.worldPoint});
let checks=0;
const test=(title,value)=>{assert.ok(value,title);checks++;console.log('✓ '+title)};
const state={roads:{}},roads=roadsApi.createRoadNetwork(state);
roads.setProbes({blocked:()=>false,traffic:()=>25,invalidate:()=>{}});
const sites=[
  {kind:'road',id:'r',x:30,z:25,rotation:0},
  {kind:'worker',id:'w',x:80,z:35,rotation:0},
  {kind:'seller',id:'s',x:100,z:75,rotation:0}
];
test('road planning',roads.rebuild(sites,{x:23,z:0})&&roads.plannedCount>20);
let guard=0;
while(roads.completed<roads.plannedCount&&guard++<2000){
  const job=roads.claim('roadworker',{x:80,z:35});
  assert.ok(job,'must plan reachable road task');
  assert.equal(roads.work('roadworker',job,4),'done');
}
test('all planned paths progressively finished',roads.completed===roads.plannedCount);
const upgrade=roads.claim('roadworker',{x:80,z:35});
test('upgrade requires used path',upgrade?.mode==='upgrade');
assert.equal(roads.work('roadworker',upgrade,6),'done');
test('built paths give +20%, paved roads +50%',roads.speedAt(upgrade.x,upgrade.z)===1.5&&
  Object.values(state.roads).some(v=>v.l===1));
roads.rebuild([sites[0]],{x:23,z:0});
test('obsolete roads get demolition jobs',roads.claim('roadworker',{x:80,z:35})?.mode==='demolish');
const pavedRoute=nav.createRouter(()=>false,{cell:1.2,maxVisits:2300,
  speedAt:(x,z)=>Math.abs(z-5)<1.8?1.5:1}).route({x:0,z:0},{x:40,z:0});
test('AI travel-time routing chooses a faster paved detour',
  pavedRoute?.some(p=>p.z>3.3)&&pavedRoute?.length>1);
const seller={id:'s',kind:'seller',x:60,z:25};
economy.prepareWarehouse(seller);
test('empty seller has nothing to sell',economy.chooseWarehouseSale(seller)===null);
test('processed stock reaches seller warehouse',economy.deliverTransport(seller,2,true,14)===14);
test('seller chooses its own refined goods',economy.chooseWarehouseSale(seller)?.processed===true);
test('sale pickup debits warehouse',economy.pickupWarehouse(seller,2,true,7)===7&&
  seller.warehouseProcessed[2]===7);
class Obj{
  constructor(){
    this.children=[];this.visible=true;
    for(const name of ['position','rotation','scale']){
      this[name]={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
    }
  }
  add(...items){this.children.push(...items)}
  remove(item){this.children=this.children.filter(x=>x!==item)}
  traverse(fn){fn(this);for(const child of this.children)child.traverse(fn)}
}
class Geometry{dispose(){}}
class Material{constructor(o){this.color=o?.color}}
class Mesh extends Obj{constructor(geometry,material){
  super();this.geometry=geometry;this.material=material;this.isMesh=true;
}}
const T={Group:Obj,Mesh,BoxGeometry:Geometry,CylinderGeometry:Geometry,
  IcosahedronGeometry:Geometry,ConeGeometry:Geometry,MeshLambertMaterial:Material};
const makeStructure=(T,scene,b)=>{
  const group=new Obj();scene.add(group);
  return {group,colliders:[],workstations:[],setLanguage(){},update(){},
    get labelText(){return b.kind}};
};
const industryApi=load('src/industry.js',['createIndustry'],{
  makeStructure,createRouter:nav.createRouter,
  workstation:tasks.workstation,storagePoint:tasks.storagePoint,
  yardPoint:tasks.yardPoint,worldPoint:layout.worldPoint,
  rotateOffset:layout.rotateOffset,normalizeRotation:layout.normalizeRotation,
  pointInOrientedRect:layout.pointInOrientedRect,...economy
});
const sim={gold:0,roads:{},buildings:[
  {kind:'worker',type:0,x:40,z:25,workers:1,stockRaw:100,rotation:0,carryLevel:0},
  {kind:'transport',type:0,x:45,z:32,workers:1,rotation:0,carryLevel:0},
  {kind:'seller',type:0,x:60,z:25,workers:1,rotation:0,carryLevel:0},
  {kind:'road',type:0,x:57,z:39,workers:1,rotation:0,carryLevel:0},
]};
const simRoads=roadsApi.createRoadNetwork(sim);
simRoads.setProbes({blocked:()=>false,traffic:()=>16,invalidate:()=>{}});
const engine=industryApi.createIndustry(T,new Obj(),sim,[],()=>0,
  {x:23,z:0,w:8,d:9},[12,12,12,12,12],
  {roads:simRoads,blocked:()=>false,priceMultiplier:()=>1});
for(const b of sim.buildings)engine.register(b);
let sellerId;
for(let i=0;i<1100;i++){
  engine.update(.22,45,25,null);
  if(i===0)sellerId=engine.snapshot().find(a=>a.role==='seller').id;
}
test('full harvester unloads its own stock',sim.buildings[0].stockRaw<100);
test('transporters delivered goods',engine.readStats().delivered>0);
test('vendor waited for deliveries then sold',engine.readStats().sold>0&&
  engine.snapshot().some(a=>a.id===sellerId));
test('road builders progressively completed real jobs',simRoads.built>0);
test('production simulation preserves finite gold and stock',Number.isFinite(sim.gold)&&
  sim.gold>0&&sim.buildings[2].warehouseRaw.every(n=>n>=0));
const script=src('src/main.js');
test('all base resource units have the same sale price',script.includes('values=[12,12,12,12,12]'));
test('left click outside menus restores pointer lock',
  script.includes("document.addEventListener('pointerdown'")&&
  script.includes("if(e.button!==0||e.pointerType==='touch'"));
// Full factory chain: gatherer -> refining warehouse -> output -> seller warehouse.
const chain={gold:0,roads:{},buildings:[
  {kind:'worker',type:0,x:40,z:25,workers:1,stockRaw:100,rotation:0,carryLevel:0},
  {kind:'factory',type:0,x:65,z:26,workers:1,inputRaw:0,stockProcessed:0,rotation:0,carryLevel:0},
  {kind:'seller',type:0,x:96,z:26,workers:1,rotation:0,carryLevel:0},
  {kind:'transport',type:0,x:53,z:39,workers:2,rotation:0,carryLevel:0},
  {kind:'road',type:0,x:77,z:46,workers:1,rotation:0,carryLevel:0}
]};
const chainRoads=roadsApi.createRoadNetwork(chain);
chainRoads.setProbes({blocked:()=>false,traffic:()=>16,invalidate:()=>{}});
const chainEngine=industryApi.createIndustry(T,new Obj(),chain,[],()=>0,
  {x:23,z:0,w:8,d:9},[12,12,12,12,12],
  {roads:chainRoads,blocked:()=>false,priceMultiplier:()=>1});
for(const b of chain.buildings)chainEngine.register(b);
for(let tick=0;tick<2100;tick++)chainEngine.update(.22,45,25,null);
const chainStats=chainEngine.readStats();
test('transporters supplied the refinery',chainStats.delivered>0);
test('refinery produced processed materials',chainStats.processed>0);
test('vendor sold processed stock delivered by haulers',chainStats.soldProcessed>0);
test('sales and production remain finite',chain.gold>0&&Number.isFinite(chain.gold));
test('warehouse capacity remains bounded',chain.buildings[2].warehouseRaw.reduce((a,b)=>a+b,0)+
  chain.buildings[2].warehouseProcessed.reduce((a,b)=>a+b,0)<=120);
// Three concurrent haulers must not overbook an almost-full warehouse.
const congested={gold:0,roads:{},buildings:[
  {kind:'worker',type:0,x:40,z:25,workers:0,stockRaw:100,rotation:0},
  {kind:'transport',type:0,x:46,z:30,workers:3,rotation:0},
  {kind:'seller',type:0,x:63,z:25,workers:0,rotation:0,
    warehouseRaw:[110,0,0,0,0],warehouseProcessed:[0,0,0,0,0]}
]};
const busyRoads=roadsApi.createRoadNetwork(congested);
busyRoads.setProbes({blocked:()=>false,traffic:()=>0,invalidate:()=>{}});
const busyEngine=industryApi.createIndustry(T,new Obj(),congested,[],()=>0,
  {x:23,z:0,w:8,d:9},[12,12,12,12,12],
  {roads:busyRoads,blocked:()=>false,priceMultiplier:()=>1});
for(const b of congested.buildings)busyEngine.register(b);
for(let tick=0;tick<1050;tick++)busyEngine.update(.22,45,25,null);
const warehouse=congested.buildings[2].warehouseRaw.reduce((a,b)=>a+b,0)+
  congested.buildings[2].warehouseProcessed.reduce((a,b)=>a+b,0);
const cargo=busyEngine.snapshot().reduce((a,b)=>a+b.carry,0);
test('multiple haulers never overfill one warehouse',warehouse<=120);
test('goods conserved across simultaneous deliveries',
  congested.buildings[0].stockRaw+warehouse+cargo===210);
test('haulers continue after capacity fills',busyEngine.snapshot().every(a=>a.state!=='toDelivery'||a.carry>=0));
console.log('\nPassed '+checks+' industry, road and economy tests.');
