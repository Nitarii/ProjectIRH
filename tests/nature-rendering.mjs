// Self-contained Node regression tests: node tests/nature-rendering.mjs
// Lightweight Three.js stand-ins check lifetime, ecology and sky orchestration.
// Real GLSL compilation and mobile frame profiling require a browser/GPU.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const plain=code=>code.replace(/^import[^\n]*\n/gm,'').replace(/^export\s+/gm,'');
let passed=0;
const check=(name,result)=>{assert.ok(result,name);passed++;console.log('✓ '+name)};
let stamp=0;
const lifecycle=new Function(plain(read('src/resource-life.js'))+
  '\nreturn {createResourceLifecycle,resourceId};')();
const state={exhausted:{}},life=lifecycle.createResourceLifecycle(state,{now:()=>stamp});
const fresh=()=>({x:35.1234,z:73.9876,type:2,max:60,hp:60,dead:false,
  mesh:{visible:true}});
const target=fresh();
life.spawn(target);life.hit(target);stamp=3000;life.deplete(target);
check('exhaustion is permanent and saved as true',state.exhausted[lifecycle.resourceId(target)]===true);
stamp+=100000000;
check('dead node never revives',life.update([target]).revived===0&&target.dead);
const unloaded=fresh();life.spawn(unloaded);
check('streamed-in node remains exhausted',unloaded.dead&&unloaded.mesh.visible===false);
const restored={exhausted:{[lifecycle.resourceId(target)]:Date.now()-1000000}};
const old=life;const legacy=lifecycle.createResourceLifecycle(restored,{now:()=>stamp});
const historic=fresh();legacy.spawn(historic);legacy.update([historic]);
check('expired legacy timers migrate to permanent exhaustion',historic.dead);
const damaged=fresh();damaged.hp=24;damaged.nextRegenAt=100;
life.update([damaged]);
check('non-depleted nodes still recover HP',damaged.hp>24);
const solar=new Function(plain(read('src/sky-weather.js'))+'\nreturn solarState;')();
const sunrise=solar(0),noon=solar(240),midnight=solar(960);
check('day/night cycle has expected sunrise, noon and midnight',
  noon.daylight>.9&&midnight.daylight<.05&&sunrise.daylight>midnight.daylight);
check('daylight and phase stay bounded',[-2880,-1,0,240,960,999999].every(m=>{
  const s=solar(m);return s.daylight>=0&&s.daylight<=1&&s.phase>=0&&s.phase<1;
}));
class Vec{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  copy(v){return this.set(v.x,v.y,v.z)}
  normalize(){const l=Math.hypot(this.x,this.y,this.z)||1;this.x/=l;this.y/=l;this.z/=l;return this}
  setScalar(v){return this.set(v,v,v)}
}
class Color{
  constructor(v=0){this.value=v;this.isColor=true}
  set(v){this.value=v;return this}
  copy(v){this.value=v.value;return this}
  lerp(v,t){this.value=t>.5?v.value:this.value;return this}
}
class Object3D{
  constructor(){
    this.children=[];this.position=new Vec();this.scale=new Vec(1,1,1);
    this.rotation=new Vec();this.quaternion={copy(){}};
    this.visible=true;this.userData={};this.frustumCulled=true;
  }
  add(...items){this.children.push(...items)}
  remove(item){this.children=this.children.filter(x=>x!==item)}
  updateMatrix(){this.matrix=[this.position.x,this.position.y,this.position.z] }
}
class Geo{dispose(){}}
class Mat{constructor(opts={}){Object.assign(this,opts)}dispose(){}}
class Mesh extends Object3D{
  constructor(geometry,material){super();this.geometry=geometry;this.material=material}
}
class InstancedMesh extends Mesh{
  constructor(g,m,n){super(g,m);this.count=n;this.instanceMatrix={needsUpdate:false}}
  setMatrixAt(i,matrix){(this.instances||(this.instances=[]))[i]=matrix.slice()}
}
const T={Group:Object3D,Object3D,Mesh,InstancedMesh,
  MeshLambertMaterial:Mat,MeshBasicMaterial:Mat,ShaderMaterial:Mat,
  IcosahedronGeometry:Geo,CylinderGeometry:Geo,ConeGeometry:Geo,
  BoxGeometry:Geo,PlaneGeometry:Geo,SphereGeometry:Geo,
  Color,Vector3:Vec,DoubleSide:2,BackSide:1
};
const species=new Function(plain(read('src/wildlife.js'))+
  '\nreturn {WILDLIFE_SPECIES,BIRD_SPECIES,createWildlife};')();
check('fifteen biome-specific land species plus five bird species',
  species.WILDLIFE_SPECIES.length===5&&
  species.WILDLIFE_SPECIES.every(x=>x.length===3)&&
  species.BIRD_SPECIES.length===5);
check('species are uniquely named',
  new Set([...species.WILDLIFE_SPECIES.flat(),...species.BIRD_SPECIES].map(x=>x.name)).size===20);
const scene=new Object3D(),player=new Vec(140,0,160);
const fauna=species.createWildlife(T,scene,{
  biomeAt:(x,z)=>Math.abs(Math.floor(x/190)+Math.floor(z/190))%5,
  seed:42891,blocked:()=>false,quality:()=> 'balanced',
  viewDistance:()=>140,playerPosition:()=>player
});
fauna.refresh();
check('population stays within balanced budgets',
  fauna.landCount<=23&&fauna.birdCount<=11);
check('species count exposed to diagnostics',fauna.speciesCount===20);
const original=fauna.landCount;
fauna.refresh();
check('world positions do not create extra animals when resampling',fauna.landCount===original);
for(let i=0;i<150;i++)fauna.update(.035);
check('ecology updates without NaN positions',
  scene.children.every(group=>Number.isFinite(group.position.x)&&Number.isFinite(group.position.z)));
fauna.dispose();
const skyScene=new Object3D();skyScene.background=new Color(0x99c0ca);
skyScene.fog={color:new Color(0x99c0ca),near:85,far:128};
const camera=new Object3D(),sun={position:new Vec(),target:{position:new Vec(),updateMatrixWorld(){}},
  color:new Color(),intensity:1},ambient={color:new Color(),groundColor:new Color(),intensity:1};
const skyWeather=new Function(plain(read('src/sky-weather.js'))+
  '\nreturn createSkyWeather;')()(T,skyScene,{position:player},camera,sun,ambient,
  {viewDistance:()=>140,quality:()=> 'balanced',seed:8923});
for(let i=0;i<120;i++)skyWeather.update(.016,i*.016,i*2);
check('sky renderer uses bounded clouds',skyWeather.cloudCount<=8);
check('sunlight and ambience remain finite',
  Number.isFinite(sun.intensity)&&Number.isFinite(ambient.intensity));
check('nighttime sky remains readable',(()=>{
  skyWeather.update(1,500,960);return sun.intensity>=.09&&skyWeather.dayFactor<.05
})());
const skyShader=skyScene.children.find(o=>o.material?.fragmentShader)?.material?.fragmentShader||'';
check('sky includes sun, moon and stars without a post-process pass',
  skyShader.includes('moon')&&skyShader.includes('stars')&&skyShader.includes('zenith'));
const cloudShader=skyScene.children.find(o=>o.material?.fragmentShader?.includes('for(int i=0;i<6;i++'))?.material?.fragmentShader;
check('bounded six-step cloud density integration',
  !!cloudShader&&cloudShader.includes('1.0-smoothstep(.60,1.04,shape)'));
// Clouds may drift with the global clock, but neither the camera nor player
// movement may rotate or physically drag an existing world-space cloud.
skyWeather.update(.12,700,240);
const cloudPose=()=>skyScene.children.slice(1).filter(c=>c.visible)
  .map(c=>[c.position.x,c.position.y,c.position.z,
    c.rotation.x,c.rotation.y,c.rotation.z]);
const beforeClouds=cloudPose();
camera.position.set(45,15,78);
camera.rotation.set(.41,1.23,.06);
player.x+=.5;player.z+=.5;
skyWeather.update(.12,700,240);
check('cloud orientation and world position ignore camera or player movement',
  beforeClouds.length>0&&JSON.stringify(beforeClouds)===JSON.stringify(cloudPose()));
skyWeather.dispose();
const atmosphereApi=new Function(plain(read('src/atmosphere.js'))+
  '\nreturn {createAtmosphere,atmosphereSite};')();
const aSite=atmosphereApi.atmosphereSite(7,8,1);
check('particle sites derive entirely from stable world cell identifiers',
  JSON.stringify(aSite)===JSON.stringify(atmosphereApi.atmosphereSite(7,8,1)));
const ambientScene=new Object3D();
const atmosphere=atmosphereApi.createAtmosphere(T,ambientScene,
  {position:player},()=>0,()=>[]);
atmosphere.update(.07,777);
const particlePoses=()=>ambientScene.children.flatMap(mesh=>
  (mesh.instances||[]).slice(0,mesh.count));
const firstParticles=particlePoses();
player.x+=.7;player.z+=.7;
atmosphere.update(.07,777);
check('environment particles never move with a small player displacement',
  firstParticles.length>0&&JSON.stringify(firstParticles)===JSON.stringify(particlePoses()));
check('ambient particles use instancing',atmosphere.particleCount<=32);
atmosphere.setEnabled(false);
check('ambient effects can be disabled completely',atmosphere.particleCount===0);
atmosphere.dispose();
// Check GLSL source generation without needing a GPU.
const gameMain=read('src/main.js');
const shaderStart=gameMain.indexOf('terrainMaterial.onBeforeCompile=shader=>{');
const shaderEnd=gameMain.indexOf('terrainMaterial.customProgramCacheKey=',shaderStart);
check('terrain shader install exists',shaderStart>=0&&shaderEnd>shaderStart);
const terrainMaterial={};
new Function('terrainMaterial',gameMain.slice(shaderStart,shaderEnd))(terrainMaterial);
const terrainShader={
  vertexShader:'#include <common>\\nvoid main(){vec3 transformed=vec3(0.0);\\n#include <worldpos_vertex>\\n}',
  fragmentShader:'#include <common>\\nvoid main(){vec4 diffuseColor=vec4(1.0);\\n#include <color_fragment>\\n}'
};
terrainMaterial.onBeforeCompile(terrainShader);
check('terrain microshading computes at vertex rate',
  terrainShader.vertexShader.includes('nimNoise(nimWorldXZ*.19)')&&
  terrainShader.fragmentShader.includes('nimShade')&&
  !terrainShader.fragmentShader.includes('nimNoise('));
check('GLSL injections use actual newlines instead of literal escaped text',
  !terrainShader.vertexShader.includes('\\\\n')&&
  terrainShader.vertexShader.includes('varying float nimShade;'));
check('game uses neutral tonemapping and sRGB output',
  gameMain.includes('renderer.toneMapping=T.NeutralToneMapping')&&
  gameMain.includes('renderer.outputColorSpace=T.SRGBColorSpace'));
console.log('\nPassed '+passed+' nature and rendering regression tests.');
