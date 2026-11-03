// node tests/ai-clearance.mjs
// Geometry-only navigation regression after employee phasing and added buffer.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
let count=0;const check=(name,v)=>{assert.ok(v,name);count++;console.log('✓ '+name)};
const routeFactory=new Function(read('src/navigation.js').replace(/^export\s+/gm,'')+
  '\nreturn createRouter;')();
const industry=read('src/industry.js');
check('no human collision system',!industry.includes('humanBlocked('));
check('no costly people grid',!industry.includes('refreshAgentIndex(')&&!industry.includes('agentCells'));
check('static geometry clearance applied to A*',industry.includes('staticBlocked(x,z,.59)'));
check('static geometry clearance applied to movement',industry.includes('staticBlocked(nx,nz,.59)'));
check('static geometry clearance applied to sidesteps',industry.includes('staticBlocked(x,z,.59,a.target)'));
const obstruction=(x,z,r=.59)=>Math.abs(x-15)<2.7+r&&Math.abs(z)<5+r;
const route=routeFactory((x,z)=>obstruction(x,z,.59),
  {cell:1.15,maxVisits:2500}).route({x:0,z:0},{x:30,z:0});
check('route navigates around solid rectangular building',Array.isArray(route)&&route.length>1);
let safe=true,last={x:0,z:0},distance=0;
if(route)for(const point of route){
  const length=Math.hypot(point.x-last.x,point.z-last.z);
  distance+=length;
  for(let i=1,n=Math.ceil(length/.13);i<=n;i++){
    const t=i/n;
    if(obstruction(last.x+(point.x-last.x)*t,last.z+(point.z-last.z)*t,.59))safe=false;
  }
  last=point;
}
check('all route segments clear physical margin, not only waypoints',safe);
check('reasonable detour does not become a loop',distance<48);
const routeB=routeFactory(()=>false,{cell:1.15,maxVisits:1550})
  .route({x:0,z:0},{x:45,z:0});
check('open corridors resolve without unnecessary pathfinding',routeB?.length===1);
const game=read('src/main.js');
check('linear fog ends before view distance',game.includes('new T.Fog(')&&
  game.includes('scene.fog.near=value*.71;scene.fog.far=value*.96;'));
check('wildlife and sky integrate with game updates',game.includes('wildlife.update(dt)')&&
  game.includes('skyWeather.update(dt,elapsed,st.gameMinutes)'));
check('ambient swaying vegetation uses instanced meshes',
  read('src/atmosphere.js').includes('new T.InstancedMesh('));
check('soft terrain shading anchored in world coordinates',
  game.includes('terrainMaterial.onBeforeCompile=shader=>')&&game.includes('nimWorldXZ'));
console.log('\nPassed '+count+' static geometry and integration tests.');
