// Run: node tests/visual-mobile-performance.mjs
// Validate 3D batching, mobile wake lock and the new gameplay configuration.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const plain=s=>s.replace(/^import[^\n]*\n/gm,'').replace(/^export\s+/gm,'');
let passed=0;
const check=(name,condition)=>{assert.ok(condition,name);passed++;console.log('✓ '+name)};
const main=read('src/main.js'),industry=read('src/industry.js'),
  markup=read('index.html'),css=read('assets/ui.css'),roadLogic=read('src/road-network.js');
check('resource nodes are substantially more durable',main.includes('const hp=[340,440,520,300,360][type];'));
check('road works maximum two workers including loaded saves',
  industry.includes("b.kind==='road'?2:employeeLimit")&&
  industry.includes("workerLimit:b=>b?.kind==='road'?2:employeeLimit"));
check('road construction and upgrade animations take more time',
  roadLogic.includes("task.mode==='build'?10.5:task.mode==='upgrade'?18.0:7.5"));
check('per-building personnel cards and upgrade compartments',
  main.includes('class="facility-management')&&main.includes('class="facility-upgrade-grid')&&
  css.includes('.facility-management-heading')&&css.includes('.facility-upgrade-grid'));
check('road workshop hiring guard uses per-building cap',
  main.includes('workers>=industry.workerLimit(st.buildings[i])'));
check('bike touch button is conditional on purchase',
  main.includes("mobileVehicleButton?.classList.toggle('hidden',!available)"));
check('fullscreen control present on mobile and desktop',
  markup.includes('id="fullscreenButton"')&&main.includes("createScreenImmersion("));
check('pickaxes have physical pointed heads',
  main.includes('sharpened +X pick point')&&main.includes('tip.rotation.z=-Math.PI/2')&&
  industry.includes('const tip=part(new T.ConeGeometry(.11,.36,5)'));
check('pickaxe points toward the node during impact',
  main.includes('heavy?-.23:-Math.PI/2')&&
  industry.includes('v.tool.rotation.y=type===1?-Math.PI/2:0'));
check('decor casts real directional shadows near camera without global caster overload',
  main.includes("quality==='high'||batch.kind!==4")&&
  main.includes('refreshDecorationShadows(dt)'));
check('minimap expensive raster rows are spread across several frames',
  main.includes('function stepMinimapRaster()')&&
  main.includes("Math.min(36,job.row+5)"));
check('encrypted periodic autosaves use browser idle time',
  main.includes("requestIdleCallback(write,{timeout:1700})")&&
  main.includes("addEventListener('pagehide',save)"));
const solar=new Function(plain(read('src/sky-weather.js'))+';return solarState;')();
check('sun at noon and moon at midnight',
  solar(240).altitude>.9&&solar(960).altitude<-.9);
check('astronomical shadow direction follows sun and moon',
  read('src/sky-weather.js').includes('const facing=solar.altitude<0?-1:1;')&&
  read('src/sky-weather.js').includes('sunDir.x*95*facing'));
class XYZ{
  constructor(){this.x=0;this.y=0;this.z=0}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
}
class Node{
  constructor(){this.position=new XYZ();this.rotation=new XYZ();this.scale=new XYZ();
    this.children=[];this.instanceMatrix={needsUpdate:false};this.visible=true;}
  add(o){this.children.push(o)}
  remove(o){this.children=this.children.filter(v=>v!==o)}
  updateMatrix(){this.matrix=[this.position.x,this.position.y,this.position.z,...[this.scale.x,this.scale.z]]}
}
class Geometry{rotateX(){}dispose(){}}
class Material{constructor(o){Object.assign(this,o)}dispose(){}}
class InstancedMesh extends Node{
  constructor(geo,mat,max){super();this.geometry=geo;this.material=mat;this.count=0;this.max=max;this.instances=[]}
  setMatrixAt(i,m){assert.ok(i<this.max,'instancing exceeds GPU buffer');this.instances[i]=m.slice()}
}
const T={PlaneGeometry:Geometry,MeshLambertMaterial:Material,
  MeshBasicMaterial:Material,InstancedMesh,Object3D:Node};
const makeSurface=new Function('T',plain(read('src/road-surface.js'))+
  ';return createRoadSurfaces;')(T);
const scene=new Node(),player={position:{x:0,z:0}};
const roadNetwork={revision:1,data:{
  '0,0':{l:1,p:0},'1,0':{l:2,p:0},'2,0':{l:2,p:0}
}};
const visual=makeSurface(T,scene,roadNetwork,player,{viewDistance:()=>128,quality:()=> 'high'});
visual.update(.1);
check('road surfaces use five reusable instanced draw batches',scene.children.length===5&&
  scene.children.every(m=>m instanceof InstancedMesh));
const probe={vertexShader:'#include <common>\\n#include <begin_vertex>',
  fragmentShader:'#include <common>\\n#include <alphatest_fragment>'};
scene.children[1].material.onBeforeCompile(probe);
check('road surface GLSL includes smoothly tapered corners and correct position UV',
  probe.vertexShader.includes('roadUv=position.xz+vec2(.5)')&&
  probe.fragmentShader.includes('smoothstep(.81,1.0,edge)'));
check('dirt and paved road stages have visibly separate surfaces',
  scene.children[1].count===1&&scene.children[2].count===2);
check('wide road shoulders and refined markings render',
  scene.children[0].count===3&&scene.children[3].count>0);
const before=scene.children[0].instances[0].slice();
player.position.x=.5;
visual.update(.1);
check('road tiles remain stationary when player moves',
  JSON.stringify(before)===JSON.stringify(scene.children[0].instances[0]));
roadNetwork.data['2,0'].l=0;roadNetwork.revision++;visual.update(.1);
check('removed road tile disappears from instanced rendering',
  visual.visibleTiles===2);
visual.dispose();
check('road batches release their scene objects',scene.children.length===0);
const immersion=new Function(plain(read('src/screen-immersive.js'))+
  ';return createScreenImmersion;')();
const domListeners={};let acquired=0,released=0,fullscreenRequests=0;
const doc={visibilityState:'visible',fullscreenElement:null,
  documentElement:{requestFullscreen(){fullscreenRequests++;doc.fullscreenElement=doc.documentElement;domListeners.fullscreenchange?.();return Promise.resolve()}},
  exitFullscreen(){doc.fullscreenElement=null;domListeners.fullscreenchange?.();return Promise.resolve()},
  addEventListener(k,fn){domListeners[k]=fn}};
const button={textContent:'',title:'',data:{},addEventListener(k,fn){this[k]=fn},
  setAttribute(k,v){this.data[k]=v}};
const mobileNavigator={wakeLock:{request(){acquired++;return Promise.resolve({
  released:false,release(){released++;this.released=true;return Promise.resolve()},
  addEventListener(){} })}}};
const controller=immersion({document:doc,navigator:mobileNavigator,button,
  root:doc.documentElement,isMobile:()=>true});
controller.start();
await Promise.resolve();await Promise.resolve();
check('mobile game requests native Screen Wake Lock while playing',
  acquired===1&&controller.awake);
await controller.toggleFullscreen();
check('fullscreen request works from its button controller',fullscreenRequests===1&&controller.fullscreen);
doc.visibilityState='hidden';domListeners.visibilitychange();
await Promise.resolve();await Promise.resolve();
check('wake lock is released when tab becomes hidden',released===1&&!controller.awake);
doc.visibilityState='visible';domListeners.visibilitychange();
await Promise.resolve();await Promise.resolve();
check('wake lock is reacquired on mobile when game becomes visible again',acquired===2);
controller.stop();
await Promise.resolve();await Promise.resolve();
check('screen lock is released when game stops',released===2);
console.log('\nPassed '+passed+' rendering, mobile, economy and performance tests.');
