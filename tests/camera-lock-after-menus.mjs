// Run: node tests/camera-lock-after-menus.mjs
// Checks camera lock state after closing modal UI, without needing WebGL.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const mapSource=readFileSync(new URL('../src/exploration-map.js',import.meta.url),'utf8');
const extract=(start,end)=>{
  const a=main.indexOf(start),b=main.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Code snippet missing: '+start);
  return main.slice(a,b);
};
const controllerSource=extract('function resumeCameraControl(){','function renderPanel(){');
const closeSource=extract('const close=()=>{',"$('close').onclick=close;");
const lockSource=extract("document.addEventListener('pointerlockchange',()=>{",
  '// A left click in the gameplay canvas always restores camera mouse control.');
let passed=0;const check=(title,value)=>{assert.ok(value,title);passed++;console.log('✓ '+title)};
function rig(){
  const bodyClasses=new Set(['mouse-free']);
  const document={
    pointerLockElement:null,
    body:{classList:{
      add:v=>bodyClasses.add(v),remove:v=>bodyClasses.delete(v),
      contains:v=>bodyClasses.has(v)
    }},
    addEventListener(type,fn){if(type==='pointerlockchange')this.lockChange=fn},
    exitPointerLock(){this.pointerLockElement=null;this.lockChange?.()}
  };
  const game={requestPointerLock(){
    requests++;
    // Simulate an asynchronous browser request. Some unlock events may arrive
    // while the browser is still processing a menu-closing lock request.
    return Promise.resolve().then(()=>{document.pointerLockElement=game;document.lockChange?.()});
  }};
  let requests=0;
  const welcome={classList:{contains:()=>true}},creator={classList:{contains:()=>true}};
  const elements={welcome,creator};
  const $=name=>elements[name]||{classList:{contains:()=>true}};
  const renderer={domElement:game},exploration={visible:false};
  const touchControls={enabled:false,clear(){}};
  const sound={effect(){}};
  let renderCalls=0;
  const renderPanel=()=>{renderCalls++};
  const code='let panel=null,mouseFree=true,cameraRecoveryRequested=false,'+
    'keys={},activeStorage={buildingId:1};'+controllerSource+closeSource+lockSource+
    ';return {resumeCameraControl,openPanel,close,get(){return {panel,mouseFree,cameraRecoveryRequested,requests:getRequests(),renderCalls:getRenders(),activeStorage,keys,freeClass:document.body.classList.contains("mouse-free"),locked:document.pointerLockElement===renderer.domElement}},setPanel(v){panel=v},setMouseFree(v){mouseFree=v},setMap(v){exploration.visible=v},simulateLateUnlock(){document.pointerLockElement=null;document.lockChange?.()}};';
  return new Function('document','renderer','exploration','touchControls','sound','$','renderPanel','getRequests','getRenders',code)(
    document,renderer,exploration,touchControls,sound,$,renderPanel,()=>requests,()=>renderCalls);
}
const app=rig();
app.openPanel('settings');
check('opening a menu does not immediately capture the camera',app.get().panel==='settings'&&app.get().requests===0);
app.close();
check('closing settings immediately leaves free cursor mode',
  app.get().mouseFree===false&&!app.get().freeClass&&app.get().requests===1);
app.simulateLateUnlock();
check('late unlock notification cannot undo camera recovery',
  app.get().cameraRecoveryRequested&&!app.get().mouseFree&&!app.get().freeClass);
await Promise.resolve();
check('camera lock reactivates after browser confirms pointer lock',
  app.get().locked&&!app.get().cameraRecoveryRequested&&!app.get().mouseFree);
app.openPanel('storage');
app.close();
await Promise.resolve();
check('storage closure clears storage context and restores lock',
  app.get().locked&&app.get().activeStorage===null);
app.openPanel('market');
app.openPanel('market');
await Promise.resolve();
check('toggling the same menu closes it and locks camera',!app.get().panel&&app.get().locked);
app.setMap(true);app.resumeCameraControl();
check('while a map is open, camera lock is never requested',
  app.get().requests===3);
app.setMap(false);app.resumeCameraControl();
await Promise.resolve();
check('map closure restores camera default',app.get().locked&&!app.get().mouseFree);
const elements=Object.fromEntries(['worldMapClose','worldMapZoomIn','worldMapZoomOut',
  'worldMapCenter','worldMapCoords'].map(id=>[id,{textContent:'',onclick:null}]));
const ctx={fillRect(){},beginPath(){},arc(){},fill(){},stroke(){},fillText(){}};
const canvas={width:240,height:180,getContext:()=>ctx,addEventListener(){}};
const fakeDoc={getElementById:id=>elements[id]};
const mapFactory=new Function('document',mapSource.replace(/^export\s+/gm,'')+
  ';return createExplorationMap;')(fakeDoc);
let mapClosed=0;
const map=mapFactory({
  canvas,overlay:{classList:{toggle(){}}},player:{position:{x:0,z:0}},
  biome:()=>0,buildings:()=>[],agents:()=>[],onClose:()=>{mapClosed++}
});
map.setVisible(true);
elements.worldMapClose.onclick();
check('clicking the world-map X button invokes the camera-restoration callback',
  mapClosed===1&&!map.visible);
map.setVisible(true);map.setVisible(false);
check('keyboard and programmatic map closure invoke the same callback',mapClosed===2);
map.setVisible(false);
check('repeated map close does not retrigger camera locking',mapClosed===2);
check('avatar and building placement transitions also restore camera control',
  main.includes("panel=null;renderPanel();resumeCameraControl();")&&
  main.includes("  resumeCameraControl();\n}\nfunction closeAvatarBuilder()"));
console.log('\nPassed '+passed+' camera capture/menu closure tests.');
