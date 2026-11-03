import * as T from 'three';
import {createSound} from './sound.js?v=20261103r';
import {createAtmosphere} from './atmosphere.js?v=20261103r';
import {createIndustry} from './industry.js?v=20261103r';
import {inventoryIcon} from './item-icons.js?v=20261103k';
import {createResourceGraphics} from './resource-visuals.js?v=20261103n';
import {createFieldBuilder} from './wheat-fields.js?v=20261103k';
import {makeStructure} from './structures.js?v=20261103r';
import {EQUIPMENT,EQUIPMENT_FR,TOOL_SPEED,TOOL_YIELD,ECONOMY,toolCost,buildingCost,workerCarryCost} from './balance.js';
import {loadSettings,storeSettings,keyLabel,isPressed,applyQuality,ACTIONS} from './settings.js';
import {tr,translateTree,UI} from './language.js';
import {createBaseCamp} from './basecamp.js';
import {optionsMarkup} from './options-ui.js';
const $=id=>document.getElementById(id), scene=new T.Scene();scene.background=new T.Color('#a6cbd1');scene.fog=new T.FogExp2('#a6cbd1',.007);
const cam=new T.PerspectiveCamera(65,innerWidth/innerHeight,.1,450),renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=true;$('game').append(renderer.domElement);
scene.add(new T.HemisphereLight(0xffffff,0x657449,2.4));const sun=new T.DirectionalLight(0xffe7bc,2.3);sun.position.set(70,95,40);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0004;sun.shadow.normalBias=.024;sun.shadow.radius=2;sun.shadow.camera.left=-60;sun.shadow.camera.right=60;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;scene.add(sun);
const M=c=>new T.MeshLambertMaterial({color:c}),m={grass:M(0x658b55),forest:M(0x3a784e),mountain:M(0x858b83),mine:M(0x94775c),desert:M(0xd7bd7d),field:M(0xb2b75e),tree:M(0x845b35),leaf:M(0x388653),rock:M(0x888e90),ore:M(0x709fad),wheat:M(0xebbb53),skin:M(0xe8b997),shirt:M(0x275c70),wood:M(0xac7852),roof:M(0x965e46),gold:M(0xffd068)};
function cube(w,h,d,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.BoxGeometry(w,h,d),mat);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;return q}function orb(r,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.IcosahedronGeometry(r,1),mat);q.position.set(x,y,z);q.castShadow=true;return q}function cy(r,h,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.CylinderGeometry(r,r,h,8),mat);q.position.set(x,y,z);q.castShadow=true;return q}
const types=['FORÊT','MONTAGNE','EXCAVATION','DÉSERT','CHAMPS'],raw=['Bois','Pierre','Minerai','Sable','Blé'],processed=['Planches','Pierre taillée','Lingots','Verre','Farine'],tools=EQUIPMENT_FR,worksites=['Cabane de bûcheron','Carrière','Mine','Camp de terrassiers','Ferme'],factories=['Scierie','Atelier de taille','Fonderie','Verrerie','Moulin'],prices=[100,120,150,100,100],values=[12,15,22,10,14],colors=['#488756','#87938b','#b88f6b','#e3c67c','#c8b64e'];
let defaultState={gold:100,bag:8,inv:[0,0,0,0,0],products:[0,0,0,0,0],tools:[-1,-1,-1,-1,-1],talents:[0,0,0,0,0],buildings:[],stock:[],truck:false,cart:false,staminaLevel:0,gameMinutes:0,x:0,z:9,seed:7331};let st={...defaultState};
const settings=loadSettings();let awaitingBinding=null;let observedGold=st.gold,goldHideAt=0;try{let a=JSON.parse(localStorage.getItem('irh-state')||'{}');for(let k in defaultState)if(a[k]!==undefined)st[k]=a[k]}catch{}observedGold=st.gold;const save=()=>{st.x=player.position.x;st.z=player.position.z;
const cleanBuildings=st.buildings.map(b=>({
id:b.id,kind:b.kind,type:b.type,x:b.x,z:b.z,workers:b.workers,carryLevel:b.carryLevel,
stock:b.stock,stockRaw:b.stockRaw,inputRaw:b.inputRaw,stockProcessed:b.stockProcessed,progress:b.progress
}));
try{localStorage.setItem('irh-state',JSON.stringify({...st,buildings:cleanBuildings}))}catch(e){console.warn('Storage unavailable',e)}
};

const player=new T.Group(),avatar=new T.Group();player.add(avatar);
avatar.add(cy(.42,1.12,m.shirt,0,1.4,0),orb(.35,m.skin,0,2.15,.04));
avatar.add(cube(.1,.055,.08,M(0x312b27),-.14,2.18,.35),cube(.1,.055,.08,M(0x312b27),.14,2.18,.35));
function limb(x,y,len,thick){const g=new T.Group();g.position.set(x,y,0);g.add(cube(thick,len,thick,m.shirt,0,-len/2,0));avatar.add(g);return g}
const leftLeg=limb(-.23,.88,.86,.26),rightLeg=limb(.23,.88,.86,.26);
const leftArm=limb(-.53,1.82,.78,.22),rightArm=limb(.53,1.82,.78,.22);
leftArm.add(orb(.12,m.skin,0,-.78,0));rightArm.add(orb(.12,m.skin,0,-.78,0));
const toolHolder=new T.Group();toolHolder.position.set(0,-.76,.08);rightArm.add(toolHolder);
const toolModels=[];
for(let type=0;type<5;type++){
  const variants=[];
  for(let tier=0;tier<5;tier++){
    const g=new T.Group(),metal=tier>=3?m.ore:m.rock;
    const shaft=cy(tier>=3?.065:.045,.62+tier*.08,tier>=3?m.shirt:m.wood,0,-.33,0);
    g.add(shaft);
    if(type===0){
      if(tier<3)g.add(cube(.36+tier*.15,.20+tier*.025,.12,metal,.12,-.65,0));
      else {g.add(cube(.82,.25,.22,m.shirt,0,-.7,0),cube(.68,.11,.06,metal,.33,-.85,0))}
    }else if(type===1){
      if(tier<3)g.add(cube(.65+tier*.12,.19,.16,metal,0,-.65,0));
      else {g.add(cube(.72,.4,.32,m.shirt,0,-.62,0),cy(.09,.4,metal,0,-.9,0))}
    }else if(type===2){
      if(tier<2)g.add(cube(.65,.18,.18,metal,0,-.64,0));
      else {g.add(cy(.19+tier*.03,.58,m.shirt,0,-.56,0),cy(.075,.52,metal,0,-.92,0))}
    }else if(type===3){
      if(tier<2)g.add(cube(.30,.43,.09,metal,0,-.78,0));
      else {g.add(cy(.15+tier*.02,.40,m.shirt,0,-.58,0),cube(.35,.23,.13,metal,0,-.91,0))}
    }else{
      if(tier<3)g.add(cube(.50+tier*.16,.12,.10,metal,.17,-.65,0),cube(.10,.27,.1,metal,.40,-.78,0));
      else {g.add(cube(.72,.29,.30,m.shirt,.15,-.72,0),cube(.82,.075,.11,metal,.27,-.85,0))}
    }
    g.visible=false;toolHolder.add(g);variants.push(g);
  }
  toolModels.push(variants);
}
const cargo=new T.Group();avatar.add(cargo);const cargoPieces=[];let cargoSignature='';
function cargoObject(type){const g=new T.Group(),kind=type%5;
if(kind===0){for(let k=-1;k<=1;k++){const log=cy(.13,.55,m.tree,k*.18,0,0);log.rotation.z=Math.PI/2;g.add(log)}}
if(kind===1)g.add(orb(.3,m.rock),orb(.17,m.rock,.17,.13,-.08));
if(kind===2)g.add(orb(.3,m.ore),cube(.2,.4,.2,type>=5?m.gold:m.ore,.1,.12,-.12));
if(kind===3)g.add(orb(.28,m.desert),orb(.17,m.desert,-.2,-.05,0));
if(kind===4)for(let i=-1;i<=1;i++)g.add(cy(.035,.53,m.wheat,i*.14,0,0),orb(.12,m.wheat,i*.14,.28,0));
return g}
function updateCargo(){
let items=[];for(let t=0;t<5;t++)for(let i=0;i<st.inv[t];i++)items.push(t);
for(let t=0;t<5;t++)for(let i=0;i<st.products[t];i++)items.push(t+5);
items=items.slice(0,st.bag);const signature=st.bag+':'+items.join(',');if(signature===cargoSignature)return;cargoSignature=signature;
for(let i=0;i<Math.max(items.length,cargoPieces.length);i++){
const type=items[i],old=cargoPieces[i];
if(type===undefined){if(old){cargo.remove(old.mesh);old.mesh.traverse(o=>o.geometry?.dispose());cargoPieces[i]=null}continue}
if(!old||old.type!==type){if(old){cargo.remove(old.mesh);old.mesh.traverse(o=>o.geometry?.dispose())}
const mesh=cargoObject(type);cargo.add(mesh);cargoPieces[i]={type,mesh}}
const g=cargoPieces[i].mesh;g.position.set((i%4-1.5)*.28,1.07+Math.floor(i/4)*.31,-.51);g.rotation.z=i%2?.1:-.1
}}
scene.add(player);player.position.set(st.x,0,st.z);player.rotation.y=Math.PI;updateCargo();


const market=new T.Group();market.add(cube(5,2.5,4,m.wood,0,1.25,0),cube(5.6,.7,4.7,m.roof,0,2.8,0),cube(1.1,1.6,.1,m.shirt,0,.85,2.05));market.position.set(0,0,0);scene.add(market);

const SALE={x:10,z:1,w:10,d:9};
const isSelling=(x,z)=>Math.abs(x-SALE.x)<=SALE.w/2&&Math.abs(z-SALE.z)<=SALE.d/2;
const sellPad=new T.Group();
sellPad.add(cube(SALE.w,.1,SALE.d,M(0x497e5e),0,.035,0));
const trim=M(0xf3be60);
for(const edge of [-1,1]){
sellPad.add(cube(SALE.w,.12,.14,trim,0,.10,edge*SALE.d/2));
sellPad.add(cube(.14,.12,SALE.d,trim,edge*SALE.w/2,.10,0));
}
sellPad.position.set(SALE.x,0,SALE.z);scene.add(sellPad);

const signCanvas=document.createElement('canvas');
signCanvas.width=640;signCanvas.height=180;
const signCtx=signCanvas.getContext('2d');
signCtx.clearRect(0,0,640,180);
signCtx.font='900 106px system-ui';
signCtx.textAlign='center';signCtx.textBaseline='middle';
signCtx.lineJoin='round';signCtx.lineWidth=11;signCtx.strokeStyle='rgba(10,28,25,.78)';
signCtx.strokeText('VENDRE',320,93);
signCtx.fillStyle='#f5d88a';signCtx.fillText(settings.language==='fr'?'VENDRE':'SELL',320,93);
const saleLabel=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(signCanvas),transparent:true,depthWrite:false,alphaTest:.03}));
saleLabel.scale.set(7.2,2.03,1);
saleLabel.position.set(SALE.x,6.3,SALE.z);scene.add(saleLabel);


const world=new Map(),resources=[],CH=32;let R=settings.quality==='low'?1:2;const hash=(x,z,s=0)=>{let n=Math.sin(x*127.1+z*311.7+s*51.6)*43758.5453;return n-Math.floor(n)},blend=t=>t*t*(3-2*t);function noise(x,z,k,s){let a=Math.floor(x/k),b=Math.floor(z/k),u=blend(x/k-a),v=blend(z/k-b);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b,s),hash(a+1,b,s),u),T.MathUtils.lerp(hash(a,b+1,s),hash(a+1,b+1,s),u),v)}
function biome(x,z){
if(Math.hypot(x,z)<22)return -1;
if(Math.hypot(x-34,z)<76)return 0;
const size=290,cx=Math.floor(x/size),cz=Math.floor(z/size);
let nearest=Infinity,selected=0;
for(let ix=-1;ix<=1;ix++)for(let iz=-1;iz<=1;iz++){
const gx=cx+ix,gz=cz+iz;
const centerX=(gx+.5+(hash(gx,gz,27)-.5)*.6)*size;
const centerZ=(gz+.5+(hash(gx,gz,28)-.5)*.6)*size;
const d=(x-centerX)**2+(z-centerZ)**2;
if(d<nearest){nearest=d;selected=Math.floor(hash(gx,gz,35)*5)}
}
return selected;
}
const resourceGraphics=createResourceGraphics(T);
const buildWheatField=createFieldBuilder(T,biome,hash);
function node(type,x,z,key){
const variant=Math.floor(hash(Math.floor(x*3),Math.floor(z*3),66)*4);
const g=resourceGraphics.createNode(type,variant,x+z*3);
g.position.set(x,0,z);
scene.add(g);
const hp=[40,50,60,30,30][type];
const obj={type,x,z,mesh:g,hp,max:hp,key,dead:false,variant};
resources.push(obj);return obj;
}

const floorGeometry=new T.BoxGeometry(4.08,.16,4.08);
const accentGeometry=new T.IcosahedronGeometry(.19,0);
const weedGeometry=new T.ConeGeometry(.16,.62,3);
const stalkGeometry=new T.CylinderGeometry(.04,.055,.75,4);
const cactusGeometry=new T.CylinderGeometry(.14,.2,1.13,6);
const decorMaterials=[M(0x87916f),M(0x54754a),M(0xaf9675),M(0x5e9d67),M(0xd2ae63),M(0x5d8661)];
const dummy=new T.Object3D();
function decorations(cx,cz,root){
const items=[[],[],[],[],[],[]],x0=cx*CH,z0=cz*CH;
for(let n=0;n<38;n++){
const x=x0+.7+hash(cx*71+n,cz,44)*30.6,z=z0+.7+hash(cx,cz*73+n,45)*30.6;
if(Math.hypot(x,z)<23||isSelling(x,z))continue;
const b=biome(x,z),h=hash(cx+n,cz-n,46);
let kind=0;
if(b===0)kind=h<.58?1:h<.83?5:0;
if(b===1)kind=h<.75?0:2;
if(b===2)kind=h<.65?2:0;
if(b===3)kind=h<.6?3:2;
if(b===4)kind=h<.72?4:5;
if(b===-1)kind=h<.55?1:0;
items[kind].push({x,z,scale:.55+hash(cx+n,cz+n,49)*1.5,turn:hash(cx+n,cz,48)*6.28})
}
items.forEach((batch,i)=>{
if(!batch.length)return;
const geo=i===0||i===2?accentGeometry:i===3?cactusGeometry:i===4?stalkGeometry:weedGeometry;
const mesh=new T.InstancedMesh(geo,decorMaterials[i],batch.length);
mesh.receiveShadow=true;mesh.castShadow=false;
batch.forEach((obj,j)=>{dummy.position.set(obj.x,i===4?.4:i===3?obj.scale*.55:obj.scale*.14,obj.z);
dummy.rotation.set(0,obj.turn,0);dummy.scale.set(obj.scale,obj.scale*(i===4?1.3:1),obj.scale);
dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix)});
mesh.instanceMatrix.needsUpdate=true;root.add(mesh)
})
}
function chunk(cx,cz){
const key=cx+','+cz;if(world.has(key))return;
const root=new T.Group(),nodes=[];
const x0=cx*CH,z0=cz*CH;
// Smooth vertex-colored terrain, continuous across streaming chunk borders.
const groundGeometry=new T.PlaneGeometry(CH,CH,8,8);
groundGeometry.rotateX(-Math.PI/2);
const vertexColors=[];
const basePalette=['#527751','#477c55','#858b84','#826e59','#dec28b','#adb66a'];
const baseColor=(x,z)=>{
  const b=biome(x,z);
  const color=new T.Color(basePalette[b<0?0:b+1]);
  const variation=.91+noise(x,z,18,63)*.17+noise(x,z,5,88)*.08;
  return color.multiplyScalar(variation);
};
const positions=groundGeometry.attributes.position;
for(let i=0;i<positions.count;i++){
  const x=x0+CH/2+positions.getX(i),z=z0+CH/2+positions.getZ(i);
  const color=baseColor(x,z);
  vertexColors.push(color.r,color.g,color.b);
}
groundGeometry.setAttribute('color',new T.Float32BufferAttribute(vertexColors,3));
const floor=new T.Mesh(groundGeometry,new T.MeshLambertMaterial({vertexColors:true}));
floor.position.set(x0+CH/2,-.025,z0+CH/2);
floor.rotation.y=0;floor.receiveShadow=true;
root.add(floor);
decorations(cx,cz,root);buildWheatField(cx,cz,root);scene.add(root);
world.set(key,{root,nodes,hasNodes:false})
}
function populate(cx,cz,c){
if(c.hasNodes)return;c.hasNodes=true;
const x0=cx*CH,z0=cz*CH,key=cx+','+cz;
for(let i=0;i<13;i++){
const x=x0+2+hash(cx*17+i,cz,2)*28,z=z0+2+hash(cx,cz*17+i,3)*28;
if(Math.hypot(x,z)<23||isSelling(x,z)||Math.hypot(x-10,z-1)<8)continue;
const b=biome(x,z);if(b<0)continue;
const o=node(b,x,z,key);c.nodes.push(o);
}
}
const generationQueue=[],queuedGeneration=new Set(),unloadQueue=[];
let streamingCenter='';
function stream(){
const cx=Math.floor(player.position.x/CH),cz=Math.floor(player.position.z/CH);
const center=cx+','+cz;
if(streamingCenter===center)return;
streamingCenter=center;
generationQueue.length=0;queuedGeneration.clear();
const coords=[];
for(let x=cx-R;x<=cx+R;x++)for(let z=cz-R;z<=cz+R;z++){
const key=x+','+z;
if(!world.has(key))coords.push({x,z,d:(x-cx)**2+(z-cz)**2,key});
}
coords.sort((a,b)=>a.d-b.d);
for(const item of coords){generationQueue.push(item);queuedGeneration.add(item.key)}
for(const [key,c] of world){
const [x,z]=key.split(',').map(Number);
if(Math.abs(x-cx)>R||Math.abs(z-cz)>R)unloadQueue.push(key)
}
}
function pumpWorld(){
const cx=Math.floor(player.position.x/CH),cz=Math.floor(player.position.z/CH);
if(generationQueue.length){
const next=generationQueue.shift();queuedGeneration.delete(next.key);
if(Math.abs(next.x-cx)<=R&&Math.abs(next.z-cz)<=R&&!world.has(next.key))chunk(next.x,next.z);
}
let populated=0;
for(let radius=0;radius<=1&&populated<1;radius++){
for(let x=cx-radius;x<=cx+radius&&populated<1;x++)for(let z=cz-radius;z<=cz+radius&&populated<1;z++){
const c=world.get(x+','+z);
if(c&&!c.hasNodes){populate(x,z,c);populated++}
}
}
if(unloadQueue.length){
const key=unloadQueue.shift(),c=world.get(key);
if(c){
const [x,z]=key.split(',').map(Number);
if(Math.abs(x-cx)>R||Math.abs(z-cz)>R){
scene.remove(c.root);
c.root.traverse(o=>{if(o.isInstancedMesh)o.dispose();else if(o===c.root.children[0]&&o.geometry)o.geometry.dispose()});
for(const n of c.nodes){
scene.remove(n.mesh);
n.mesh.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
const index=resources.indexOf(n);if(index>=0)resources.splice(index,1);
}
world.delete(key)
}
}
}
}
function updateResourceVisibility(){
const px=player.position.x,pz=player.position.z,maximum=53*53;
for(const o of resources)o.mesh.visible=!o.dead&&(o.x-px)**2+(o.z-pz)**2<maximum;
}
const count=()=>st.inv.reduce((a,b)=>a+b,0)+st.products.reduce((a,b)=>a+b,0);
let heading=0,pitch=.38,dist=10,active=0,keys={},current=null,placing=null,carried=null,elapsed=0,workerClock=0;
let buildingPreview=null,previewMaterials=[],lastPlacementValid=null;
let harvesting=null,harvestProgress=0,stepPhase=0;
const sound=createSound();const atmosphere=createAtmosphere(T,scene,player,biome);
const baseCamp=createBaseCamp(T,scene);
atmosphere.setEnabled(settings.effects&&settings.quality!=='low');
sound.setVolume(settings.volume);
sound.setEnabled(!settings.muted);
applyQuality(renderer,sun,settings.quality);
let audioActive=true,atmosphereActive=true;
const maxStamina=()=>100+Math.max(0,st.staminaLevel||0)*32;
const staminaRegen=()=>16+Math.max(0,st.staminaLevel||0)*4;
let stamina=maxStamina(),sprintLocked=false,footstepTimer=0;
const PLAYER_RADIUS=.43;
function blocked(x,z){
const box=(bx,bz,w,d)=>Math.abs(x-bx)<w/2+PLAYER_RADIUS&&Math.abs(z-bz)<d/2+PLAYER_RADIUS;
if(box(0,0,5,4))return true;
for(const b of st.buildings)if(box(b.x,b.z,3.5,3.3))return true;
for(const o of resources){if(o.dead)continue;const r=[.78,1.1,1.05,.88,.65][o.type]+PLAYER_RADIUS;if((x-o.x)**2+(z-o.z)**2<r*r)return true}
return false;
}
function movePlayer(dx,dz){const x=player.position.x,z=player.position.z;
// Separate-axis checks permit natural sliding without passing through solid objects.
if(!blocked(x+dx,z))player.position.x=x+dx;
if(!blocked(player.position.x,z+dz))player.position.z=z+dz;
}
const stopHarvest=()=>{harvesting=null;harvestProgress=0};
const harvestInterval=type=>([1.00,1.10,1.08,.94,.86][type])*TOOL_SPEED[Math.max(0,Math.min(5,st.tools[type]+1))];
function animatePlayer(dt,moving){
stepPhase+=dt*(moving?12:2.1);
const stride=moving?Math.sin(stepPhase)*.63:0;
leftLeg.rotation.x=T.MathUtils.damp(leftLeg.rotation.x,stride,13,dt);
rightLeg.rotation.x=T.MathUtils.damp(rightLeg.rotation.x,-stride,13,dt);
avatar.position.y=T.MathUtils.damp(avatar.position.y,moving?Math.abs(Math.sin(stepPhase))*.08:0,12,dt);
for(const variants of toolModels)for(const model of variants)model.visible=false;
if(harvesting){
const type=harvesting.type,tier=st.tools[type],interval=harvestInterval(type);
const phase=Math.min(1,harvestProgress/Math.max(.15,interval));
const lift=Math.sin(phase*Math.PI)**2,impact=Math.sin(phase*Math.PI*2);
const heavy=tier>=3,mechanical=tier>=2&&(type===2||type===3||type===4);
const toolPattern=[
  [[.55,1.15,.16],[.7,1.34,.19],[.92,1.58,.23],[.27,.6,.11],[.12,.3,.08]],
  [[.67,.9,.13],[.82,1.1,.16],[.94,1.3,.20],[.21,.4,.08],[.11,.24,.07]],
  [[.6,.83,.12],[.76,1.05,.16],[.32,.44,.11],[.16,.24,.08],[.09,.12,.05]],
  [[.52,.7,.15],[.72,.95,.18],[.78,1.08,.20],[.25,.44,.10],[.12,.21,.06]],
  [[.64,.80,.18],[.86,.95,.2],[.99,1.12,.22],[.30,.51,.12],[.16,.25,.08]]
][type][Math.max(0,Math.min(4,tier))];
const effort=toolPattern[0],reach=toolPattern[1],shake=toolPattern[2];
const stroke=Math.sin(phase*Math.PI*2)*shake;
const swing=lift*effort;
const pose=(arm,x,y,z)=>{arm.rotation.x=T.MathUtils.damp(arm.rotation.x,x,18,dt);arm.rotation.y=T.MathUtils.damp(arm.rotation.y,y,18,dt);arm.rotation.z=T.MathUtils.damp(arm.rotation.z,z,18,dt)};
if(tier<0){
  // Fists: slow, low-impact alternating close-range strikes.
  pose(rightArm,-.85-.65*lift,0,-.2);
  pose(leftArm,-.85+.4*lift,0,.18);
  avatar.rotation.x=.07*impact;avatar.rotation.z=.04*impact;
  toolHolder.rotation.set(0,0,0);
}else{
  toolModels[type][tier].visible=true;
  if(type===0){
    // Axe / saw: tool sweeps forward and down toward the trunk.
    pose(rightArm,heavy?-1.2-stroke:-.90-reach*swing,.05*stroke,-.16);
    pose(leftArm,heavy?-1.15:-.70-.5*lift,0,.12);
    toolHolder.rotation.set(heavy?-.62+stroke:-.9+(.40+effort*.25)*lift,0,stroke*.7);
    avatar.rotation.x=.045*impact;avatar.rotation.z=-.09*lift;
  }else if(type===1){
    pose(rightArm,heavy?-1.25+stroke:-1.00-reach*swing,0,-.2-stroke*.3);
    pose(leftArm,-.7-.6*lift,0,-.26);
    toolHolder.rotation.set(heavy?-.8:-.75+.36*lift,0,0);
    avatar.rotation.x=.1*impact;
  }else if(type===2){
    pose(rightArm,mechanical?-1.42+stroke:-.94-reach*swing,.06,-.1);
    pose(leftArm,mechanical?-1.37:-.7,0,.12);
    toolHolder.rotation.set(mechanical?-1.1+.06*impact:-.8+.24*lift,0,.03*impact);
    avatar.rotation.x=mechanical?.07:.10*impact;
  }else if(type===3){
    pose(rightArm,heavy?-1.0+stroke:-.55-reach*swing,0,-.17);
    pose(leftArm,heavy?-.9:-.7-.35*lift,0,.15);
    toolHolder.rotation.set(heavy?-.6:-.8-.27*lift,0,0);
    avatar.rotation.x=.14+.05*impact;
  }else{
    pose(rightArm,heavy?-1.1+stroke:-.72,heavy?stroke*.8:reach*impact,-.38+effort*.2*impact);
    pose(leftArm,-.55,0,-.20);
    toolHolder.rotation.set(-.88,0,.30*impact);
    avatar.rotation.y=.15*impact;avatar.rotation.x=.04;
  }
}
}else{
const smooth=v=>T.MathUtils.damp(v,0,12,dt);
avatar.rotation.set(smooth(avatar.rotation.x),smooth(avatar.rotation.y),smooth(avatar.rotation.z));
rightArm.rotation.set(T.MathUtils.damp(rightArm.rotation.x,moving?stride*.6:0,13,dt),smooth(rightArm.rotation.y),smooth(rightArm.rotation.z));
leftArm.rotation.set(T.MathUtils.damp(leftArm.rotation.x,moving?-stride*.6:0,13,dt),smooth(leftArm.rotation.y),smooth(leftArm.rotation.z));
toolHolder.rotation.set(smooth(toolHolder.rotation.x),smooth(toolHolder.rotation.y),smooth(toolHolder.rotation.z));
}
cargo.rotation.z=moving?Math.sin(stepPhase)*.04:0;
}
function updateInventory(){
const grid=$('inventoryGrid');if(!grid)return;
const items=[];for(let i=0;i<5;i++)for(let j=0;j<st.inv[i];j++)items.push(i);
for(let i=0;i<5;i++)for(let j=0;j<st.products[i];j++)items.push(i+5);
const signature=st.bag+':'+items.join(',');if(grid.dataset.signature===signature)return;grid.dataset.signature=signature;
grid.innerHTML=Array.from({length:st.bag},(_,i)=>{
const type=items[i],title=type===undefined?'':tr(type<5?raw[type]:processed[type-5],settings.language);
return '<div class="inventory-slot'+(type===undefined?' empty':'')+'"'+(type===undefined?'':' title="'+title+'"')+'>'+
(type===undefined?'':'<span class="inventory-symbol resource-'+(type%5)+'">'+inventoryIcon(type)+'</span>')+'</div>';
}).join('');
$('inventoryCapacity').textContent=count()+' / '+st.bag;updateCargo()
}function pop(s){let e=$('notice');e.textContent=tr(s,settings.language);e.classList.add('show');clearTimeout(pop.t);pop.t=setTimeout(()=>e.classList.remove('show'),2200)}
function closest(){
let best=null,score=Infinity,px=player.position.x,pz=player.position.z;
const fx=Math.sin(player.rotation.y),fz=Math.cos(player.rotation.y);
for(const o of resources){
if(o.dead)continue;
const dx=o.x-px,dz=o.z-pz,d=Math.hypot(dx,dz);
if(d>3.8)continue;
const dot=(dx*fx+dz*fz)/Math.max(.01,d);
const quality=d+(dot<.1?1.2:dot<.5?.4:0);
if(quality<score){score=quality;best=o}
}
for(const b of st.buildings){
const d=Math.hypot(px-b.x,pz-b.z);
if(d<3.9&&d<score){score=d;best=b}
}
return best
}

function sell({notifyEmpty=true,includeCarried=isSelling(player.position.x,player.position.z)}={}){
  stopHarvest();
  const bagValue=st.inv.reduce((sum,n,i)=>sum+n*values[i],0);
  const productValue=st.products.reduce((sum,n,i)=>sum+n*values[i]*3,0);
  const oldStorage=st.stock.reduce((sum,i)=>sum+(i===0?65:values[i]*4),0);
  const logValue=includeCarried&&carried?65:0;
  const amount=bagValue+productValue+oldStorage+logValue;
  if(amount<=0){if(notifyEmpty)pop('Aucune marchandise à vendre');return 0}
  st.inv.fill(0);st.products.fill(0);st.stock=[];
  if(logValue){scene.remove(carried);carried=null}
  st.gold+=amount;sound.effect('sale');
  pop('Vendu · +'+amount+' or');
  updateInventory();save();
  if(panel)renderPanel();
  return amount;
}
function collectSaleZone(){
  if(!isSelling(player.position.x,player.position.z)||panel||placing)return;
  // Independent trader buildings cannot consume player inventory.
  if(st.buildings.some(b=>b.kind==='seller'&&Math.abs(player.position.x-b.x)<2.2&&Math.abs(player.position.z-b.z)<2.2))return;
  const available=st.inv.some(Boolean)||st.products.some(Boolean)||st.stock.length>0||!!carried;
  if(available)sell({notifyEmpty:false,includeCarried:true});
}


function strikeHarvest(){
const o=harvesting;
if(!o||o.dead||!resources.includes(o)||Math.hypot(player.position.x-o.x,player.position.z-o.z)>3.5){stopHarvest();return}
if(count()>=st.bag){stopHarvest();pop('Inventaire plein');return}

const power=TOOL_YIELD[Math.max(0,Math.min(5,st.tools[o.type]+1))];
o.hp=Math.max(0,o.hp-power);sound.effect(o.type);
const gained=Math.min(power,st.bag-count());st.inv[o.type]+=gained;
if(o.hp<=0){
o.dead=true;scene.remove(o.mesh);stopHarvest();
if(o.type===0){
const log=new T.Group(),trunk=cy(.36,3.2,m.tree);trunk.rotation.z=Math.PI/2;log.add(trunk);
log.position.set(o.x,.42,o.z);scene.add(log);o.log=log;
pop('Arbre abattu · F pour porter le tronc')
}else pop(raw[o.type]+' épuisé');
setTimeout(()=>{
if(!world.has(o.key))return;
o.dead=false;o.hp=o.max;scene.add(o.mesh);
if(o.log&&!carried)scene.remove(o.log)
},240000)
}
updateInventory();save()
}

function placementPoint(){
  return {
    x:Math.round(player.position.x+Math.sin(player.rotation.y)*6),
    z:Math.round(player.position.z+Math.cos(player.rotation.y)*6)
  };
}
function placementAllowed(x,z){
  if(Math.hypot(x,z)<12)return false;
  if(Math.abs(x-SALE.x)<SALE.w/2+3&&Math.abs(z-SALE.z)<SALE.d/2+3)return false;
  if(st.buildings.some(b=>Math.abs(b.x-x)<5.5&&Math.abs(b.z-z)<5.3))return false;
  if(resources.some(o=>!o.dead&&Math.hypot(o.x-x,o.z-z)<4))return false;
  return true;
}
function clearPlacementPreview(){
  if(!buildingPreview)return;
  scene.remove(buildingPreview.group);
  buildingPreview.group.traverse(o=>{
    if(!o.isMesh)return;
    if(o.material&&o.userData.previewMaterial)o.material.dispose();
    if(o.geometry)o.geometry.dispose();
  });
  buildingPreview=null;previewMaterials=[];lastPlacementValid=null;
}
function buildPlacementPreview(){
  clearPlacementPreview();
  if(!placing)return;
  const info={kind:placing.kind,type:placing.type,x:0,z:0};
  buildingPreview=makeStructure(T,scene,info);
  buildingPreview.group.traverse(o=>{
    if(!o.isMesh)return;
    o.material=o.material.clone();
    o.material.transparent=true;o.material.opacity=.46;
    o.material.depthWrite=false;o.castShadow=false;
    o.userData.previewMaterial=true;
    previewMaterials.push(o.material);
  });
}
function beginPlacement(kind,type,cost){
  if(placing)cancelPlacement();
  const biomeType=['worker','factory'].includes(kind)?type:Math.max(0,biome(player.position.x,player.position.z));
  placing={kind,type:biomeType,cost};
  panel=null;renderPanel();
  $('placementName').textContent=kind==='worker'?worksites[type]:kind==='factory'?factories[type]:
    kind==='transport'?'Dépôt de transport':'Comptoir vendeur';
  $('placementHud').classList.remove('hidden');
  buildPlacementPreview();
  pop('Choisissez un emplacement puis appuyez sur F');
}
function cancelPlacement(refund=true){
  if(!placing)return;
  if(refund){st.gold+=placing.cost||0;save();pop('Construction annulée · or remboursé')}
  placing=null;
  $('placementHud').classList.add('hidden');
  clearPlacementPreview();
}
function placementFrame(){
  if(!placing||!buildingPreview)return;
  const point=placementPoint();
  const type=['worker','factory'].includes(placing.kind)?placing.type:Math.max(0,biome(point.x,point.z));
  if(type!==placing.type){
    placing.type=type;
    buildPlacementPreview();
  }
  placing.x=point.x;placing.z=point.z;
  buildingPreview.group.position.set(point.x,0,point.z);
  buildingPreview.group.visible=!panel;
  const valid=placementAllowed(point.x,point.z);
  if(valid!==lastPlacementValid){
    for(const mat of previewMaterials){mat.color.setHex(valid?0x79e6bc:0xf27b78)}
    lastPlacementValid=valid;
    $('placementStatus').textContent=tr(valid?'EMPLACEMENT DISPONIBLE':'EMPLACEMENT BLOQUÉ',settings.language);
    $('placementHud').classList.toggle('invalid',!valid);
  }
}

function harvest(){
if(panel)return;
if(placing){
const {x,z}=placementPoint();
if(!placementAllowed(x,z))return pop('Emplacement indisponible');
st.buildings.push({kind:placing.kind,type:placing.type,x,z,workers:0,stock:0,stockRaw:0,inputRaw:0,stockProcessed:0});
addBuilding(st.buildings.at(-1));
cancelPlacement(false);
sound.effect('build');pop('Bâtiment construit');save();return;
}
if(carried){drop();return}
const o=closest();if(!o)return;
if(o.kind){
stopHarvest();
if(o.kind==='factory'){
const n=Math.min(5,st.inv[o.type],industry.capacity-o.inputRaw);
if(n>0){st.inv[o.type]-=n;o.inputRaw+=n;pop(n+' '+raw[o.type]+' livré(s) à '+factories[o.type])}
else if(o.stockProcessed>0){
const take=Math.min(5,o.stockProcessed,st.bag-count());
if(!take)return pop('Inventaire plein');
o.stockProcessed-=take;st.products[o.type]+=take;pop(take+' '+processed[o.type]+' récupéré(s)')
}
else if(o.inputRaw>0&&o.workers===0){
o.inputRaw--;o.stockProcessed++;pop('Une unité transformée manuellement')
}else pop('Atelier vide · achetez des employés ou déposez des ressources');
}
else if(o.kind==='worker'){
const n=Math.min(o.stockRaw,st.bag-count());
if(!n)return pop(o.stockRaw?'Inventaire plein':'Aucun stock disponible');
o.stockRaw-=n;st.inv[o.type]+=n;pop(n+' '+raw[o.type]+' récupéré(s)')
}
else if(o.kind==='seller')pop('Le comptoir vend uniquement les ressources de ses employés.');
else if(o.kind==='transport')pop('Transporteurs : '+o.workers);
updateInventory();save();return
}

if(count()>=st.bag)return pop('Inventaire plein');
if(harvesting===o){stopHarvest();return}
harvesting=o;harvestProgress=0;player.rotation.y=Math.atan2(o.x-player.position.x,o.z-player.position.z);pop('Récolte en cours · Déplacez-vous pour arrêter')
}


function drop(){
  if(!carried)return;
  if(isSelling(player.position.x,player.position.z)){
    sell({notifyEmpty:false,includeCarried:true});return;
  }
  sound.effect('step');
  carried.position.set(player.position.x,0.47,player.position.z);
  const item=carried;
  const src=resources.find(o=>o.dead&&!o.log&&Math.hypot(o.x-player.position.x,o.z-player.position.z)<20);
  if(src)src.log=item;
  else scene.remove(item);
  carried=null;
  pop('Tronc déposé');save();
}
function interact(){
  if(panel)return;
  if(placing)return harvest();
  if(isSelling(player.position.x,player.position.z)){
    collectSaleZone();return;
  }
  const px=player.position.x,pz=player.position.z;
  const fallen=resources.find(n=>n.log&&n.dead&&Math.hypot(n.log.position.x-px,n.log.position.z-pz)<3.2);
  if(!carried&&fallen){
    stopHarvest();sound.effect('ui');
    carried=fallen.log;fallen.log=null;
    pop('Transportez le tronc vers la zone VENDRE');return;
  }
  if(carried)return drop();
  if(Math.hypot(px,pz)<7)return openPanel('market');
  harvest();
}


function buy(cost,fn){if(st.gold<cost){sound.effect('exhausted');return pop('Or insuffisant')}st.gold-=cost;sound.effect('buy');fn();updateInventory();save();renderPanel()}
const industry=createIndustry(T,scene,st,resources,biome,SALE,values,{
onSale(amount){save()}
});
function addBuilding(b){return industry.register(b)}
st.buildings.forEach(addBuilding);

const panels={market:'COMPTOIR',build:'CONSTRUCTION',talents:'PROGRESSION',inventory:'INVENTAIRE',settings:'PARAMÈTRES'};
let panel=null;
const labels=['BOIS','PIERRE','MINERAI','SABLE','BLÉ'];
const biomeIcons=['♧','◆','◈','◒','✺'];
const add=(title,sub,cost,action,off=false,biomeId=-1)=>`<article class="shop-card ${biomeId>=0?'biome-'+biomeId:''}">
<div class="shop-card-head"><span class="item-icon">${biomeId>=0?biomeIcons[biomeId]:'✦'}</span><div><strong>${title}</strong><small>${sub}</small></div></div>
<button data-action="${action}" ${off?'disabled':''}>${cost}</button></article>`;
const section=(title,kicker,content)=>`<section class="catalog-section"><div class="catalog-heading"><h3>${title}</h3><span>${kicker}</span></div><div class="catalog-grid">${content}</div></section>`;
function openPanel(k){stopHarvest();sound.effect('ui');panel=panel===k?null:k;renderPanel();if(panel)document.exitPointerLock?.()}
function renderPanel(){
const box=$('panel');box.classList.toggle('hidden',!panel);if(!panel)return;
$('panelTitle').textContent=panel==='settings'?UI[settings.language].settings:tr(panels[panel],settings.language);
$('panelTag').textContent='FRONTIER CAPITAL';
$('tabs').innerHTML=(panel==='settings'?['settings']:['market','build','talents','inventory']).map(k=>'<button data-tab="'+k+'" '+(panel===k?'class="active"':'')+'>'+tr(panels[k],settings.language)+'</button>').join(' ');
$('resume').textContent=UI[settings.language].back;
if(panel==='settings'){
  $('shopbody').innerHTML=optionsMarkup(settings,awaitingBinding);
  $('panelhint').textContent=UI[settings.language].lowHint;
  return;
}
let out='';
if(panel==='market'){
let group='';for(let i=0;i<5;i++){
const tier=st.tools[i]+1;if(tier>=5)continue;
const cost=toolCost(i,tier);
group+=add(settings.language==='en'?EQUIPMENT[i][tier]:tools[i][tier],types[i]+' · Palier '+(tier+1)+' / 5',cost+' OR','tool:'+i,false,i);
}
out+=section('Outils & récolte','CINQ INDUSTRIES',group||'<p class="catalog-empty">Tous les outils sont au niveau maximum.</p>');
const level=st.staminaLevel||0;
let utility='';
if(st.bag===8)utility+=add('Capacité de stockage','8 → 16 emplacements',ECONOMY.bag+' OR','bag');
if(level<4)utility+=add('Condition physique','Endurance '+maxStamina()+' → '+(maxStamina()+32),ECONOMY.stamina[level]+' OR','stamina');
if(!st.cart)utility+=add('Chariot utilitaire','Transport de petites charges',ECONOMY.cart+' OR','cart');
if(!st.truck)utility+=add('Camion de ressources','Grand volume de transport',ECONOMY.truck+' OR','truck');
out+=section('Équipement','CONSERVATION & MOBILITÉ',utility||'<p class="catalog-empty">Équipement entièrement amélioré.</p>');
out+=section('Comptoir','TRANSACTIONS',add('Vendre le chargement','Inventaire et zone de vente','VENDRE','sell'));
}
if(panel==='build'){
for(let i=0;i<5;i++){
out+=section(types[i]+' · '+raw[i].toUpperCase(),'CHAÎNE DE PRODUCTION',add(worksites[i],'Collecte automatique · stockage',buildingCost('worker',i)+' OR','worker:'+i,false,i)+add(factories[i],raw[i]+' → '+processed[i],buildingCost('factory',i)+' OR','factory:'+i,false,i));
}
out+=section('Logistique','TRANSPORT & COMMERCE',add('Dépôt de transport','Déplacements des ressources',buildingCost('transport')+' OR','transport:0')+add('Comptoir vendeur','Vente automatisée',buildingCost('seller')+' OR','seller:0'));
if(st.buildings.length)out+=section('Personnel','RECRUTEMENT',st.buildings.map((b,i)=>{
const title=(b.kind==='worker'?worksites[b.type]:b.kind==='factory'?factories[b.type]:b.kind==='seller'?'Comptoir vendeur':'Dépôt transport')+' #'+(i+1);
const stock=b.kind==='worker'?'Brut : '+b.stockRaw
:b.kind==='factory'?'Entrée : '+b.inputRaw+' · Transformé : '+b.stockProcessed
:'Logistique automatisée';
return add(title,'Employés : '+b.workers+'/'+industry.limit+' · '+stock,b.workers>=industry.limit?'MAX':ECONOMY.hire+' OR','hire:'+i,b.workers>=industry.limit,b.type)
+add(UI[settings.language].capacity,'Niveau '+(b.carryLevel||0)+'/5 · '+(2+2*(b.carryLevel||0))+' / '+(6+3*(b.carryLevel||0)),
(b.carryLevel||0)>=5?'MAX':workerCarryCost(b.carryLevel||0)+' OR','carry:'+i,(b.carryLevel||0)>=5,b.type)
}).join(''));
}
if(panel==='talents'){
const level=st.staminaLevel||0;
out+=section('Endurance & sprint','PERFORMANCES',level<4?add('Endurance '+(level+1),'Réserve '+maxStamina()+' → '+(maxStamina()+32)+' · récupération +4/s',ECONOMY.stamina[level]+' OR','stamina'):add('Endurance MAX','Capacité maximale atteinte','MAX','noop',true));
out+=section('Expertise des métiers','SPÉCIALISATIONS',types.map((name,i)=>add(name+' · Palier '+st.talents[i],'+10 % à la valeur de vente (développement)',ECONOMY.talent+' OR','talent:'+i,false,i)).join(''));
}
if(panel==='inventory'){
out+=section('Contenu transporté',count()+' / '+st.bag+' EMPLACEMENTS',types.map((name,i)=>add(raw[i],st.inv[i]+' unité(s) · '+processed[i]+' : '+st.products[i],values[i]+' / unité','noop',true,i)).join(''));
out+=section('Stock en dépôt','ZONE DE VENTE',add('Marchandises à vendre',st.stock.length+' tronc(s) enregistré(s)','VENDRE','sell'));
}
$('shopbody').innerHTML=out;translateTree($('shopbody'),settings.language);
$('panelhint').textContent=tr(st.gold.toLocaleString(settings.language==='fr'?'fr-FR':'en-US')+' pièces d’or',settings.language);
}
$('panel').onclick=e=>{
const button=e.target.closest('button');if(!button)return;
if(button.dataset.bind){awaitingBinding=button.dataset.bind;renderPanel();return}
if(button.dataset.tab){sound.effect('ui');panel=button.dataset.tab;return renderPanel()}
const a=button.dataset.action;if(!a)return;
if(a==='sell')return sell();
if(a==='bag')return buy(ECONOMY.bag,()=>st.bag=16);
if(a==='stamina')return buy(ECONOMY.stamina[st.staminaLevel||0]||Infinity,()=>{st.staminaLevel=(st.staminaLevel||0)+1;stamina=maxStamina()});
if(a==='cart')return buy(ECONOMY.cart,()=>st.cart=true);
if(a==='truck')return buy(ECONOMY.truck,()=>st.truck=true);
const [kind,id]=a.split(':'),i=+id;
if(kind==='tool'){
  const tier=st.tools[i]+1;
  if(tier>=5)return;
  return buy(toolCost(i,tier),()=>st.tools[i]=tier);
}
if(kind==='hire'){
  if(st.buildings[i].workers>=industry.limit)return pop('Maximum employees reached');
  return buy(ECONOMY.hire,()=>{st.buildings[i].workers++;industry.sync()});
}
if(kind==='carry'){
  const building=st.buildings[i];
  if(!building||(building.carryLevel||0)>=5)return;
  return buy(workerCarryCost(building.carryLevel||0),()=>{building.carryLevel=(building.carryLevel||0)+1;industry.sync()});
}
if(kind==='talent')return buy(ECONOMY.talent,()=>st.talents[i]++);
if(['factory','worker','transport','seller'].includes(kind)){
  const price=buildingCost(kind,i);
  return buy(price,()=>beginPlacement(kind,i,price));
}
};
$('panel').oninput=e=>{
if(e.target.id==='settingVolume'){
  settings.volume=Number(e.target.value)/100;
  sound.setVolume(settings.volume);
  $('volumeLabel').textContent=Math.round(settings.volume*100)+'%';
  storeSettings(settings);
}};
$('panel').onchange=e=>{
const id=e.target.id;
if(id==='settingAudio')settings.muted=!e.target.checked;
else if(id==='settingQuality'){
  settings.quality=e.target.value;
  R=settings.quality==='low'?1:2;streamingCenter='';
  applyQuality(renderer,sun,settings.quality);
  atmosphere.setEnabled(settings.effects&&settings.quality!=='low');
}else if(id==='settingEffects'){
  settings.effects=e.target.checked;atmosphere.setEnabled(settings.effects&&settings.quality!=='low');
}else if(id==='settingLanguage')settings.language=e.target.value;
else return;
sound.setEnabled(!settings.muted);
storeSettings(settings);
if(id==='settingLanguage')applyLocale();
renderPanel();
};
const close=()=>{stopHarvest();panel=null;renderPanel()};$('close').onclick=close;$('resume').onclick=close;
function applyLocale(){
document.documentElement.lang=settings.language;
signCtx.clearRect(0,0,640,180);
signCtx.strokeText(settings.language==='fr'?'VENDRE':'SELL',320,93);
signCtx.fillText(settings.language==='fr'?'VENDRE':'SELL',320,93);
saleLabel.material.map.needsUpdate=true;
translateTree($('welcome'),settings.language);
translateTree(document.querySelector('.bottom'),settings.language);
translateTree(document.querySelector('.stamina'),settings.language);
translateTree(document.querySelector('.inventory-mini'),settings.language);
translateTree(document.querySelector('.placement-hud'),settings.language);
if(panel)renderPanel();
const controls=[settings.bindings.forward,settings.bindings.left,settings.bindings.backward,settings.bindings.right];
const hints=document.querySelectorAll('.keyline kbd');
controls.forEach((code,i)=>{if(hints[i])hints[i].textContent=keyLabel(code)});
const prompt=$('prompt');if(!prompt.classList.contains('hidden'))prompt.textContent=keyLabel(settings.bindings.interact);
$('soundToggle').textContent=settings.muted?'♪ OFF':'♪ '+(settings.language==='fr'?'SON':'SOUND');
}
addEventListener('keydown',e=>{
  if(awaitingBinding){
    e.preventDefault();
    if(e.code==='Escape'){awaitingBinding=null;renderPanel();return}
    const prior=settings.bindings[awaitingBinding];
    const collision=ACTIONS.find(name=>name!==awaitingBinding&&settings.bindings[name]===e.code);
    if(collision)settings.bindings[collision]=prior;
    settings.bindings[awaitingBinding]=e.code;
    awaitingBinding=null;storeSettings(settings);renderPanel();applyLocale();return;
  }
  keys[e.code]=true;
  if(['forward','backward','left','right'].some(k=>isPressed(keys,settings,k)))stopHarvest();
  if(e.repeat)return;
  if(e.code==='Escape'){
    if(placing)cancelPlacement();
    else if(panel)close();
    else openPanel('settings');
    return;
  }
  if(panel)return;
  if(e.code===settings.bindings.interact)interact();
  if(e.code===settings.bindings.drop&&carried){sound.effect('ui');drop()}
  if(e.code===settings.bindings.build)openPanel('build');
  if(e.code===settings.bindings.talents)openPanel('talents');
  if(e.code===settings.bindings.inventory)openPanel('inventory');
  if(e.code===settings.bindings.vehicle)pop(st.truck?'Truck owned':'Buy a truck at the market');
});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){heading-=e.movementX*.0025;pitch=T.MathUtils.clamp(pitch+e.movementY*.002,-.1,1.15)}});addEventListener('wheel',e=>{
  if(panel||!$('welcome').classList.contains('hidden'))return;
  dist=T.MathUtils.clamp(dist+Math.sign(e.deltaY),5,18);
},{passive:true});addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});renderer.domElement.onclick=()=>{if(!panel)renderer.domElement.requestPointerLock?.()};$('play').onclick=()=>{sound.boot();$('welcome').classList.add('hidden');$('hud').classList.remove('hidden');renderer.domElement.requestPointerLock?.()};
$('soundToggle').onclick=()=>{
sound.boot();audioActive=true;
const enabled=sound.toggle();
settings.muted=!enabled;
storeSettings(settings);applyLocale();
};
const minimap=$('map').getContext('2d');function map(){minimap.clearRect(0,0,168,168);minimap.save();minimap.beginPath();minimap.arc(84,84,82,0,7);minimap.clip();for(let x=0;x<24;x++)for(let z=0;z<24;z++){let b=biome(player.position.x+(x-12)*9,player.position.z+(z-12)*9);minimap.fillStyle=b<0?'#598654':colors[b];minimap.fillRect(x*7,z*7,8,8)}minimap.fillStyle='white';minimap.beginPath();minimap.arc(84,84,4,0,7);minimap.fill();minimap.restore()}

const monitor={frames:0,drawCalls:0,chunks:0,resources:0,lastError:'',contextLost:false};
Object.defineProperty(window,'__irhMonitor',{value:monitor,configurable:false});
renderer.domElement.addEventListener('webglcontextlost',event=>{
  event.preventDefault();monitor.contextLost=true;monitor.lastError='WebGL context lost';
  console.error('Graphics context lost');
});
renderer.domElement.addEventListener('webglcontextrestored',()=>{monitor.contextLost=false});
window.addEventListener('error',event=>{monitor.lastError=String(event.message||'Runtime error').slice(0,250)});
window.addEventListener('unhandledrejection',event=>{monitor.lastError=String(event.reason||'Unhandled rejection').slice(0,250)});
const tooltipPosition=new T.Vector3(),tooltipForward=new T.Vector3();
function interactionAnchor(){
  if(panel)return null;
  const px=player.position.x,pz=player.position.z;
  if(placing)return [px+Math.sin(player.rotation.y)*6,2.1,pz+Math.cos(player.rotation.y)*6];
  if(isSelling(px,pz)){
    const x=T.MathUtils.clamp(px,SALE.x-SALE.w/2+1,SALE.x+SALE.w/2-1);
    const z=T.MathUtils.clamp(pz,SALE.z-SALE.d/2+1,SALE.z+SALE.d/2-1);
    return [x,.9,z];
  }
  const log=resources.find(o=>o.dead&&o.log&&Math.hypot(o.log.position.x-px,o.log.position.z-pz)<3.2);
  if(log)return [log.log.position.x,1.6,log.log.position.z];
  if(carried)return [px,2.9,pz];
  if(Math.hypot(px,pz)<7)return [0,3.4,2.25];
  const nearby=closest();
  if(!nearby)return null;
  if(nearby.kind)return [nearby.x,3.1,nearby.z];
  return [nearby.x,[2.25,1.75,1.9,1.2,1.6][nearby.type],nearby.z];
}
function positionInteractionTooltip(){
  const prompt=$('prompt'),anchor=interactionAnchor();
  if(!anchor){prompt.classList.add('hidden');return}
  tooltipPosition.set(anchor[0],anchor[1],anchor[2]);
  cam.getWorldDirection(tooltipForward);
  if(tooltipPosition.clone().sub(cam.position).dot(tooltipForward)<.1){
    prompt.classList.add('hidden');return;
  }
  tooltipPosition.project(cam);
  if(!Number.isFinite(tooltipPosition.x)||!Number.isFinite(tooltipPosition.y)||tooltipPosition.z>1||
     Math.abs(tooltipPosition.x)>1.04||Math.abs(tooltipPosition.y)>1.04){
    prompt.classList.add('hidden');return;
  }
  prompt.style.left=Math.round((tooltipPosition.x+1)*.5*window.innerWidth)+'px';
  prompt.style.top=Math.round((1-tooltipPosition.y)*.5*window.innerHeight)+'px';
  const key=keyLabel(settings.bindings.interact);if(prompt.textContent!==key)prompt.textContent=key;
  prompt.classList.remove('hidden');
  prompt.classList.toggle('sale',isSelling(player.position.x,player.position.z));
}
let clock=new T.Clock(),ticks=0,lastIndustryTime=performance.now();
const performanceBudget={sampleAt:performance.now(),frames:0,reduced:false};
function controlQuality(){
const p=performanceBudget;p.frames++;
const now=performance.now(),duration=now-p.sampleAt;
if(duration<4000)return;
const fps=p.frames*1000/duration;
monitor.estimatedFps=Math.round(fps);p.frames=0;p.sampleAt=now;
if(fps<19&&!p.reduced){
p.reduced=true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,settings.quality==='low'?.72:.8));
renderer.shadowMap.enabled=false;
monitor.lowPowerMode=true;
console.warn('Reduced graphics load for stable rendering');
}
}
applyLocale();
function frame(){
requestAnimationFrame(frame);
const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;st.gameMinutes=(Number(st.gameMinutes)||0)+dt;
pumpWorld();
placementFrame();
collectSaleZone();
const side=Number(isPressed(keys,settings,'right'))-Number(isPressed(keys,settings,'left'));
const front=Number(isPressed(keys,settings,'forward'))-Number(isPressed(keys,settings,'backward'));
const moving=!panel&&(side!==0||front!==0);
const wantsSprint=isPressed(keys,settings,'sprint');
if(stamina<.01)sprintLocked=true;
if(stamina>=maxStamina()*.27)sprintLocked=false;
const sprinting=moving&&wantsSprint&&!sprintLocked&&stamina>.01;
if(sprinting)stamina=Math.max(0,stamina-dt*22);
else stamina=Math.min(maxStamina(),stamina+dt*staminaRegen());
$('staminaFill').style.width=(stamina/maxStamina()*100).toFixed(1)+'%';
$('staminaCount').textContent=Math.round(stamina)+' / '+maxStamina();
$('staminaRank').textContent=(settings.language==='fr'?'NIV. ':'LVL. ')+((st.staminaLevel||0)+1);
$('staminaFill').classList.toggle('fatigued',stamina/maxStamina()<.22);
if(moving){
stopHarvest();
footstepTimer+=dt;
if(footstepTimer>(sprinting?.26:.44)){footstepTimer=0;sound.effect('step')}
const len=Math.hypot(side,front);
// The horizontal movement axes match the view direction in every camera orientation.
const cameraBackX=Math.sin(heading),cameraBackZ=Math.cos(heading);
const rightX=cameraBackZ,rightZ=-cameraBackX;
const forwardX=-cameraBackX,forwardZ=-cameraBackZ;
const vx=(rightX*side+forwardX*front)/len;
const vz=(rightZ*side+forwardZ*front)/len;
movePlayer(vx*dt*(sprinting?10.3:6.3),vz*dt*(sprinting?10.3:6.3));
const targetAngle=Math.atan2(vx,vz);
const difference=Math.atan2(Math.sin(targetAngle-player.rotation.y),Math.cos(targetAngle-player.rotation.y));
player.rotation.y+=difference*Math.min(1,dt*16);
}
if(harvesting){
if(harvesting.dead||Math.hypot(player.position.x-harvesting.x,player.position.z-harvesting.z)>3.5)stopHarvest();
else{
const desired=Math.atan2(harvesting.x-player.position.x,harvesting.z-player.position.z);
const delta=Math.atan2(Math.sin(desired-player.rotation.y),Math.cos(desired-player.rotation.y));
player.rotation.y+=delta*Math.min(1,dt*18);
harvestProgress+=dt;
const interval=harvestInterval(harvesting.type);
if(harvestProgress>=interval){harvestProgress-=interval;strikeHarvest()}
}
}
animatePlayer(dt,moving);
baseCamp.update(elapsed);
if(audioActive){
try{sound.update(biome(player.position.x,player.position.z),dt)}
catch(err){audioActive=false;console.warn('Audio subsystem stopped',err)}
}
if(atmosphereActive&&settings.effects&&settings.quality!=='low'){
try{atmosphere.update(dt,elapsed,resources)}
catch(err){atmosphereActive=false;console.warn('Environment effects stopped',err)}
}
if(carried){carried.position.set(player.position.x,2.2,player.position.z);carried.rotation.z=Math.PI/2}
const target=new T.Vector3(player.position.x,1.5,player.position.z);
const offset=new T.Vector3(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
cam.position.copy(target.clone().addScaledVector(offset,dist));
cam.lookAt(target);
positionInteractionTooltip();
sun.position.set(player.position.x+70,95,player.position.z+40);
sun.target.position.set(player.position.x,0,player.position.z);sun.target.updateMatrixWorld();
const nowIndustry=performance.now();
const workDt=Math.min(.22,Math.max(0,(nowIndustry-lastIndustryTime)/1000));
lastIndustryTime=nowIndustry;
try{
  const stats=industry.update(workDt,player.position.x,player.position.z);
  monitor.employees=stats.employees;monitor.visibleEmployees=stats.visible;
  monitor.delivered=stats.delivered;monitor.soldByWorkers=stats.sold;
}catch(error){
  monitor.lastError=String(error);
  console.error('Industry update failed',error);
}

if(ticks++%12===0){
stream();updateResourceVisibility();updateInventory();
$('coins').textContent=st.gold;
$('goldUnit').textContent=settings.language==='fr'?'OR':'GOLD';
$('coordinates').textContent=Math.round(player.position.x)+' / '+Math.round(player.position.z);
const biomeId=biome(player.position.x,player.position.z);
$('biomeName').textContent=tr(biomeId<0?'CAMP CENTRAL':types[biomeId],settings.language);
const gameClock=Math.floor(st.gameMinutes||0)+8*60;
$('clock').textContent=tr('JOUR',settings.language)+' '+String(1+Math.floor(gameClock/1440)).padStart(2,'0')+' · '+String(Math.floor(gameClock/60)%24).padStart(2,'0')+':'+String(gameClock%60).padStart(2,'0');
$('objective').textContent=tr(st.tools.every(t=>t<0)?'COMMENCEZ AVEC VOS POINGS':'DÉVELOPPEZ VOTRE EMPIRE',settings.language);
$('detail').textContent=tr(st.tools.every(t=>t<0)?'Récoltez lentement avec vos poings, puis améliorez votre équipement':'Récoltez, transformez et automatisez',settings.language);
const highlighted=harvesting;
if(highlighted){
$('targetTitle').textContent=tr(raw[highlighted.type],settings.language);
$('targetLife').textContent=highlighted.hp+' / '+highlighted.max+' PV';
$('targetLife').style.setProperty('--hp',(highlighted.hp/highlighted.max*100)+'%');
$('targetHint').textContent='RÉCOLTE EN COURS';
$('target').classList.remove('hidden')
}else $('target').classList.add('hidden');
document.body.dataset.biome=String(biomeId);
map()
}
if(st.gold!==observedGold){
  if(st.gold>observedGold){
    const difference=st.gold-observedGold,indicator=$('goldGain');
    indicator.textContent='+'+difference.toLocaleString(settings.language==='fr'?'fr-FR':'en-US');
    indicator.classList.remove('visible');void indicator.offsetWidth;
    indicator.classList.add('visible');goldHideAt=elapsed+2.4;
    sound.effect('coin');
  }
  observedGold=st.gold;
}
if(goldHideAt&&elapsed>goldHideAt){$('goldGain').classList.remove('visible');goldHideAt=0}
renderer.render(scene,cam);
monitor.frames++;monitor.drawCalls=renderer.info.render.calls;
monitor.chunks=world.size;monitor.resources=resources.length;
monitor.inventoryCount=count();monitor.cameraDistance=dist;monitor.constructionActive=!!placing;monitor.gameMinutes=st.gameMinutes;
controlQuality();
}
stream();pumpWorld();updateInventory();frame();setInterval(save,15000);
