import * as T from 'three';
import {createSound} from './sound.js?v=20261102c';
import {createAtmosphere} from './atmosphere.js?v=20261102c';
const $=id=>document.getElementById(id), scene=new T.Scene();scene.background=new T.Color('#a6cbd1');scene.fog=new T.FogExp2('#a6cbd1',.007);
const cam=new T.PerspectiveCamera(65,innerWidth/innerHeight,.1,450),renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.shadowMap.enabled=true;$('game').append(renderer.domElement);
scene.add(new T.HemisphereLight(0xffffff,0x657449,2.4));const sun=new T.DirectionalLight(0xffe7bc,2.3);sun.position.set(70,95,40);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0004;sun.shadow.normalBias=.024;sun.shadow.radius=2;sun.shadow.camera.left=-60;sun.shadow.camera.right=60;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;scene.add(sun);
const M=c=>new T.MeshLambertMaterial({color:c}),m={grass:M(0x658b55),forest:M(0x3a784e),mountain:M(0x858b83),mine:M(0x94775c),desert:M(0xd7bd7d),field:M(0xb2b75e),tree:M(0x845b35),leaf:M(0x388653),rock:M(0x888e90),ore:M(0x709fad),wheat:M(0xebbb53),skin:M(0xe8b997),shirt:M(0x275c70),wood:M(0xac7852),roof:M(0x965e46),gold:M(0xffd068)};
function cube(w,h,d,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.BoxGeometry(w,h,d),mat);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;return q}function orb(r,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.IcosahedronGeometry(r,1),mat);q.position.set(x,y,z);q.castShadow=true;return q}function cy(r,h,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.CylinderGeometry(r,r,h,8),mat);q.position.set(x,y,z);q.castShadow=true;return q}
const types=['FORÊT','MONTAGNE','EXCAVATION','DÉSERT','CHAMPS'],raw=['Bois','Pierre','Minerai','Sable','Blé'],processed=['Planches','Pierre taillée','Lingots','Verre','Farine'],tools=[['Hache','Hache renforcée','Tronçonneuse'],['Pioche','Pioche acier','Brise-roche'],['Pic de mine','Foreuse','Foreuse industrielle'],['Pelle','Pelle renforcée','Excavatrice'],['Faucille','Faux','Moissonneuse']],worksites=['Cabane de bûcheron','Carrière','Mine','Camp de terrassiers','Ferme'],factories=['Scierie','Atelier de taille','Fonderie','Verrerie','Moulin'],prices=[100,120,150,100,100],values=[12,15,22,10,14],colors=['#488756','#87938b','#b88f6b','#e3c67c','#c8b64e'];
let defaultState={gold:100,bag:8,inv:[0,0,0,0,0],products:[0,0,0,0,0],tools:[-1,-1,-1,-1,-1],talents:[0,0,0,0,0],buildings:[],stock:[],truck:false,cart:false,staminaLevel:0,x:0,z:9,seed:7331};let st={...defaultState};try{let a=JSON.parse(localStorage.getItem('irh-state')||'{}');for(let k in defaultState)if(a[k]!==undefined)st[k]=a[k]}catch{}const save=()=>{st.x=player.position.x;st.z=player.position.z;
const cleanBuildings=st.buildings.map(b=>({kind:b.kind,type:b.type,x:b.x,z:b.z,workers:b.workers,stock:b.stock}));
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
for(let type=0;type<5;type++){let g=new T.Group();g.add(cy(.05,.95,m.wood,0,-.32,0));
if(type===0)g.add(cube(.46,.26,.12,m.rock,.15,-.72,.02));
if(type===1)g.add(cube(.9,.17,.16,m.rock,0,-.73,0));
if(type===2){g.add(cy(.19,.5,m.ore,0,-.17,0));g.add(cy(.06,.35,m.rock,0,-.53,0))}
if(type===3)g.add(cube(.34,.37,.09,m.rock,0,-.79,0));
if(type===4){g.add(cube(.62,.1,.1,m.rock,.17,-.71,0));g.add(cube(.09,.31,.1,m.rock,.43,-.86,0))}
g.visible=false;toolHolder.add(g);toolModels.push(g)}
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
signCtx.fillStyle='#f5d88a';signCtx.fillText('VENDRE',320,93);
const saleLabel=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(signCanvas),transparent:true,depthWrite:false,alphaTest:.03}));
saleLabel.scale.set(7.2,2.03,1);
saleLabel.position.set(SALE.x,6.3,SALE.z);scene.add(saleLabel);


const world=new Map(),resources=[],CH=32,R=2;const hash=(x,z,s=0)=>{let n=Math.sin(x*127.1+z*311.7+s*51.6)*43758.5453;return n-Math.floor(n)},blend=t=>t*t*(3-2*t);function noise(x,z,k,s){let a=Math.floor(x/k),b=Math.floor(z/k),u=blend(x/k-a),v=blend(z/k-b);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b,s),hash(a+1,b,s),u),T.MathUtils.lerp(hash(a,b+1,s),hash(a+1,b+1,s),u),v)}
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
function node(type,x,z,key){const g=new T.Group();g.position.set(x,0,z);let hp=[40,50,60,30,30][type];if(type===0){g.add(cy(.31,3,m.tree,0,1.5,0));for(let i=0;i<3;i++)g.add(orb(1.2,m.leaf,(i-1)*.3,3+i*.34,(i-1)*.13))}if(type===1)g.add(orb(1.1,m.rock,0,.9,0));if(type===2){g.add(orb(1,m.rock,0,.8,0));for(let i=0;i<3;i++)g.add(orb(.3,m.ore,(i-1)*.5,1.3,(i%2)*.3))}if(type===3)g.add(orb(1,m.desert,0,.6,0));if(type===4)for(let i=0;i<9;i++){let a=i*2.3;g.add(cy(.045,1.1,m.wheat,Math.sin(a)*.43,.55,Math.cos(a)*.43),orb(.16,m.wheat,Math.sin(a)*.43,1.1,Math.cos(a)*.43))}if(type===0){for(let i=1;i<g.children.length;i++)g.children[i].castShadow=false}
if(type===4)g.traverse(o=>{if(o.isMesh)o.castShadow=false});
scene.add(g);let o={type,x,z,mesh:g,hp,max:hp,key,dead:false};resources.push(o);return o}

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
const root=new T.Group(),nodes=[],groups=Array.from({length:6},()=>[]);
const x0=cx*CH,z0=cz*CH;
for(let i=0;i<8;i++)for(let j=0;j<8;j++){
const x=x0+(i+.5)*4,z=z0+(j+.5)*4,b=biome(x,z);
groups[b<0?0:b+1].push([x,z]);
}
const mats=[m.grass,m.forest,m.mountain,m.mine,m.desert,m.field];
groups.forEach((group,i)=>{
if(!group.length)return;
const mesh=new T.InstancedMesh(floorGeometry,mats[i],group.length);
mesh.receiveShadow=true;mesh.castShadow=false;
group.forEach(([x,z],j)=>{dummy.position.set(x,-.12,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix);
const shade=.91+hash(cx*17+j,cz*13+j,57)*.16;mesh.setColorAt(j,new T.Color(shade,shade,shade))});
mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;root.add(mesh);
});
decorations(cx,cz,root);scene.add(root);
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
if(Math.abs(x-cx)>R+1||Math.abs(z-cz)>R+1)unloadQueue.push(key)
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
if(Math.abs(x-cx)>R+1||Math.abs(z-cz)>R+1){
scene.remove(c.root);
c.root.traverse(o=>{if(o.isInstancedMesh)o.dispose()});
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
let harvesting=null,harvestProgress=0,stepPhase=0;
const sound=createSound();const atmosphere=createAtmosphere(T,scene,player,biome);
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
const harvestInterval=type=>[.78,.88,1.02,.74,.65][type]*[1,.68,.42][Math.max(0,st.tools[type])];
function animatePlayer(dt,moving){
stepPhase+=dt*(moving?12:2.1);
const stride=moving?Math.sin(stepPhase)*.63:0;
leftLeg.rotation.x=T.MathUtils.damp(leftLeg.rotation.x,stride,13,dt);
rightLeg.rotation.x=T.MathUtils.damp(rightLeg.rotation.x,-stride,13,dt);
avatar.position.y=T.MathUtils.damp(avatar.position.y,moving?Math.abs(Math.sin(stepPhase))*.08:0,12,dt);
if(harvesting){
const type=harvesting.type;
const p=Math.min(1,harvestProgress/Math.max(.15,harvestInterval(type)));
const up=Math.sin(p*Math.PI)**2;
const phase=Math.sin(p*Math.PI*2);
const pose=(arm,x,y,z)=>{arm.rotation.x=T.MathUtils.damp(arm.rotation.x,x,19,dt);arm.rotation.y=T.MathUtils.damp(arm.rotation.y,y,19,dt);arm.rotation.z=T.MathUtils.damp(arm.rotation.z,z,19,dt)};
const holder=(x,y,z)=>toolHolder.rotation.set(x,y,z);
if(type===0){
// Controlled overhead axe lift and forward trunk strike.
pose(rightArm,-.8-1.0*up,.0,-.27);pose(leftArm,-.6-.3*up,0,-.12);
holder(-.8+.35*up,0,.03*phase);avatar.rotation.x=.03*phase;avatar.rotation.z=-.06*up;
}else if(type===1){
// Heavy two-beat pick swing with a deeper torso lean.
pose(rightArm,-1.0-1.1*up,0,-.12);pose(leftArm,-.6-.5*up,0,-.24);
holder(-.82+.25*up,0,0);avatar.rotation.x=.11*phase;avatar.rotation.z=.03*phase;
}else if(type===2){
// Steady drill pressure, vibration, and bracing arm.
pose(rightArm,-1.3,0,-.1);pose(leftArm,-1.15,0,.2);
holder(-1.4+.06*phase,0,.06*phase);avatar.rotation.x=.08;avatar.position.y+=Math.abs(phase)*.012;
}else if(type===3){
// Shovel dips toward the ground and then lifts material.
pose(rightArm,-.5-.9*up,0,-.2);pose(leftArm,-.7-.5*up,0,.14);
holder(-.8-.3*up,0,0);avatar.rotation.x=.18+.06*phase;
}else{
// A broad sideways harvesting sweep rather than an overhead hit.
pose(rightArm,-.72,.75*phase,-.38+.2*phase);pose(leftArm,-.57,0,-.15);
holder(-.92,0,.3*phase);avatar.rotation.y=.14*phase;avatar.rotation.x=.04;
}
toolModels.forEach((t,i)=>t.visible=i===type);
}else{
const smooth=(x)=>T.MathUtils.damp(x,0,12,dt);
avatar.rotation.set(smooth(avatar.rotation.x),smooth(avatar.rotation.y),smooth(avatar.rotation.z));
rightArm.rotation.set(T.MathUtils.damp(rightArm.rotation.x,moving?stride*.6:0,13,dt),smooth(rightArm.rotation.y),smooth(rightArm.rotation.z));
leftArm.rotation.set(T.MathUtils.damp(leftArm.rotation.x,moving?-stride*.6:0,13,dt),smooth(leftArm.rotation.y),smooth(leftArm.rotation.z));
toolHolder.rotation.set(smooth(toolHolder.rotation.x),smooth(toolHolder.rotation.y),smooth(toolHolder.rotation.z));
toolModels.forEach(t=>t.visible=false);
}
cargo.rotation.z=moving?Math.sin(stepPhase)*.04:0;
}
function updateInventory(){
const grid=$('inventoryGrid');if(!grid)return;
const items=[];for(let i=0;i<5;i++)for(let j=0;j<st.inv[i];j++)items.push(i);
for(let i=0;i<5;i++)for(let j=0;j<st.products[i];j++)items.push(i+5);
const signature=st.bag+':'+items.join(',');if(grid.dataset.signature===signature)return;grid.dataset.signature=signature;
const labels=['▰','◆','◈','⬟','✦'];
grid.innerHTML=Array.from({length:st.bag},(_,i)=>{const type=items[i];
return '<div class="inventory-slot'+(type===undefined?' empty':'')+'"'+(type===undefined?'':' title="'+(type<5?raw[type]:processed[type-5])+'"')+'>'+(type===undefined?'':'<span class="inventory-symbol resource-'+type%5+'">'+labels[type%5]+'</span>')+'</div>'}).join('');
$('inventoryCapacity').textContent=count()+' / '+st.bag;updateCargo()
}function pop(s){let e=$('notice');e.textContent=s;e.classList.add('show');clearTimeout(pop.t);pop.t=setTimeout(()=>e.classList.remove('show'),2200)}
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
  if(!isSelling(player.position.x,player.position.z))return;
  const available=st.inv.some(Boolean)||st.products.some(Boolean)||st.stock.length>0||!!carried;
  if(available)sell({notifyEmpty:false,includeCarried:true});
}


function strikeHarvest(){
const o=harvesting;
if(!o||o.dead||!resources.includes(o)||Math.hypot(player.position.x-o.x,player.position.z-o.z)>3.5){stopHarvest();return}
if(count()>=st.bag){stopHarvest();pop('Inventaire plein');return}
if(st.tools[o.type]<0){stopHarvest();return}
const power=[1,2,3][st.tools[o.type]];
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
},50000)
}
updateInventory();save()
}
function harvest(){
if(panel)return;
if(placing){
const x=Math.round(player.position.x+Math.sin(player.rotation.y)*6),z=Math.round(player.position.z+Math.cos(player.rotation.y)*6);
if(Math.hypot(x,z)<12||Math.abs(x-SALE.x)<SALE.w/2+3&&Math.abs(z-SALE.z)<SALE.d/2+3||st.buildings.some(b=>Math.hypot(b.x-x,b.z-z)<6)||resources.some(o=>!o.dead&&Math.hypot(o.x-x,o.z-z)<4))return pop('Terrain indisponible');
st.buildings.push({...placing,x,z,workers:0,stock:0});addBuilding(st.buildings.at(-1));
placing=null;sound.effect('build');pop('Bâtiment construit');save();return
}
if(carried){drop();return}
const o=closest();if(!o)return;
if(o.kind){
stopHarvest();
if(o.kind==='factory'){const n=Math.min(5,st.inv[o.type]);if(!n)return pop('Apportez des matières premières');st.inv[o.type]-=n;st.products[o.type]+=n;pop('+'+n+' '+processed[o.type])}
else if(o.kind==='worker'){const n=Math.min(o.stock,st.bag-count());o.stock-=n;st.inv[o.type]+=n;pop(n+' unités récupérées')}
else if(o.kind==='seller')sell();
updateInventory();save();return
}
if(st.tools[o.type]<0)return pop('Achetez un outil au marché (E)');
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
function addBuilding(b){let g=new T.Group();g.add(cube(3.5,2.2,3.3,m.wood,0,1.1,0),cube(4.1,.65,3.9,b.kind==='factory'?m.roof:m.leaf,0,2.52,0),cube(.85,1.4,.12,m.shirt,0,.7,1.7));g.position.set(b.x,0,b.z);scene.add(g);b.mesh=g}
st.buildings.forEach(addBuilding);

const panels={market:'COMPTOIR',build:'CONSTRUCTION',talents:'PROGRESSION',inventory:'INVENTAIRE'};
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
$('panelTitle').textContent=panels[panel];$('panelTag').textContent='FRONTIER CAPITAL';
$('tabs').innerHTML=['market','build','talents','inventory'].map(k=>'<button data-tab="'+k+'" '+(panel===k?'class="active"':'')+'>'+panels[k]+'</button>').join(' ');
let out='';
if(panel==='market'){
let group='';for(let i=0;i<5;i++){
const tier=st.tools[i]+1;if(tier>=3)continue;
const cost=tier===0?prices[i]:tier===1?650:2900;
group+=add(tools[i][tier],types[i]+' · Palier '+(tier+1)+' / 3',cost+' OR','tool:'+i,false,i);
}
out+=section('Outils & récolte','CINQ INDUSTRIES',group||'<p class="catalog-empty">Tous les outils sont au niveau maximum.</p>');
const level=st.staminaLevel||0;
let utility='';
if(st.bag===8)utility+=add('Capacité de stockage','8 → 16 emplacements','450 OR','bag');
if(level<4)utility+=add('Condition physique','Endurance '+maxStamina()+' → '+(maxStamina()+32),[500,1250,2600,5500][level]+' OR','stamina');
if(!st.cart)utility+=add('Chariot utilitaire','Transport de petites charges','1200 OR','cart');
if(!st.truck)utility+=add('Camion de ressources','Grand volume de transport','4500 OR','truck');
out+=section('Équipement','CONSERVATION & MOBILITÉ',utility||'<p class="catalog-empty">Équipement entièrement amélioré.</p>');
out+=section('Comptoir','TRANSACTIONS',add('Vendre le chargement','Inventaire et zone de vente','VENDRE','sell'));
}
if(panel==='build'){
for(let i=0;i<5;i++){
out+=section(types[i]+' · '+raw[i].toUpperCase(),'CHAÎNE DE PRODUCTION',add(worksites[i],'Collecte automatique · stockage',(550+i*160)+' OR','worker:'+i,false,i)+add(factories[i],raw[i]+' → '+processed[i],(480+i*150)+' OR','factory:'+i,false,i));
}
out+=section('Logistique','TRANSPORT & COMMERCE',add('Dépôt de transport','Déplacements des ressources','1400 OR','transport:0')+add('Comptoir vendeur','Vente automatisée','1800 OR','seller:0'));
if(st.buildings.length)out+=section('Personnel','RECRUTEMENT',st.buildings.map((b,i)=>add((b.kind==='worker'?worksites[b.type]:b.kind==='factory'?factories[b.type]:b.kind==='seller'?'Comptoir vendeur':'Dépôt transport')+' #'+(i+1),'Employés : '+(b.workers||0)+' · Stock : '+(b.stock||0),'300 OR','hire:'+i,false,b.type)).join(''));
}
if(panel==='talents'){
const level=st.staminaLevel||0;
out+=section('Endurance & sprint','PERFORMANCES',level<4?add('Endurance '+(level+1),'Réserve '+maxStamina()+' → '+(maxStamina()+32)+' · récupération +4/s',[500,1250,2600,5500][level]+' OR','stamina'):add('Endurance MAX','Capacité maximale atteinte','MAX','noop',true));
out+=section('Expertise des métiers','SPÉCIALISATIONS',types.map((name,i)=>add(name+' · Palier '+st.talents[i],'+10 % à la valeur de vente (développement)','500 OR','talent:'+i,false,i)).join(''));
}
if(panel==='inventory'){
out+=section('Contenu transporté',count()+' / '+st.bag+' EMPLACEMENTS',types.map((name,i)=>add(raw[i],st.inv[i]+' unité(s) · '+processed[i]+' : '+st.products[i],values[i]+' / unité','noop',true,i)).join(''));
out+=section('Stock en dépôt','ZONE DE VENTE',add('Marchandises à vendre',st.stock.length+' tronc(s) enregistré(s)','VENDRE','sell'));
}
$('shopbody').innerHTML=out;$('panelhint').textContent=st.gold.toLocaleString('fr-FR')+' pièces d’or';
}
$('panel').onclick=e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.tab){sound.effect('ui');panel=b.dataset.tab;return renderPanel()}let a=b.dataset.action;if(!a)return;if(a==='sell')return sell();if(a==='bag')return buy(450,()=>st.bag=16);if(a==='stamina')return buy([500,1250,2600,5500][st.staminaLevel||0]||99999,()=>{st.staminaLevel=(st.staminaLevel||0)+1;stamina=maxStamina()});if(a==='cart')return buy(1200,()=>st.cart=true);if(a==='truck')return buy(4500,()=>st.truck=true);let [kind,id]=a.split(':'),i=+id;if(kind==='tool'){let tier=st.tools[i]+1;return buy(tier===0?prices[i]:tier===1?650:2900,()=>st.tools[i]=tier)}if(kind==='hire')return buy(300,()=>st.buildings[i].workers++);if(kind==='talent')return buy(500,()=>st.talents[i]++);if(['factory','worker','transport','seller'].includes(kind))return buy(kind==='factory'?480+i*150:kind==='worker'?550+i*160:kind==='transport'?1400:1800,()=>{placing={kind,type:i};panel=null;renderPanel();pop('Allez à l’emplacement, F pour construire')})};const close=()=>{stopHarvest();panel=null;renderPanel()};$('close').onclick=close;$('resume').onclick=close;
addEventListener('keydown',e=>{keys[e.code]=true;if(['KeyW','KeyZ','KeyA','KeyQ','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))stopHarvest();if(e.repeat)return;if(e.code==='KeyF')interact();if(e.code==='KeyG'&&carried){sound.effect('ui');drop()}if(e.code==='KeyB')openPanel('build');if(e.code==='KeyU')openPanel('talents');if(e.code==='KeyI')openPanel('inventory');if(e.code==='KeyR')pop(st.truck?'Camion possédé':'Achetez un camion au comptoir');if(e.code==='Escape'){if(placing){placing=null;pop('Placement annulé')}close()}});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){heading-=e.movementX*.0025;pitch=T.MathUtils.clamp(pitch+e.movementY*.002,-.1,1.15)}});addEventListener('wheel',e=>dist=T.MathUtils.clamp(dist+Math.sign(e.deltaY),5,18),{passive:true});addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});renderer.domElement.onclick=()=>{if(!panel)renderer.domElement.requestPointerLock?.()};$('play').onclick=()=>{sound.boot();$('welcome').classList.add('hidden');$('hud').classList.remove('hidden');renderer.domElement.requestPointerLock?.()};
$('soundToggle').onclick=()=>{sound.boot();audioActive=true;const enabled=sound.toggle();$('soundToggle').classList.toggle('muted',!enabled);$('soundToggle').innerHTML=enabled?'♪ <span>SON</span>':'♪ <span>MUET</span>'};
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
let clock=new T.Clock(),ticks=0;
const performanceBudget={sampleAt:performance.now(),frames:0,reduced:false};
function controlQuality(){
const p=performanceBudget;p.frames++;
const now=performance.now(),duration=now-p.sampleAt;
if(duration<4000)return;
const fps=p.frames*1000/duration;
monitor.estimatedFps=Math.round(fps);p.frames=0;p.sampleAt=now;
if(fps<19&&!p.reduced){
p.reduced=true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1));
renderer.shadowMap.enabled=false;
monitor.lowPowerMode=true;
console.warn('Reduced graphics load for stable rendering');
}
}
function frame(){
requestAnimationFrame(frame);
const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
pumpWorld();
collectSaleZone();
const side=Number(!!(keys.KeyD||keys.ArrowRight))-Number(!!(keys.KeyA||keys.KeyQ||keys.ArrowLeft));
const front=Number(!!(keys.KeyW||keys.KeyZ||keys.ArrowUp))-Number(!!(keys.KeyS||keys.ArrowDown));
const moving=!panel&&(side!==0||front!==0);
const wantsSprint=keys.ShiftLeft||keys.ShiftRight;
if(stamina<.01)sprintLocked=true;
if(stamina>=maxStamina()*.27)sprintLocked=false;
const sprinting=moving&&wantsSprint&&!sprintLocked&&stamina>.01;
if(sprinting)stamina=Math.max(0,stamina-dt*22);
else stamina=Math.min(maxStamina(),stamina+dt*staminaRegen());
$('staminaFill').style.width=(stamina/maxStamina()*100).toFixed(1)+'%';
$('staminaCount').textContent=Math.round(stamina)+' / '+maxStamina();
$('staminaRank').textContent='NIV. '+((st.staminaLevel||0)+1);
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
if(audioActive){
try{sound.update(biome(player.position.x,player.position.z),dt)}
catch(err){audioActive=false;console.warn('Audio subsystem stopped',err)}
}
if(atmosphereActive){
try{atmosphere.update(dt,elapsed,resources)}
catch(err){atmosphereActive=false;console.warn('Environment effects stopped',err)}
}
if(carried){carried.position.set(player.position.x,2.2,player.position.z);carried.rotation.z=Math.PI/2}
const target=new T.Vector3(player.position.x,1.5,player.position.z);
const offset=new T.Vector3(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
cam.position.copy(target.clone().addScaledVector(offset,dist));
cam.lookAt(target);
sun.position.set(player.position.x+70,95,player.position.z+40);
sun.target.position.set(player.position.x,0,player.position.z);sun.target.updateMatrixWorld();
workerClock+=dt;
if(workerClock>3){
workerClock=0;
for(const b of st.buildings){
if(!b.workers)continue;
if(b.kind==='worker')b.stock+=b.workers;
if(b.kind==='factory'){const n=Math.min(b.workers,st.inv[b.type]);st.inv[b.type]-=n;st.products[b.type]+=n}
if(b.kind==='seller'){const n=st.products.reduce((v,n,i)=>v+n*values[i]*3,0);st.products.fill(0);st.gold+=n}
if(b.kind==='transport'){const n=st.stock.length;st.stock=[];st.gold+=n*65}
}
updateInventory();save()
}
if(ticks++%12===0){
stream();updateResourceVisibility();updateInventory();
$('coins').textContent=st.gold;
$('coordinates').textContent=Math.round(player.position.x)+' / '+Math.round(player.position.z);
const biomeId=biome(player.position.x,player.position.z);
$('biomeName').textContent=biomeId<0?'CAMP CENTRAL':types[biomeId];
$('clock').textContent='JOUR '+String(1+Math.floor(elapsed/600)).padStart(2,'0')+' · '+String(8+Math.floor(elapsed/60)%16).padStart(2,'0')+':00';
$('objective').textContent=st.tools.every(t=>t<0)?'ACHETEZ VOTRE PREMIER OUTIL':'DÉVELOPPEZ VOTRE EMPIRE';
$('detail').textContent=st.tools.every(t=>t<0)?'Approchez du comptoir et appuyez sur F':'Récoltez, transformez et automatisez';
const o=closest(),saleNearby=isSelling(player.position.x,player.position.z);
const hasLog=resources.some(n=>n.log&&n.dead&&Math.hypot(n.x-player.position.x,n.z-player.position.z)<3);
const nearMarket=Math.hypot(player.position.x,player.position.z)<7;
const k=saleNearby||placing||hasLog||carried||o?'F':nearMarket?'E':'';
const text=saleNearby?(carried?'DÉPOSER':'VENDRE'):'';
$('prompt').innerHTML=k?'<kbd>'+k+'</kbd>'+(text?'<span>'+text+'</span>':''):'';
$('prompt').classList.toggle('hidden',!k||!!panel);
$('prompt').classList.toggle('sale',saleNearby);
const highlighted=harvesting;
if(highlighted){
$('targetTitle').textContent=raw[highlighted.type];
$('targetLife').textContent=highlighted.hp+' / '+highlighted.max+' PV';
$('targetLife').style.setProperty('--hp',(highlighted.hp/highlighted.max*100)+'%');
$('targetHint').textContent='RÉCOLTE EN COURS';
$('target').classList.remove('hidden')
}else $('target').classList.add('hidden');
document.body.dataset.biome=String(biomeId);
map()
}
renderer.render(scene,cam);
monitor.frames++;monitor.drawCalls=renderer.info.render.calls;
monitor.chunks=world.size;monitor.resources=resources.length;
controlQuality();
}
stream();pumpWorld();updateInventory();frame();setInterval(save,15000);
