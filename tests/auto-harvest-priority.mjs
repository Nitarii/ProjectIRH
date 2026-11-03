// Run with Node: node tests/auto-harvest-priority.mjs
// Verifies automatic harvesting uses purchased tools as its first selection criterion.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/auto-pilot.js',import.meta.url),'utf8');
const clean=source.replace(/^import[^\n]*\n/gm,'').replace(/^export\s+/gm,'');
let tested=0;
const test=(name,ok)=>{assert.ok(ok,name);tested++;console.log('✓ '+name)};
const fakeRouter=(isBlocked)=>({route:(_from,to)=>isBlocked(to.x,to.z)?null:[to]});
const {rankHarvestNodes,createAutoPilot}=new Function('createRouter',
  clean+';return {rankHarvestNodes,createAutoPilot};')(fakeRouter);
const near={type:0,x:8,z:0,dead:false,log:null};
const medium={type:1,x:16,z:0,dead:false,log:null};
const far={type:2,x:41,z:0,dead:false,log:null};
const anotherFar={type:2,x:25,z:0,dead:false,log:null};
const dead={type:2,x:3,z:0,dead:true,log:null};
const log={type:2,x:3,z:0,dead:false,log:{}};
const beyond={type:2,x:170,z:0,dead:false,log:null};
const pos={x:0,z:0};
const tools=[0,2,4,-1,-1];
const ranked=rankHarvestNodes([near,medium,far,anotherFar,dead,log,beyond],pos,
  type=>tools[type]);
test('best owned tool takes priority even when its nodes are farther away',
  ranked[0]===anotherFar&&ranked[1]===far&&ranked[2]===medium&&ranked[3]===near);
test('same tool tier uses nearest target first',ranked[0]===anotherFar&&ranked[1]===far);
test('exhausted nodes, logs and distant nodes are excluded',
  !ranked.includes(dead)&&!ranked.includes(log)&&!ranked.includes(beyond));
test('without purchased tools, harvest remains distance-based',
  rankHarvestNodes([far,medium,near],pos,()=>-1)[0]===near);
test('unavailable tools rank below purchased tools',
  rankHarvestNodes([near,medium,far],pos,type=>type===2?-1:0)[2]===far);
test('ignored top-priority node lets next eligible one take over',
  rankHarvestNodes([far,medium,near],pos,type=>tools[type],150,node=>node===far)[0]===medium);
test('bad tool values safely become unowned',
  rankHarvestNodes([near,far],pos,type=>type===2?NaN:0)[0]===near);
function setup({
  nodes=[near,medium,far], blocked=()=>false,
  equipment=[0,1,4,-1,-1]
}={}){
  const player={position:{x:0,z:0},rotation:{y:0}};
  const harvested=[];
  const autopilot=createAutoPilot({
    player,blocked,move:(dx,dz)=>{player.position.x+=dx;player.position.z+=dz},
    resources:()=>nodes,count:()=>0,capacity:()=>8,isSelling:()=>false,
    sale:{x:0,z:0},harvest:node=>harvested.push(node),
    isHarvesting:()=>false,sell:()=>{},onChange:()=>{},
    speedMultiplier:()=>.8,terrainSpeed:()=>1,hasRoads:()=>false,
    toolTier:type=>equipment[type]??-1
  });
  autopilot.setEnabled(true);
  autopilot.update(.1);
  return {autopilot,player,harvested,equipment};
}
const priority=setup();
test('actual autopilot selects a distant top-tier node',
  priority.autopilot.target===far);
const fallback=setup({blocked:(x,z)=>x>22});
test('autopilot falls back to an accessible lower-tier node',
  fallback.autopilot.target===medium);
const equal=setup({equipment:[2,2,2,-1,-1]});
test('actual autopilot prefers nearer nodes with equally strong tools',
  equal.autopilot.target===near);
const upgradable=setup({equipment:[0,1,1,-1,-1]});
test('live tool levels affect the first auto plan',
  upgradable.autopilot.target===medium);
upgradable.equipment[2]=4;
upgradable.autopilot.setEnabled(false);
upgradable.autopilot.setEnabled(true);
upgradable.autopilot.update(.1);
test('newly purchased tool is considered on the next plan',
  upgradable.autopilot.target===far);
console.log('\nPassed '+tested+' automatic-harvesting tool-priority tests.');
