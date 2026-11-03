// node tests/night-roads-autosell.mjs
// Deterministic logic + headless 3D scene simulations. No browser or GPU needed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const code=source=>source.replace(/^import[^\n]*\n/gm,'').replace(/^export\s+/gm,'');
const load=(file,names,dependencies={})=>
  new Function(...Object.keys(dependencies),code(read(file))+';return {'+names.join(',')+'};')(...Object.values(dependencies));
let tested=0;
const test=(name,ok)=>{assert.ok(ok,name);tested++;console.log('✓ '+name)};
const router={createRouter:()=>({route:(from,to)=>[{x:to.x,z:to.z}]})};
const layout={worldPoint:(b,x,z)=>({x:b.x+x,z:b.z+z})};
const network=load('src/road-network.js',['createRoadNetwork'],{...router,...layout});
const lights=load('src/night-lighting.js',['createNightLighting','roadLampSites'],layout);
const auto=load('src/auto-pilot.js',['createAutoPilot'],router);
const roadsState={gameMinutes:0,roads:{}};
const road=network.createRoadNetwork(roadsState);
road.setProbes({blocked:()=>false,traffic:()=>30,invalidate:()=>{}});
const buildings=[{kind:'road',id:'r1',x:85,z:0,rotation:0}];
road.rebuild(buildings,{x:0,z:0});
test('worksite planning creates road tiles',road.plannedCount>=18);
let guard=0;
while(road.completed<road.plannedCount&&guard++<500){
  const job=road.claim('builder',{x:47,z:0});
  assert.ok(job,'missing build job');
  assert.equal(road.work('builder',job,4),'done');
}
test('paths are built progressively',road.completed===road.plannedCount&&road.built>0);
let job=road.claim('builder',{x:47,z:0});
test('paved road upgrade is available once paths are in place',job?.mode==='upgrade');
assert.equal(road.work('builder',job,6),'done');
test('paved roads have +50% speed',road.levelAt(job.x,job.z)===2&&road.speedAt(job.x,job.z)===1.5);
const first=Object.keys(roadsState.roads).find(k=>roadsState.roads[k]?.l===1);
const [ix,iz]=first.split(',').map(Number);
road.update(299);
test('unused roads stay in place before 300 seconds',!roadsState.roads[first].retired);
road.recordUse('player',(ix+.5)*3,(iz+.5)*3,299);
road.update(301);
test('road recently traversed by a player is not retired',!roadsState.roads[first].retired);
const abandoned=Object.keys(roadsState.roads).filter(k=>roadsState.roads[k]?.retired);
test('trails unused for 5 minutes become demolition candidates',abandoned.length>0);
const chosen=road.claim('demolisher',{x:job.x,z:job.z});
test('road crew chooses retired tiles for demolition',chosen?.mode==='demolish');
const oldStage=road.levelAt(chosen.x,chosen.z);
assert.equal(road.work('demolisher',chosen,4),'done');
test('unused paved road is first downgraded to a path',oldStage===2?
  road.levelAt(chosen.x,chosen.z)===1:road.levelAt(chosen.x,chosen.z)===0);
if(oldStage===2){
  const again=road.claim('demolisher',{x:chosen.x,z:chosen.z});
  assert.ok(again?.mode==='demolish'&&again.key===chosen.key);
  assert.equal(road.work('demolisher',again,4),'done');
}
test('final demolition removes the speed bonus',road.speedAt(chosen.x,chosen.z)===1);
test('demolition tombstone prevents automatic reconstruction',
  roadsState.roads[chosen.key]?.retired===true&&roadsState.roads[chosen.key]?.l===0);
const oldBuilt=road.built;
road.rebuild(buildings,{x:0,z:0});
const possible=road.claim('newBuilder',{x:chosen.x,z:chosen.z});
test('retired segment is not offered as new construction',possible?.key!==chosen.key);
const disk=JSON.parse(JSON.stringify(roadsState));
const loaded=network.createRoadNetwork(disk);
loaded.setProbes({blocked:()=>false,traffic:()=>30,invalidate:()=>{}});
loaded.rebuild(buildings,{x:0,z:0});
test('retirement persists through save and reload',loaded.data[chosen.key]?.retired===true);
const samples=lights.roadLampSites(road.data,{x:45,z:0},135,100);
test('constructed roads receive periodic edge lamp positions',samples.length>0);
const point={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;return this}};
class Position{
  constructor(){this.x=0;this.y=0;this.z=0}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
}
class MockNode{
  constructor(){this.children=[];this.position=new Position();this.rotation=new Position();
    this.scale=new Position();this.visible=true;this.castShadow=false;this.receiveShadow=false;
    this.instanceMatrix={needsUpdate:false}}
  add(x){this.children.push(x)}
  remove(x){this.children=this.children.filter(a=>a!==x)}
  updateMatrix(){this.matrix=[this.position.x,this.position.y,this.position.z]}
}
class Geometry{dispose(){}}
class Material{constructor(options={}){Object.assign(this,options);this.emissiveIntensity=options.emissiveIntensity||0}dispose(){}}
class Mesh extends MockNode{constructor(geo,mat){super();this.geometry=geo;this.material=mat}}
class InstancedMesh extends Mesh{
  constructor(geo,mat,max){super(geo,mat);this.count=0;this.maxCount=max;this.instances=[]}
  setMatrixAt(i,m){this.instances[i]=m.slice()}
}
class PointLight extends MockNode{
  constructor(color,intensity,distance,decay){super();this.intensity=intensity;this.distance=distance;this.decay=decay}
}
const T={Object3D:MockNode,InstancedMesh,PointLight,MeshLambertMaterial:Material,
  MeshBasicMaterial:Material,CylinderGeometry:Geometry,SphereGeometry:Geometry,
  BoxGeometry:Geometry,AdditiveBlending:2};
const scene=new MockNode(),player={position:{x:45,z:0}};
const lightSystem=lights.createNightLighting(T,scene,{
  buildings:()=>buildings,roads:road,player,viewDistance:()=>135,
  quality:()=> 'balanced',isBlocked:()=>false
});
lightSystem.update(.2,1);
test('light fixtures exist on buildings and roads in daytime',lightSystem.count>=2&&lightSystem.roadsLit>0);
test('daytime illumination is off',lightSystem.activeLights===0);
for(let i=0;i<30;i++)lightSystem.update(.1,0);
test('night lighting fades in smoothly',lightSystem.nightFactor>.9&&lightSystem.activeLights>0);
test('real nighttime point lights are capped for performance',
  lightSystem.activeLights<=5&&scene.children.filter(x=>x instanceof PointLight).length===8);
test('night lights use no shadow maps',scene.children.filter(x=>x instanceof PointLight).every(x=>!x.castShadow));
lightSystem.dispose();
let bag=7,harvesting=true,cancelled=0,sold=0;
const avatar={position:{x:128,z:0},rotation:{y:0}};
const navigator=auto.createAutoPilot({
  player:avatar,blocked:()=>false,resources:()=>[{x:130,z:0,type:0,dead:false}],
  count:()=>bag,capacity:()=>8,isSelling:(x,z)=>Math.abs(x-23)<=4&&Math.abs(z)<=4.5,
  sale:{x:23,z:0},isHarvesting:()=>harvesting,cancelHarvest:()=>{harvesting=false;cancelled++},
  harvest:()=>{harvesting=true},sell:()=>{bag=0;sold++},onChange:()=>{},
  move:(dx,dz)=>{avatar.position.x+=dx;avatar.position.z+=dz}
});
navigator.setEnabled(true);
navigator.update(.1);
test('auto harvesting can be underway with a partly full bag',harvesting);
bag=8;
navigator.update(.1);
test('full bag interrupts the harvest state immediately',!harvesting&&cancelled===1);
test('full bag causes immediate travel away from the node',avatar.position.x<128);
for(let i=0;i<800&&sold===0;i++)navigator.update(.1);
test('even distant full bags reach the market and are sold',sold===1&&bag===0);
test('sale never discards inventory without entering the market',avatar.position.x<=27);
// Use production A* through an actual blocking building; ensure the real
// obstacle-aware navigator can reach the market from a full bag.
const actualRouter=load('src/navigation.js',['createRouter']).createRouter;
const realAuto=load('src/auto-pilot.js',['createAutoPilot'],{createRouter:actualRouter}).createAutoPilot;
let fullBag=8,stillHarvesting=true,realSales=0,realCancels=0;
const realPlayer={position:{x:125,z:0},rotation:{y:0}};
const wall=(x,z)=>x>74&&x<83&&Math.abs(z)<5;
const realPilot=realAuto({
  player:realPlayer,blocked:wall,resources:()=>[],count:()=>fullBag,capacity:()=>8,
  isSelling:(x,z)=>x>=19&&x<=27&&Math.abs(z)<=4.5,
  sale:{x:23,z:0},isHarvesting:()=>stillHarvesting,
  cancelHarvest:()=>{stillHarvesting=false;realCancels++},
  harvest:()=>{},sell:()=>{fullBag=0;realSales++},onChange:()=>{},
  move:(dx,dz)=>{
    if(!wall(realPlayer.position.x+dx,realPlayer.position.z))realPlayer.position.x+=dx;
    if(!wall(realPlayer.position.x,realPlayer.position.z+dz))realPlayer.position.z+=dz;
  }
});
realPilot.setEnabled(true);
for(let i=0;i<1200&&realSales===0;i++)realPilot.update(.1);
test('real A* navigator sells a full bag past a building obstacle',
  realCancels===1&&realSales===1&&fullBag===0&&realPlayer.position.x<=27);
console.log('\nPassed '+tested+' nighttime, road abandonment and auto-sell tests.');
