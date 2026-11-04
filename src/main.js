import * as T from 'three';
import {createSound} from './sound.js?v=20261103s6';
import {createAtmosphere} from './atmosphere.js?v=20261107path2';
import {createWildlife} from './wildlife.js?v=20261107path2';
import {createSkyWeather} from './sky-weather.js?v=20261103visual3';
import {createNightLighting} from './night-lighting.js?v=20261103night3';
import {createIndustry} from './industry.js?v=20261103visual3';
import {inventoryIcon} from './item-icons.js?v=20261103k';
import {createResourceGraphics} from './resource-visuals.js?v=20261103ac';
import {makeStructure} from './structures.js?v=20261107path2';
import {EQUIPMENT,EQUIPMENT_FR,TOOL_SPEED,TOOL_YIELD,ECONOMY,toolCost,buildingCost,workerCarryCost,MAX_EXPERTISE,expertiseCost,expertiseMultiplier,expertiseHarvestSpeed,AUTO_UPGRADE_COSTS,autoSpeedMultiplier} from './balance.js?v=20261106d';
import {loadSettings,storeSettings,keyLabel,isPressed,applyQuality,ACTIONS,detectKeyboardLayout} from './settings.js?v=20261105d';
import {tr,translateTree,UI} from './language.js?v=20261106d';
import {createBaseCamp} from './basecamp.js';
import {optionsMarkup} from './options-ui.js?v=20261106d';
import {createTrails} from './trails.js?v=20261106d';
import {createRoadNetwork} from './road-network.js?v=20261103visual3';
import {createRoadSurfaces} from './road-surface.js?v=20261103visual3';
import {decorationCollider} from './decor-collision.js?v=20261103p4';
import {batchResourceNodes,setDistantResource} from './resource-batches.js?v=20261103p4';
import {createResourceLifecycle} from './resource-life.js?v=20261106nature2';
import {createHarvestEffects} from './harvest-fx.js?v=20261103s6';
import {createAutoPilot} from './auto-pilot.js?v=20261103night3';
import {openSaveVault} from './save-vault.js?v=20261103p7';
import {normalizeAvatar,attachAvatarDesigner} from './avatar-style.js?v=20261105b';
import {avatarBuilderMarkup} from './avatar-ui.js?v=20261103p7';
import {nearestStock,transferStock} from './stock-interaction.js?v=20261103p7';
import {worldPoint,facilityFootprint,footprintsOverlap,pointInOrientedRect,normalizeRotation} from './facility-layout.js';
import {createBicycle} from './bicycle.js?v=20261104c';
import {createExplorationMap} from './exploration-map.js?v=20261103camera1';
import {createMobileControls} from './mobile-controls.js?v=20261105a';
import {createScreenImmersion} from './screen-immersive.js?v=20261103visual2';
const $=id=>document.getElementById(id), scene=new T.Scene();scene.background=new T.Color('#a6cbd1');scene.fog=new T.Fog('#a6cbd1',80,125);
const cam=new T.PerspectiveCamera(65,innerWidth/innerHeight,.1,450),renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.NeutralToneMapping;
renderer.toneMappingExposure=1.10;
renderer.shadowMap.enabled=true;$('game').append(renderer.domElement);
const hemisphere=new T.HemisphereLight(0xffffff,0x657449,2.4);scene.add(hemisphere);const sun=new T.DirectionalLight(0xffe7bc,2.3);sun.position.set(70,95,40);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0004;sun.shadow.normalBias=.024;sun.shadow.radius=2;sun.shadow.camera.left=-60;sun.shadow.camera.right=60;sun.shadow.camera.top=60;sun.shadow.camera.bottom=-60;scene.add(sun);
const M=c=>new T.MeshLambertMaterial({color:c}),m={grass:M(0x658b55),forest:M(0x3a784e),mountain:M(0x858b83),mine:M(0x94775c),desert:M(0xd7bd7d),field:M(0xb2b75e),tree:M(0x845b35),leaf:M(0x388653),rock:M(0x888e90),ore:M(0x709fad),wheat:M(0xebbb53),skin:M(0xe8b997),shirt:M(0x275c70),wood:M(0xac7852),roof:M(0x965e46),gold:M(0xffd068)};
function cube(w,h,d,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.BoxGeometry(w,h,d),mat);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;return q}function orb(r,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.IcosahedronGeometry(r,1),mat);q.position.set(x,y,z);q.castShadow=true;return q}function cy(r,h,mat,x=0,y=0,z=0){let q=new T.Mesh(new T.CylinderGeometry(r,r,h,8),mat);q.position.set(x,y,z);q.castShadow=true;return q}
const types=['FORÊT'],raw=['Bois','Pierre','Minerai','Sable','Blé'],processed=['Planches','Pierre taillée','Lingots','Verre','Farine'],tools=EQUIPMENT_FR,worksites=['Cabane de bûcheron','Carrière','Mine','Camp de terrassiers','Ferme'],factories=['Scierie','Atelier de taille','Fonderie','Verrerie','Moulin'],values=[12,12,12,12,12],colors=['#488756','#87938b','#b88f6b','#e3c67c','#c8b64e'];
const vault=await openSaveVault();
let defaultState={gold:100,bag:8,bicycle:false,inv:[0,0,0,0,0],products:[0,0,0,0,0],tools:[-1,-1,-1,-1,-1],talents:[0,0,0,0,0],buildings:[],stock:[],bicycle:false,staminaLevel:0,gameMinutes:0,x:0,z:9,seed:Math.floor(Math.random()*2000000000)+10000,worldVersion:3,forestFocusVersion:1,exhausted:{},explored:[],autoLevel:0,roads:{},avatar:null};let st={...defaultState};
const settings=loadSettings();await detectKeyboardLayout();let awaitingBinding=null;let observedGold=st.gold,goldHideAt=0;try{
 const a=vault.state||{};
 for(const k in defaultState)if(a[k]!==undefined)st[k]=a[k];
 // Existing maps retain their original nearby forest; only newly generated
 // worlds use the seeded three-biome starting crossroads.
 if(vault.state&&vault.state.worldVersion===undefined)st.worldVersion=1;
 }catch(error){console.warn('Save could not be loaded',error)}
// Preserve player progress when retiring the four non-forest industries.
if(vault.state&&vault.state.forestFocusVersion!==1){
  const retired=st.buildings.filter(b=>['worker','factory'].includes(b.kind)&&b.type!==0);
  st.gold+=retired.reduce((n,b)=>n+buildingCost(b.kind,b.type)+
    Math.max(0,Number(b.workers)||0)*ECONOMY.hire,0);
  st.buildings=st.buildings.filter(b=>!retired.includes(b));
  for(const field of ['inv','products']){
    const arr=Array.isArray(st[field])?st[field]:[0];
    arr[0]=(Number(arr[0])||0)+arr.slice(1).reduce((sum,n)=>sum+(Number(n)||0),0);
    st[field]=[arr[0],0,0,0,0];
  }
  st.stock=[];
  st.tools=[st.tools?.[0]??-1,-1,-1,-1,-1];
  st.talents=[st.talents?.[0]||0,0,0,0,0];
  st.roads={}; // Old roads were automatically generated: discard them.
  st.worldVersion=3;st.forestFocusVersion=1;
}
observedGold=st.gold;
const save=()=>{st.x=player.position.x;st.z=player.position.z;
const cleanBuildings=st.buildings.map(b=>({
id:b.id,kind:b.kind,type:b.type,x:b.x,z:b.z,rotation:b.rotation||0,workers:b.workers,carryLevel:b.carryLevel,
stock:b.stock,stockRaw:b.stockRaw,inputRaw:b.inputRaw,stockProcessed:b.stockProcessed,progress:b.progress,
warehouseRaw:Array.isArray(b.warehouseRaw)?b.warehouseRaw.slice():undefined,
warehouseProcessed:Array.isArray(b.warehouseProcessed)?b.warehouseProcessed.slice():undefined
}));
vault.save({...st,buildings:cleanBuildings}).catch(e=>console.warn('Encrypted storage unavailable',e));
};

const player=new T.Group(),avatar=new T.Group();player.add(avatar);
const bicycle=createBicycle(T,player);let bikeRiding=false;
avatar.add(cy(.42,1.12,m.shirt,0,1.4,0),orb(.35,m.skin,0,2.15,.04));
const eyeNormalMaterial=M(0x121819);
const eyeChromaMaterial=new T.ShaderMaterial({
 uniforms:{time:{value:0}},
 vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform float time;
 varying vec2 vUv;
 void main(){
   float wave=sin(vUv.x*16.0-vUv.y*12.0+time*5.7)*0.12+
              sin(vUv.x*8.0+vUv.y*19.0-time*3.6)*0.08;
   float phase=fract(vUv.x*.70+vUv.y*.35+time*.23+wave);
   vec3 rgb=.55+.45*cos(6.2831853*(phase+vec3(0.0,.333333,.666667)));
   float shimmer=.86+.14*sin(vUv.y*22.0+time*6.4);
   gl_FragColor=vec4(rgb*shimmer,1.0);
 }`,
 depthWrite:true,depthTest:true
});
const eyes=[cube(.1,.055,.08,eyeNormalMaterial,-.14,2.18,.35),
            cube(.1,.055,.08,eyeNormalMaterial,.14,2.18,.35)];
avatar.add(...eyes);
function syncAutoEyes(on){
  const material=on?eyeChromaMaterial:eyeNormalMaterial;
  for(const eye of eyes)if(eye.material!==material)eye.material=material;
}
function limb(x,y,len,thick){const g=new T.Group();g.position.set(x,y,0);g.add(cube(thick,len,thick,m.shirt,0,-len/2,0));avatar.add(g);return g}
const leftLeg=limb(-.23,.88,.86,.26),rightLeg=limb(.23,.88,.86,.26);
const leftArm=limb(-.53,1.82,.78,.22),rightArm=limb(.53,1.82,.78,.22);
leftArm.add(orb(.12,m.skin,0,-.78,0));rightArm.add(orb(.12,m.skin,0,-.78,0));
const toolHolder=new T.Group();toolHolder.position.set(0,-.76,.08);rightArm.add(toolHolder);
const avatarDesigner=attachAvatarDesigner(T,avatar,{
  torso:avatar.children[0],head:avatar.children[1],leftArm,rightArm,leftLeg,rightLeg
});
let avatarDraft=normalizeAvatar(st.avatar||{});
avatarDesigner.apply(avatarDraft);
const toolModels=[];
for(let type=0;type<1;type++){
  const variants=[];
  for(let tier=0;tier<5;tier++){
    const g=new T.Group(),metal=tier>=3?m.ore:m.rock;
    const shaft=cy(tier>=3?.065:.045,.62+tier*.08,tier>=3?m.shirt:m.wood,0,-.33,0);
    g.add(shaft);
    if(type===0){
      if(tier<3){
        g.add(cube(.27+tier*.09,.24+tier*.035,.13,metal,.06,-.59,0));
        const edge=new T.Mesh(new T.ConeGeometry(.17+tier*.028,.37+tier*.055,3),metal);
        edge.position.set(.30+tier*.08,-.60,0);
        edge.rotation.z=-Math.PI/2;edge.rotation.x=Math.PI/2;
        edge.castShadow=true;g.add(edge);
      }
      else {g.add(cube(.82,.25,.22,m.shirt,0,-.7,0),cube(.68,.11,.06,metal,.33,-.85,0))}
    }else if(type===1){
      if(tier<3){
        g.add(cube(.57+tier*.12,.17,.16,metal,0,-.65,0));
        // The sharpened +X pick point is turned toward the resource (+Z)
        // by the animated tool holder when the head swings forward.
        const tip=new T.Mesh(new T.ConeGeometry(.115+tier*.025,.38+tier*.09,5),metal);
        tip.rotation.z=-Math.PI/2;
        tip.position.set(.38+tier*.095,-.65,0);
        tip.castShadow=true;g.add(tip);
        const heel=new T.Mesh(new T.ConeGeometry(.09,.20,5),metal);
        heel.rotation.z=Math.PI/2;heel.position.set(-.30,-.65,0);g.add(heel);
      }
      else {g.add(cube(.72,.4,.32,m.shirt,0,-.62,0),cy(.09,.4,metal,0,-.9,0))}
    }else if(type===2){
      if(tier<2){
        g.add(cube(.66,.18,.18,metal,0,-.64,0));
        const tip=new T.Mesh(new T.ConeGeometry(.13,.46,5),metal);
        tip.rotation.z=-Math.PI/2;tip.position.set(.45,-.64,0);
        tip.castShadow=true;g.add(tip);
      }
      else {g.add(cy(.19+tier*.03,.58,m.shirt,0,-.56,0),cy(.075,.52,metal,0,-.92,0))}
    }else if(type===3){
      if(tier<2)g.add(cube(.30,.43,.09,metal,0,-.78,0));
      else {g.add(cy(.15+tier*.02,.40,m.shirt,0,-.58,0),cube(.35,.23,.13,metal,0,-.91,0))}
    }else{
      if(tier<3)g.add(cube(.50+tier*.16,.12,.10,metal,.17,-.65,0),cube(.10,.27,.1,metal,.40,-.78,0));
      else {g.add(cube(.72,.29,.30,m.shirt,.15,-.72,0),cube(.82,.075,.11,metal,.27,-.85,0))}
    }
    // Powered tools have independent mechanical parts, allocated once per model.
    if(tier>=3){
      const motor=new T.Group(),motorMaterial=tier===4?m.gold:m.ore;
      if(type===0){
        motor.position.set(.35,-.82,0);
        const sprocket=cy(.12,.095,motorMaterial);sprocket.rotation.x=Math.PI/2;
        motor.add(sprocket);
        if(tier===4)g.add(cube(.48,.055,.035,m.rock,.44,-.96,0));
      }else if(type===1){
        motor.position.set(0,-.88,0);motor.add(cy(.085,.33,motorMaterial,0,-.12,0));
        g.add(cube(.18,.20,.2,m.wood,0,-.45,.20));
      }else if(type===2){
        motor.position.set(0,-.94,0);motor.add(cy(.09,.45,motorMaterial,0,-.19,0));
        motor.add(cube(.18,.09,.18,m.rock,0,-.37,0));
      }else if(type===3){
        motor.position.set(0,-.90,0);motor.add(cy(.08,.47,motorMaterial,0,-.18,0));
        for(let j=0;j<3;j++){
          const flute=cube(.26,.035,.07,m.rock,0,-.08-j*.12,0);
          flute.rotation.y=j*Math.PI/3;motor.add(flute);
        }
      }else{
        motor.position.set(.28,-.86,0);
        const disc=cy(.23,.045,motorMaterial);disc.rotation.x=Math.PI/2;motor.add(disc);
        g.add(cube(.42,.06,.12,m.rock,.40,-.94,.02));
      }
      g.add(motor);g.userData.motor=motor;
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

const SALE={x:23,z:0,w:8,d:9};
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


const world=new Map(),resources=[],CH=32;
const resourceLife=createResourceLifecycle(st);
const roads=createRoadNetwork(st);
const roadSurfaces=createRoadSurfaces(T,scene,roads,player,{
  viewDistance:()=>settings.viewDistance,quality:()=>settings.quality,
  origin:()=>inConstruction()?constructionFocus:player.position
});
const trails=createTrails(T,st,world,{roadLevel:(x,z)=>roads.levelAt(x,z)});
let R=Math.max(2,Math.min(8,Math.ceil(settings.viewDistance/CH)));const hash=(x,z,s=0)=>{let n=Math.sin(x*127.1+z*311.7+s*51.6+((st.seed||7331)-7331)*.7919)*43758.5453;return n-Math.floor(n)},blend=t=>t*t*(3-2*t);function noise(x,z,k,s){let a=Math.floor(x/k),b=Math.floor(z/k),u=blend(x/k-a),v=blend(z/k-b);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b,s),hash(a+1,b,s),u),T.MathUtils.lerp(hash(a,b+1,s),hash(a+1,b+1,s),u),v)}
function biome(x,z){
  // A camp clearing surrounded by one continuous, infinite forest.
  return Math.hypot(x,z)<22?-1:0;
}
const resourceGraphics=createResourceGraphics(T);
const harvestFx=createHarvestEffects(T,scene);
function node(type,x,z,key){
const variant=Math.floor(hash(Math.floor(x*3),Math.floor(z*3),66)*4);
const g=resourceGraphics.createNode(type,variant,x+z*3);
g.position.set(x,0,z);
scene.add(g);
const hp=[340,440,520,300,360][type];
const obj={type,x,z,mesh:g,hp,max:hp,key,dead:false,variant};
resourceLife.spawn(obj);resources.push(obj);return obj;
}

const terrainMaterial=new T.MeshLambertMaterial({vertexColors:true});
// World-anchored soft microvariation: retain Three.js lighting, shadows and fog.
// The hash is evaluated in object world space so motion never creates shimmer.
terrainMaterial.onBeforeCompile=shader=>{
  const vertexDetail=[
    'varying float nimShade;',
    'float nimHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float nimNoise(vec2 p){',
    'vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
    'return mix(mix(nimHash(i),nimHash(i+vec2(1.0,0.0)),f.x),',
    'mix(nimHash(i+vec2(0.0,1.0)),nimHash(i+vec2(1.0,1.0)),f.x),f.y);}'
  ].join('\n');
  shader.vertexShader=shader.vertexShader.replace('#include <common>',
    '#include <common>\n'+vertexDetail);
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',
    '#include <worldpos_vertex>\nvec2 nimWorldXZ=(modelMatrix*vec4(transformed,1.0)).xz;'+
    'nimShade=nimNoise(nimWorldXZ*.19);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
    '#include <common>\nvarying float nimShade;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
    '#include <color_fragment>\ndiffuseColor.rgb*=.958+.080*nimShade;');
};
terrainMaterial.customProgramCacheKey=()=> 'nim-soft-terrain-v1';
const accentGeometry=new T.IcosahedronGeometry(.19,0);
const weedGeometry=new T.ConeGeometry(.16,.62,3);
const stalkGeometry=new T.CylinderGeometry(.04,.055,.75,4);
const cactusGeometry=new T.CylinderGeometry(.14,.2,1.13,6);
const decorMaterials=[M(0x87916f),M(0x54754a),M(0xaf9675),M(0x5e9d67),M(0xd2ae63),M(0x5d8661)];
const dummy=new T.Object3D();
function decorations(cx,cz,root){
const items=[[],[],[],[],[],[]],colliders=[],x0=cx*CH,z0=cz*CH;
for(let n=0;n<38;n++){
const x=x0+.7+hash(cx*71+n,cz,44)*30.6,z=z0+.7+hash(cx,cz*73+n,45)*30.6;
if(Math.hypot(x,z)<23||(Math.abs(x-SALE.x)<SALE.w/2+5&&Math.abs(z-SALE.z)<SALE.d/2+5))continue;
const b=biome(x,z),h=hash(cx+n,cz-n,46);
let kind=0;
if(b===0)kind=h<.58?1:h<.83?5:0;
if(b===1)kind=h<.75?0:2;
if(b===2)kind=h<.65?2:0;
if(b===3)kind=h<.6?3:2;
if(b===4)kind=h<.72?4:5;
if(b===-1)kind=h<.55?1:0;
const scale=.55+hash(cx+n,cz+n,49)*1.5;
items[kind].push({x,z,scale,turn:hash(cx+n,cz,48)*6.28});
const solid=decorationCollider(kind,scale);
if(st.buildings.some(building=>pointInOrientedRect(x,z,facilityFootprint(building),.38+(solid?.r||0)))){items[kind].pop();continue}
if(solid)colliders.push({x,z,r:solid.r});
}
root.userData.decorationColliders=colliders;
root.userData.decorationBatches=[];
items.forEach((batch,i)=>{
if(!batch.length)return;
const geo=i===0||i===2?accentGeometry:i===3?cactusGeometry:i===4?stalkGeometry:weedGeometry;
const mesh=new T.InstancedMesh(geo,decorMaterials[i],batch.length);
mesh.receiveShadow=true;mesh.castShadow=false;
batch.forEach((obj,j)=>{dummy.position.set(obj.x,i===4?.4:i===3?obj.scale*.55:obj.scale*.14,obj.z);
dummy.rotation.set(0,obj.turn,0);dummy.scale.set(obj.scale,obj.scale*(i===4?1.3:1),obj.scale);
dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix)});
mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
root.userData.decorationBatches.push({mesh,instances:batch,kind:i});
})
}
function chunk(cx,cz){
const key=cx+','+cz;if(world.has(key))return;
const root=new T.Group(),nodes=[];
const x0=cx*CH,z0=cz*CH;
// Smooth vertex-colored terrain, continuous across streaming chunk borders.
const groundGeometry=new T.PlaneGeometry(CH,CH,16,16);
groundGeometry.rotateX(-Math.PI/2);
const vertexColors=[];
const basePalette=['#527751','#477c55'];
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
const floor=new T.Mesh(groundGeometry,terrainMaterial);
floor.position.set(x0+CH/2,-.025,z0+CH/2);
floor.rotation.y=0;floor.receiveShadow=true;
root.add(floor);
decorations(cx,cz,root);scene.add(root);
const c={root,nodes,hasNodes:false};world.set(key,c);trails.initChunk(c,cx,cz)
}
function populate(cx,cz,c){
if(c.hasNodes)return;c.hasNodes=true;
const x0=cx*CH,z0=cz*CH,key=cx+','+cz;
for(let i=0;i<13;i++){
const x=x0+2+hash(cx*17+i,cz,2)*28,z=z0+2+hash(cx,cz*17+i,3)*28;
if(Math.hypot(x,z)<23||(Math.abs(x-SALE.x)<SALE.w/2+6&&Math.abs(z-SALE.z)<SALE.d/2+6)||Math.hypot(x-10,z-1)<8)continue;
const b=biome(x,z);if(b<0)continue;
if(st.buildings.some(building=>pointInOrientedRect(x,z,facilityFootprint(building),1.1)))continue;
const o=node(b,x,z,key);c.nodes.push(o);
}
batchResourceNodes(T,c);
}
const generationQueue=[],queuedGeneration=new Set(),unloadQueue=[];
let streamingCenter='';
function stream(){
const position=inConstruction()?constructionFocus:player.position;
const cx=Math.floor(position.x/CH),cz=Math.floor(position.z/CH);
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
for(const [key,c] of world){
  if(populated>=2)break;
  if(!c.hasNodes){
    const [x,z]=key.split(',').map(Number);
    if(Math.abs(x-cx)<=R&&Math.abs(z-cz)<=R){populate(x,z,c);populated++}
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
n.mesh.traverse(o=>{
  if(o.isInstancedMesh)o.dispose?.();
  if(o.isMesh&&!o.geometry?.userData?.sharedWorldGeometry)o.geometry?.dispose();
});
if(n.log&&n.log!==carried){
  scene.remove(n.log);
  n.log.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
  n.log=null;
}
const index=resources.indexOf(n);if(index>=0)resources.splice(index,1);
}
world.delete(key)
}
}
}
}
// Shadow-map caster budget: only nearby decorative instanced batches enter
// the directional shadow pass, keeping thousands of distant objects visible
// without redrawing all of them into the shadow map.
let decorationShadowClock=0,decorationShadowX=Infinity,decorationShadowZ=Infinity;
function refreshDecorationShadows(dt){
  decorationShadowClock+=Math.max(0,dt);
  const dx=player.position.x-decorationShadowX,dz=player.position.z-decorationShadowZ;
  if(decorationShadowClock<1.15&&dx*dx+dz*dz<160)return;
  decorationShadowClock=0;decorationShadowX=player.position.x;
  decorationShadowZ=player.position.z;
  const quality=settings.quality;
  for(const [key,c] of world){
    const [cx,cz]=key.split(',').map(Number);
    const x=cx*CH+CH/2,z=cz*CH+CH/2;
    const near=Math.abs(x-player.position.x)<78&&
      Math.abs(z-player.position.z)<78;
    for(const batch of c.root.userData.decorationBatches||[]){
      const casts=quality!=='low'&&near&&
        (quality==='high'||batch.kind!==4);
      if(batch.mesh.castShadow!==casts)batch.mesh.castShadow=casts;
    }
  }
}
const resourceFrustum=new T.Frustum(),resourceProjection=new T.Matrix4(),
  resourceBoundingSphere=new T.Sphere(new T.Vector3(),5.6);
function updateResourceVisibility(){
  const px=player.position.x,pz=player.position.z;
  const range=settings.viewDistance+5.5,maximum=range*range;
  cam.updateMatrixWorld();
  resourceProjection.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);
  resourceFrustum.setFromProjectionMatrix(resourceProjection);
  const nearRange=Math.min(62,Math.max(39,settings.viewDistance*.48));
  const nearSquared=nearRange*nearRange;
  for(const o of resources){
    if(o.dead){
      o.mesh.visible=false;
      setDistantResource(T,o,false);continue;
    }
    const dx=o.x-px,dz=o.z-pz,d2=dx*dx+dz*dz;
    let visible=d2<=maximum;
    if(visible&&d2>=14*14){
      resourceBoundingSphere.center.set(o.x,2.1,o.z);
      visible=resourceFrustum.intersectsSphere(resourceBoundingSphere);
    }
    const batched=!!o.batchSlots?.length;
    const near=visible&&(!batched||d2<nearSquared);
    o.mesh.visible=near;
    if(batched)setDistantResource(T,o,visible&&!near);
  }
}
const count=()=>st.inv.reduce((a,b)=>a+b,0)+st.products.reduce((a,b)=>a+b,0);
let touchControls=null,mouseFree=false,cameraRecoveryRequested=false;
const immersion=createScreenImmersion({button:$('fullscreenButton'),
  isMobile:()=>!!touchControls?.enabled||navigator.maxTouchPoints>0});
let heading=0,pitch=.38,dist=10,active=0,keys={},current=null,placing=null,carried=null,carriedSource=null,elapsed=0,workerClock=0;
let buildingPreview=null,previewMaterials=[],lastPlacementValid=null;
let roadEditing=false,roadMode='build',roadSurface='road';
const constructionFocus=new T.Vector3(),constructionRay=new T.Raycaster();
const constructionPlane=new T.Plane(new T.Vector3(0,1,0),0);
const constructionHit=new T.Vector3();
let constructionDistance=24,constructionPointer=null,constructionDrag=null,constructionOrbit=null;
let cameraBeforeConstruction=null;
const inConstruction=()=>!!placing||roadEditing;
let harvesting=null,harvestProgress=0,stepPhase=0,autoMode=false;
function* nearbyResourceNodes(){
  const cx=Math.floor(player.position.x/CH),cz=Math.floor(player.position.z/CH);
  for(let x=cx-2;x<=cx+2;x++)for(let z=cz-2;z<=cz+2;z++){
    const c=world.get(x+','+z);
    if(c)yield* c.nodes;
  }
}
const sound=createSound();const atmosphere=createAtmosphere(T,scene,player,biome,nearbyResourceNodes);
const skyWeather=createSkyWeather(T,scene,player,cam,sun,hemisphere,{
  viewDistance:()=>settings.viewDistance,
  quality:()=>settings.effects?settings.quality:'low',
  seed:st.seed
});
const nightLighting=createNightLighting(T,scene,{
  buildings:()=>st.buildings,
  fixedBuildings:[{id:'central-market',x:0,z:0,rotation:0}],roads,player,
  viewDistance:()=>settings.viewDistance,
  quality:()=>settings.quality,
  isBlocked:(x,z)=>industry.blocked(x,z,.45)
});
const baseCamp=createBaseCamp(T,scene);
atmosphere.setEnabled(settings.effects&&settings.quality!=='low');
sound.setVolume(settings.volume);
sound.setEnabled(!settings.muted);
applyQuality(renderer,sun,settings.quality,settings.renderScale);
scene.fog.near=settings.viewDistance*.71;
scene.fog.far=settings.viewDistance*.96;
let audioActive=true,atmosphereActive=true;
const maxStamina=()=>100+Math.max(0,st.staminaLevel||0)*32;
const staminaRegen=()=>16+Math.max(0,st.staminaLevel||0)*4;
let stamina=maxStamina(),sprintLocked=false,footstepTimer=0,jumpVelocity=0;
const PLAYER_RADIUS=.43;
function sceneryBlocked(x,z,radius=.35){
  const cx=Math.floor(x/CH),cz=Math.floor(z/CH);
  const localX=x-cx*CH,localZ=z-cz*CH;
  // Only cross a chunk edge when a collider can possibly cross it.
  const xr=localX<2?[cx-1,cx]:localX>CH-2?[cx,cx+1]:[cx];
  const zr=localZ<2?[cz-1,cz]:localZ>CH-2?[cz,cz+1]:[cz];
  for(const ix of xr)for(const iz of zr){
    const c=world.get(ix+','+iz);
    if(!c)continue;
    for(const p of c.root.userData.decorationColliders||[]){
      const d=p.r+radius,dx=p.x-x,dz=p.z-z;
      if(Math.abs(dx)>d||Math.abs(dz)>d)continue;
      if(dx*dx+dz*dz<d*d)return true;
    }
  }
  return false;
}
function blocked(x,z){
if(industry.blocked(x,z,PLAYER_RADIUS))return true;
return Math.abs(x)<2.5+PLAYER_RADIUS&&Math.abs(z)<2+PLAYER_RADIUS;
}
function movePlayer(dx,dz){const x=player.position.x,z=player.position.z;
// Separate-axis checks permit natural sliding without passing through solid objects.
if(!blocked(x+dx,z))player.position.x=x+dx;
if(!blocked(player.position.x,z+dz))player.position.z=z+dz;
if(Math.hypot(player.position.x-x,player.position.z-z)>.025)
  roads.recordUse('player',player.position.x,player.position.z,st.gameMinutes);
}
const stopHarvest=()=>{harvesting=null;harvestProgress=0};
const harvestInterval=type=>([1.00,1.10,1.08,.94,.86][type])*TOOL_SPEED[Math.max(0,Math.min(5,st.tools[type]+1))]/expertiseHarvestSpeed(st,type)/(autoMode?autoSpeedMultiplier(st.autoLevel):1);
const TOOL_STROKES=[
  [[.55,1.15,.16],[.7,1.34,.19],[.92,1.58,.23],[.27,.6,.11],[.12,.3,.08]],
  [[.67,.9,.13],[.82,1.1,.16],[.94,1.3,.20],[.21,.4,.08],[.11,.24,.07]],
  [[.6,.83,.12],[.76,1.05,.16],[.32,.44,.11],[.16,.24,.08],[.09,.12,.05]],
  [[.52,.7,.15],[.72,.95,.18],[.78,1.08,.20],[.25,.44,.10],[.12,.21,.06]],
  [[.64,.80,.18],[.86,.95,.2],[.99,1.12,.22],[.30,.51,.12],[.16,.25,.08]]
];
function animatePlayer(dt,moving,sprinting=false){
stepPhase+=dt*(moving?(sprinting?16.8:11.4):2.1);
const stride=moving?Math.sin(stepPhase)*(sprinting?.91:.59):0;
leftLeg.rotation.x=T.MathUtils.damp(leftLeg.rotation.x,stride,13,dt);
rightLeg.rotation.x=T.MathUtils.damp(rightLeg.rotation.x,-stride,13,dt);
avatar.position.y=T.MathUtils.damp(avatar.position.y,
  moving?Math.abs(Math.sin(stepPhase))*(sprinting?.115:.07):0,12,dt);
for(const variants of toolModels)for(const model of variants)model.visible=false;
if(bikeRiding){
  const rhythm=bicycle.distance/2.0;
  avatar.position.y=T.MathUtils.damp(avatar.position.y,.31,9,dt);
  avatar.rotation.x=T.MathUtils.damp(avatar.rotation.x,.25+(sprinting?.08:0),8,dt);
  avatar.rotation.y=T.MathUtils.damp(avatar.rotation.y,0,10,dt);
  avatar.rotation.z=T.MathUtils.damp(avatar.rotation.z,
    moving?Math.sin(rhythm)*.025:0,8,dt);
  const crank=moving?Math.sin(rhythm):0;
  leftLeg.rotation.x=T.MathUtils.damp(leftLeg.rotation.x,-.48+crank*.56,12,dt);
  rightLeg.rotation.x=T.MathUtils.damp(rightLeg.rotation.x,-.48-crank*.56,12,dt);
  leftArm.rotation.x=T.MathUtils.damp(leftArm.rotation.x,-1.10,12,dt);
  rightArm.rotation.x=T.MathUtils.damp(rightArm.rotation.x,-1.10,12,dt);
  leftArm.rotation.y=T.MathUtils.damp(leftArm.rotation.y,-.18,12,dt);
  rightArm.rotation.y=T.MathUtils.damp(rightArm.rotation.y,.18,12,dt);
  toolHolder.rotation.set(0,0,0);
  return;
}
if(harvesting){
const type=harvesting.type,tier=st.tools[type],interval=harvestInterval(type);
const phase=Math.min(1,harvestProgress/Math.max(.15,interval));
const lift=Math.sin(phase*Math.PI)**2,impact=Math.sin(phase*Math.PI*2);
const heavy=tier>=3,mechanical=tier>=2&&(type===2||type===3||type===4);
const toolPattern=TOOL_STROKES[type][Math.max(0,Math.min(4,tier))];
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
   const motor=toolModels[type][tier].userData.motor;
   if(motor){
     const rate=tier===4?28:21;
     if(type===0||type===4)motor.rotation.z+=dt*rate;
     else if(type===1)motor.position.y=-.88+Math.sin(phase*Math.PI*10)*.09;
     else motor.rotation.y+=dt*rate;
   }
  if(type===0){
    // The tree stands along the avatar's +Z axis. The axe bit is modelled
    // toward local +X, so rotate the blade -90° around Y to face the trunk.
    // The swing is sideways at chest height, not a vertical pickaxe chop.
    const sideSwing=Math.sin(phase*Math.PI*2);
    const arc=Math.sin(phase*Math.PI);
    pose(rightArm,heavy?-1.13:-1.28,-.64+sideSwing*(heavy?.29:.78),-.27+arc*.15);
    pose(leftArm,heavy?-1.09:-1.11,-.30+sideSwing*.27,.21-arc*.14);
    toolHolder.rotation.set(-.22+arc*.10,-Math.PI/2+sideSwing*.12,.12);
    avatar.rotation.y=sideSwing*(heavy?.055:.14);
    avatar.rotation.x=.018*impact;avatar.rotation.z=-.036*sideSwing;
  }else if(type===1){
    pose(rightArm,heavy?-1.25+stroke:-1.00-reach*swing,0,-.2-stroke*.3);
    pose(leftArm,-.7-.6*lift,0,-.26);
    toolHolder.rotation.set(heavy?-.8:-.75+.36*lift,heavy?-.23:-Math.PI/2,.04*impact);
    avatar.rotation.x=.1*impact;
  }else if(type===2){
    pose(rightArm,mechanical?-1.42+stroke:-.94-reach*swing,.06,-.1);
    pose(leftArm,mechanical?-1.37:-.7,0,.12);
    toolHolder.rotation.set(mechanical?-1.1+.06*impact:-.8+.24*lift,mechanical?0:-Math.PI/2,.03*impact);
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
const jumping=player.position.y>.07;
if(jumping){
  const fall=jumpVelocity<0,amplitude=Math.min(1,player.position.y/1.35);
  avatar.rotation.x=T.MathUtils.damp(avatar.rotation.x,fall?.11:-.13,10,dt);
  avatar.rotation.y=smooth(avatar.rotation.y);
  avatar.rotation.z=T.MathUtils.damp(avatar.rotation.z,Math.sin(stepPhase)*.035,8,dt);
  leftLeg.rotation.x=T.MathUtils.damp(leftLeg.rotation.x,fall?.30:-.51,13,dt);
  rightLeg.rotation.x=T.MathUtils.damp(rightLeg.rotation.x,fall?-.13:-.28,13,dt);
  leftArm.rotation.x=T.MathUtils.damp(leftArm.rotation.x,-.48-amplitude*.38,12,dt);
  rightArm.rotation.x=T.MathUtils.damp(rightArm.rotation.x,-.36-amplitude*.47,12,dt);
}else{
  avatar.rotation.x=T.MathUtils.damp(avatar.rotation.x,sprinting?-.11:0,13,dt);
  avatar.rotation.y=smooth(avatar.rotation.y);
  avatar.rotation.z=T.MathUtils.damp(avatar.rotation.z,sprinting?.035*Math.sin(stepPhase):0,12,dt);
  rightArm.rotation.x=T.MathUtils.damp(rightArm.rotation.x,moving?stride*(sprinting?.85:.64):0,13,dt);
  leftArm.rotation.x=T.MathUtils.damp(leftArm.rotation.x,moving?-stride*(sprinting?.85:.64):0,13,dt);
}
rightArm.rotation.y=smooth(rightArm.rotation.y);rightArm.rotation.z=smooth(rightArm.rotation.z);
leftArm.rotation.y=smooth(leftArm.rotation.y);leftArm.rotation.z=smooth(leftArm.rotation.z);
toolHolder.rotation.set(smooth(toolHolder.rotation.x),smooth(toolHolder.rotation.y),smooth(toolHolder.rotation.z));
}
cargo.rotation.z=moving?Math.sin(stepPhase)*(sprinting?.065:.04):0;
}
function syncHudDimensions(){
  const mini=$('miniInventory');
  if(!mini)return;
  const factor=Math.max(.7,Math.min(1.4,settings.hudScale||1));
  // getBoundingClientRect includes the transformed HUD; convert to local coordinates.
  $('hud').style.setProperty('--inventory-panel-height',Math.ceil(mini.getBoundingClientRect().height/factor)+'px');
  $('hud').style.setProperty('--inventory-panel-width',Math.ceil(mini.getBoundingClientRect().width/factor)+'px');
}
function applyHudSettings(){
  const hud=$('hud'),factor=Math.max(.7,Math.min(1.4,settings.hudScale||1));
  document.documentElement.style.setProperty('--nim-hud-scale',String(factor));
  hud.style.setProperty('--hud-scale',String(factor));
  hud.style.setProperty('--minimap-size',settings.minimapSize+'px');
  // Transforming a fixed element makes it the viewport for its descendants.
  // Inverse dimensions keep their edges anchored for both mobile orientations.
  hud.style.width=Math.ceil(window.innerWidth/factor)+'px';
  hud.style.height=Math.ceil(window.innerHeight/factor)+'px';
  syncHudDimensions();
}
const mobileVehicleButton=$('mobileControls')?.querySelector('[data-touch-action="vehicle"]');
let lastMobileBikeAvailable=null;
function syncMobileVehicle(){
  const available=!!st.bicycle;
  if(lastMobileBikeAvailable===available)return;
  lastMobileBikeAvailable=available;
  mobileVehicleButton?.classList.toggle('hidden',!available);
}
function updateInventory(){
syncMobileVehicle();
const grid=$('inventoryGrid');if(!grid)return;
$('miniInventory').dataset.capacity=String(st.bag);
const items=[];for(let i=0;i<5;i++)for(let j=0;j<st.inv[i];j++)items.push(i);
for(let i=0;i<5;i++)for(let j=0;j<st.products[i];j++)items.push(i+5);
const signature=st.bag+':'+items.join(',');if(grid.dataset.signature===signature)return;grid.dataset.signature=signature;
grid.innerHTML=Array.from({length:st.bag},(_,i)=>{
const type=items[i],title=type===undefined?'':tr(type<5?raw[type]:processed[type-5],settings.language);
return '<div class="inventory-slot'+(type===undefined?' empty':'')+'"'+(type===undefined?'':' title="'+title+'"')+'>'+
(type===undefined?'':'<span class="inventory-symbol resource-'+(type%5)+'">'+inventoryIcon(type)+'</span>')+'</div>';
}).join('');
$('inventoryCapacity').textContent=count()+' / '+st.bag;updateCargo();syncHudDimensions()
}function pop(s){let e=$('notice');e.textContent=tr(s,settings.language);e.classList.add('show');clearTimeout(pop.t);pop.t=setTimeout(()=>e.classList.remove('show'),2200)}
function closest(){
let best=null,score=Infinity,px=player.position.x,pz=player.position.z;
const fx=Math.sin(player.rotation.y),fz=Math.cos(player.rotation.y);
for(const o of nearbyResourceNodes()){
if(o.dead)continue;
const dx=o.x-px,dz=o.z-pz,d=Math.hypot(dx,dz);
if(d>3.8)continue;
const dot=(dx*fx+dz*fz)/Math.max(.01,d);
const quality=d+(dot<.1?1.2:dot<.5?.4:0);
if(quality<score){score=quality;best=o}
}
for(const b of st.buildings){
const d=Math.hypot(px-b.x,pz-b.z);
if(d<5.45&&d<score){score=d;best=b}
}
return best
}

function sell({notifyEmpty=true,includeCarried=isSelling(player.position.x,player.position.z)}={}){
  stopHarvest();
  const bagValue=st.inv.reduce((sum,n,i)=>sum+Math.round(n*values[i]*expertiseMultiplier(st,i)),0);
  const productValue=st.products.reduce((sum,n,i)=>sum+Math.round(n*values[i]*3*expertiseMultiplier(st,i)),0);
  const oldStorage=st.stock.reduce((sum,i)=>sum+Math.round(values[i]*expertiseMultiplier(st,i)),0);
  const logValue=includeCarried&&carried?values[0]:0;
  const amount=bagValue+productValue+oldStorage+logValue;
  if(amount<=0){if(notifyEmpty)pop('Aucune marchandise à vendre');return 0}
  st.inv.fill(0);st.products.fill(0);st.stock=[];
  if(logValue){scene.remove(carried);carried=null;carriedSource=null}
  st.gold+=amount;if(settings.goldSound!==false)sound.effect('sale');
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


// No respawn or retry queue: exhausted world resource nodes are permanent.
// Continue passive HP recovery only for nodes that have not been exhausted.
let nextResourceRecovery=0;
function renewResources(){
  if(elapsed<nextResourceRecovery)return;
  nextResourceRecovery=elapsed+2;
  resourceLife.update(resources);
}
function strikeHarvest(){
  const o=harvesting;
  if(!o||o.dead||!resources.includes(o)||
     Math.hypot(player.position.x-o.x,player.position.z-o.z)>3.5){
    stopHarvest();return;
  }
  if(count()>=st.bag){
    stopHarvest();
    if(!autoMode)pop('Inventaire plein');
    return;
  }
  const damage=TOOL_YIELD[Math.max(0,Math.min(5,st.tools[o.type]+1))];
  o.hp=Math.max(0,o.hp-damage);
  resourceLife.hit(o);
  sound.effect(o.type);
  harvestFx.emit(o,player.position);
  const gained=Math.min(damage,st.bag-count());
  st.inv[o.type]+=gained;
  // Automatic mode must leave immediately when the last bag slot fills.
  // Otherwise the harvest animation can hold the autopilot beside this node.
  if(autoMode&&count()>=st.bag)stopHarvest();
  if(o.hp<=0){
    resourceLife.deplete(o);
    setDistantResource(T,o,false);
    stopHarvest();
    if(o.type===0){
      const log=new T.Group(),trunk=cy(.36,3.2,m.tree);
      trunk.rotation.z=Math.PI/2;log.add(trunk);
      log.position.set(o.x,.42,o.z);scene.add(log);o.log=log;o.logPlacedAt=elapsed;
      if(!autoMode)pop('Arbre abattu · F pour porter le tronc');
    }else if(!autoMode)pop(raw[o.type]+' épuisé');
  }
  updateInventory();
  save();
}

function constructionGround(clientX,clientY){
  const rect=renderer.domElement.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  const ndc=new T.Vector2((clientX-rect.left)/rect.width*2-1,
    1-(clientY-rect.top)/rect.height*2);
  constructionRay.setFromCamera(ndc,cam);
  const hit=constructionRay.ray.intersectPlane(constructionPlane,constructionHit);
  if(!hit||!Number.isFinite(hit.x+hit.z))return null;
  return {x:Math.round(hit.x),z:Math.round(hit.z)};
}
function placementPoint(){
  const screen=constructionPointer||{x:innerWidth/2,y:innerHeight/2};
  return constructionGround(screen.x,screen.y)||{
    x:Math.round(constructionFocus.x),z:Math.round(constructionFocus.z)};
}
function enterConstruction(label,roadsMode=false){
  stopHarvest();autoPilot.setEnabled(false);
  if(bikeRiding){bikeRiding=false;bicycle.group.visible=false}
  cameraBeforeConstruction={heading,pitch,dist};
  constructionFocus.copy(player.position);
  constructionDistance=24;pitch=.82;
  constructionPointer=null;constructionDrag=null;constructionOrbit=null;
  roadEditing=roadsMode;
  document.body.classList.add('construction-mode','touch-placement');
  document.exitPointerLock?.();
  cameraRecoveryRequested=false;mouseFree=true;
  document.body.classList.add('mouse-free');
  panel=null;renderPanel();
  $('placementHud').classList.remove('hidden');
  $('placementName').textContent=label;
  $('roadControls').classList.toggle('hidden',!roadsMode);
  $('rotationHint').classList.toggle('hidden',roadsMode);
  $('placementConfirmHint').classList.toggle('hidden',roadsMode);
  refreshRoadControls();
}
function leaveConstruction(){
  roadEditing=false;constructionDrag=null;constructionOrbit=null;
  document.body.classList.remove('construction-mode','touch-placement');
  $('placementHud').classList.add('hidden');
  $('roadControls').classList.add('hidden');
  constructionPointer=null;
  if(cameraBeforeConstruction){
    heading=cameraBeforeConstruction.heading;
    pitch=cameraBeforeConstruction.pitch;
    dist=cameraBeforeConstruction.dist;
    cameraBeforeConstruction=null;
  }
  mouseFree=false;document.body.classList.remove('mouse-free');
  resumeCameraControl();
}
function refreshRoadControls(){
  for(const button of $('roadControls').querySelectorAll('button')){
    button.classList.toggle('active',button.dataset.roadMode===roadMode&&
      (roadMode==='demolish'||button.dataset.roadSurface===roadSurface));
  }
  if(roadEditing){
    $('placementStatus').textContent=roadMode==='demolish'
      ?'GLISSEZ POUR DÉCONSTRUIRE DES SEGMENTS'
      :'TRACEZ DES '+(roadSurface==='path'?'CHEMINS':'ROUTES')+' AVEC LE CURSEUR';
  }
}
function beginRoadDrawing(){
  if(placing)cancelPlacement();
  roadMode='build';roadSurface='road';
  enterConstruction('VOIRIE · DESSIN MANUEL',true);
  pop('Dessinez au sol · les employés construiront progressivement');
}
function paintRoad(a,b=a){
  if(!roadEditing||!a||!b)return 0;
  const changed=roads.paint(a,b,roadMode,roadSurface);
  if(changed)roadSurfaces.update(.7);
  return changed;
}
function placementAllowed(x,z){
  if(!placing)return false;
  const proposed=facilityFootprint({kind:placing.kind,rotation:placing.rotation,x,z});
  const camp={x:0,z:0,w:13,d:14,angle:0};
  const sale={x:SALE.x,z:SALE.z,w:SALE.w+2,d:SALE.d+2,angle:0};
  if(footprintsOverlap(proposed,camp,1.1)||footprintsOverlap(proposed,sale,1.4))return false;
  if(st.buildings.some(b=>footprintsOverlap(proposed,facilityFootprint(b),1.15)))return false;
  if(pointInOrientedRect(player.position.x,player.position.z,proposed,1.5))return false;
  // Nearby nodes and decoration are cleared on construction.
  return true;
}
function clearPlacementObstacles(building){
 const area=facilityFootprint(building),margin=.38;
 for(const [chunkKey,c] of world){
  const [cx,cz]=chunkKey.split(',').map(Number);
  for(const node of c.nodes){
   if(!pointInOrientedRect(node.x,node.z,area,margin+.65))continue;
   node.dead=true;node.hp=0;node.mesh.visible=false;
   setDistantResource(T,node,false);
   if(node.log){scene.remove(node.log);node.log=null;node.logPlacedAt=0}
  }
  for(const batch of c.root.userData.decorationBatches||[]){
   const survivors=batch.instances.filter(o=>!pointInOrientedRect(o.x,o.z,area,margin+(decorationCollider(batch.kind,o.scale)?.r||0)));
   if(survivors.length===batch.instances.length)continue;
   batch.instances=survivors;batch.mesh.count=survivors.length;
   survivors.forEach((o,j)=>{
    dummy.position.set(o.x,batch.kind===4?.4:batch.kind===3?o.scale*.55:o.scale*.14,o.z);
    dummy.rotation.set(0,o.turn,0);dummy.scale.set(o.scale,o.scale*(batch.kind===4?1.3:1),o.scale);
    dummy.updateMatrix();batch.mesh.setMatrixAt(j,dummy.matrix);
   });
   batch.mesh.instanceMatrix.needsUpdate=true;
  }
  c.root.userData.decorationColliders=(c.root.userData.decorationColliders||[]).filter(o=>!pointInOrientedRect(o.x,o.z,area,margin+o.r));
 }
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
  const info={kind:placing.kind,type:placing.type,x:0,z:0,rotation:placing.rotation};
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
  const biomeType=0;
  placing={kind,type:biomeType,cost,rotation:0};
  enterConstruction(kind==='worker'?'CABANE DE BÛCHERON':
    kind==='factory'?'SCIERIE':kind==='road'?'ATELIER DE VOIRIE':
    kind==='transport'?'DÉPÔT DE TRANSPORT':'COMPTOIR VENDEUR');
  $('placementName').textContent=tr(kind==='worker'?worksites[type]:kind==='factory'?factories[type]:
    kind==='transport'?'Dépôt de transport':kind==='road'?'Atelier de voirie':'Comptoir vendeur',settings.language);
  $('placementHud').classList.remove('hidden');
  buildPlacementPreview();
  pop('Choisissez un emplacement puis appuyez sur F');
}
function rotatePlacement(steps=1){
  if(!placing)return;
  placing.rotation=normalizeRotation(placing.rotation+steps*Math.PI/2);
  if(buildingPreview)buildingPreview.group.rotation.y=placing.rotation;
  lastPlacementValid=null;
  placementFrame();
}
function cancelPlacement(refund=true){
  if(!placing)return;
  if(refund){st.gold+=placing.cost||0;save();pop('Construction annulée · or remboursé')}
  placing=null;
  clearPlacementPreview();
  leaveConstruction();
}
function placementFrame(){
  if(!placing||!buildingPreview)return;
  const point=placementPoint();
  const type=0;
  if(type!==placing.type){
    placing.type=type;
    buildPlacementPreview();
  }
  placing.x=point.x;placing.z=point.z;
  buildingPreview.group.position.set(point.x,0,point.z);
  buildingPreview.group.rotation.y=placing.rotation;
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
st.buildings.push({kind:placing.kind,type:placing.type,x,z,rotation:placing.rotation,workers:0,stock:0,stockRaw:0,inputRaw:0,stockProcessed:0});
addBuilding(st.buildings.at(-1));
clearPlacementObstacles(st.buildings.at(-1));
cancelPlacement(false);
sound.effect('build');pop('Bâtiment construit');save();return;
}
if(carried)return;
if(bikeRiding)return pop(settings.language==='fr'?'Descendez du vélo pour récolter':'Dismount the bicycle to harvest');
const o=closest();if(!o)return;
if(o.kind){
  employeeFilterId=o.id;
  openPanel('employees');
  return;
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
  const src=carriedSource&&resources.includes(carriedSource)?carriedSource:
    resources.find(o=>o.type===0&&o.dead&&!o.log&&
      Math.hypot(o.x-player.position.x,o.z-player.position.z)<20);
  if(src){src.log=item;src.logPlacedAt=elapsed;}
  else scene.remove(item);
  carried=null;carriedSource=null;
  pop('Tronc déposé');save();
}
function nearbyBuildingEntrance(){
  let best=null,bestDistance=2.55;
  for(const b of st.buildings){
    const entrance=worldPoint(b,0,b.kind==='factory'?4.95:3.60);
    const d=Math.hypot(player.position.x-entrance.x,player.position.z-entrance.z);
    if(d<bestDistance){best=b;bestDistance=d}
  }
  return best;
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
    carried=fallen.log;carriedSource=fallen;fallen.log=null;
    pop('Transportez le tronc vers la zone VENDRE');return;
  }
  if(carried)return pop(settings.language==='fr'?'Appuyez sur X pour déposer le rondin':'Press X to drop the log');
  const pile=nearestStock(st.buildings,player.position,b=>industry.buildingGeometry(b.id)?.stockPoints);
  if(pile){
    activeStorage={buildingId:pile.building.id,kind:pile.kind};
    openPanel('storage');return;
  }
  const entrance=nearbyBuildingEntrance();
  if(entrance){
    employeeFilterId=entrance.id;
    openPanel('employees');return;
  }
  if(Math.hypot(px,pz)<7)return openPanel('market');
  harvest();
}


function buy(cost,fn){if(st.gold<cost){sound.effect('exhausted');return pop('Or insuffisant')}st.gold-=cost;sound.effect('buy');fn();updateInventory();save();renderPanel()}
function toggleBike(){
  if(!st.bicycle)return pop(settings.language==='fr'?'Achetez un vélo au comptoir':'Buy a bicycle at the market');
  if(carried)return pop(settings.language==='fr'?'Déposez le rondin avant de monter':'Drop the log before mounting');
  bikeRiding=!bikeRiding;
  bicycle.group.visible=bikeRiding;
  if(bikeRiding){stopHarvest();autoPilot.setEnabled(false)}
  sound.effect('ui');
  pop(bikeRiding?(settings.language==='fr'?'À vélo · V pour descendre':'Cycling · V to dismount'):
    (settings.language==='fr'?'Vélo rangé':'Bicycle parked'));
}
const industry=createIndustry(T,scene,st,resources,biome,SALE,values,{
onSale(amount){save()},
canBreakLog(node){return node.type===0&&node.dead&&!!node.log&&
  elapsed-(node.logPlacedAt??Infinity)>=60;},
onLogCut(node){
  if(!node.log)return;
  scene.remove(node.log);
  node.log.traverse(o=>{if(o.isMesh)o.geometry?.dispose()});
  node.log=null;node.logPlacedAt=0;
  save();
},
priceMultiplier(type){return expertiseMultiplier(st,type)},
onResourceHit(node){
  resourceLife.hit(node);
  harvestFx.emit(node,player.position);
},
onResourceDepleted(node){
  resourceLife.deplete(node);
  setDistantResource(T,node,false);
  save();
},
blocked:sceneryBlocked,
roads,
onMove(id,x,z,role){trails.recordMovement(id,x,z);
  if(role!=='road')roads.recordUse(id,x,z,st.gameMinutes)}
});
roads.setProbes({
  blocked:(x,z,r)=>industry.blocked(x,z,r),
  traffic:(x,z)=>trails.traffic(x,z),
  invalidate:(x,z)=>trails.invalidate(x,z)
});
function addBuilding(b){const result=industry.register(b);roads.invalidatePlan();return result}
st.buildings.forEach(addBuilding);
const wildlife=createWildlife(T,scene,{
  biomeAt:biome,seed:st.seed,
  blocked:(x,z,r)=>industry.blocked(x,z,r),
  quality:()=>settings.quality,
  viewDistance:()=>settings.viewDistance,
  playerPosition:()=>player.position,
  daylight:()=>skyWeather.dayFactor,
  worldTime:()=>st.gameMinutes
});
const autoPilot=createAutoPilot({
  player,blocked,move:movePlayer,resources:()=>resources,
  count,capacity:()=>st.bag,isSelling,sale:SALE,
  isHarvesting:()=>!!harvesting,
  cancelHarvest:stopHarvest,
  harvest:o=>{
    if(o.dead||count()>=st.bag)return;
    harvesting=o;harvestProgress=0;
    player.rotation.y=Math.atan2(o.x-player.position.x,o.z-player.position.z);
  },
  sell:()=>sell({notifyEmpty:false,includeCarried:true}),
  speedMultiplier:()=>autoSpeedMultiplier(st.autoLevel),
  terrainSpeed:(x,z)=>roads.speedAt(x,z),
  hasRoads:()=>roads.built>0,
  toolTier:type=>st.tools[type]??-1,
  onChange:on=>{
    autoMode=on;
    syncAutoEyes(on);
    $('autoState').classList.toggle('hidden',!on);
    $('autoShortcut').classList.toggle('active',on);
    updateAutoIndicator();
  }
});

function updateAutoIndicator(){
  const fr=settings.language==='fr';
  $('autoState').innerHTML='<span class="auto-title">'+(fr?'MODE AUTO':'AUTO MODE')+
    '</span><small class="auto-penalty">'+
    (autoSpeedMultiplier(st.autoLevel)===1?(fr?'Aucun malus':'No penalty'):(autoSpeedMultiplier(st.autoLevel)>1?'+':'−')+Math.round(Math.abs(autoSpeedMultiplier(st.autoLevel)-1)*100)+'% '+(fr?'vitesse et récolte':'movement and harvest speed'))+
    '</small>';
}
const facilityNames={
  fr:{worker:worksites,factory:factories,transport:['Dépôt de transport'],seller:['Comptoir vendeur'],road:['Atelier de voirie']},
  en:{worker:['Logging hut','Quarry','Mine','Earthworkers camp','Farm'],
    factory:['Sawmill','Stone workshop','Foundry','Glassworks','Mill'],
    transport:['Freight depot'],seller:['Trade house'],road:['Roadworks depot']}
};
const employeeNames={
  fr:{worker:['bûcheron','carrier','mineur','terrassier','agriculteur'],road:['cantonnier'],
    factory:['scieur','tailleur de pierre','fondeur','verrier','meunier'],
    transport:['logisticien'],seller:['vendeur']},
  en:{worker:['logger','quarry worker','miner','earthworker','farmer'],road:['road builder'],
    factory:['sawyer','stonemason','smelter','glassmaker','miller'],
    transport:['logistics operator'],seller:['salesperson']}
};
const facilityName=b=>{
  const names=facilityNames[settings.language]?.[b.kind]||facilityNames.fr.worker;
  return names[b.kind==='worker'||b.kind==='factory'?b.type:0]||names[0];
};
const recruitName=b=>{
  const names=employeeNames[settings.language]?.[b.kind]||employeeNames.fr.worker;
  return names[b.kind==='worker'||b.kind==='factory'?b.type:0]||names[0];
};
const panels={market:'COMPTOIR',build:'CONSTRUCTION',employees:'EMPLOYÉS',storage:'DÉPÔT',talents:'PROGRESSION',settings:'PARAMÈTRES'};
function menuShortcut(code,bindings){
  for(const panel of ['market','build','talents']){
    if(code===bindings[panel])return panel;
  }
  return null;
}
let employeeFilterId=null,activeStorage=null;
let panel=null;
const biomeIcons=['♧','◆','◈','◒','✺'];
const add=(title,sub,cost,action,off=false,biomeId=-1)=>`<article class="shop-card ${biomeId>=0?'biome-'+biomeId:''}">
<div class="shop-card-head"><span class="item-icon">${biomeId>=0?biomeIcons[biomeId]:'✦'}</span><div><strong>${title}</strong><small>${sub}</small></div></div>
<button data-action="${action}" ${off?'disabled':''}>${cost}</button></article>`;
const section=(title,kicker,content)=>`<section class="catalog-section"><div class="catalog-heading"><h3>${title}</h3><span>${kicker}</span></div><div class="catalog-grid">${content}</div></section>`;
function resumeCameraControl(){
  if(inConstruction())return;
  // Closing any desktop overlay defaults to camera control, never free cursor.
  // Pointer Lock may require a real key/click activation; a later left click
  // still retries in browsers that deny immediate reacquisition (e.g. Escape).
  if(touchControls?.enabled||panel||exploration.visible||
    !$('welcome').classList.contains('hidden')||
    !$('creator').classList.contains('hidden'))return;
  cameraRecoveryRequested=true;
  mouseFree=false;document.body.classList.remove('mouse-free');
  if(document.pointerLockElement===renderer.domElement){
    cameraRecoveryRequested=false;return;
  }
  try{
    const attempt=renderer.domElement.requestPointerLock?.();
    attempt?.catch?.(()=>{cameraRecoveryRequested=false;});
  }catch{cameraRecoveryRequested=false}
}
function openPanel(k){
  if(inConstruction())return;
  if(panel===k){close();return}
  sound.effect('ui');panel=k;cameraRecoveryRequested=false;
  touchControls?.clear?.();renderPanel();
  document.exitPointerLock?.();
}
function renderPanel(){
const box=$('panel');box.classList.toggle('hidden',!panel);if(!panel)return;
const focus=panel==='employees'&&employeeFilterId
  ?st.buildings.find(b=>b.id===employeeFilterId):null;
const storageBuilding=panel==='storage'
 ?st.buildings.find(b=>b.id===activeStorage?.buildingId):null;
$('panelTitle').textContent=storageBuilding?facilityName(storageBuilding):focus?facilityName(focus):
  panel==='settings'?UI[settings.language].settings:tr(panels[panel],settings.language);
const tagNames=settings.language==='fr'
 ?{market:'ÉQUIPEMENT',build:'BÂTIMENTS',employees:'PERSONNEL',storage:'STOCK',talents:'AMÉLIORATIONS',settings:'OPTIONS'}
 :{market:'EQUIPMENT',build:'BUILDINGS',employees:'STAFF',storage:'STOCK',talents:'UPGRADES',settings:'OPTIONS'};
$('panelTag').textContent=tagNames[panel]||'N.I.M';
const noTabs=panel==='settings'||panel==='storage';
$('tabs').classList.toggle('hidden',noTabs);
$('tabs').innerHTML=noTabs?'':['market','build','employees','talents'].map(k=>
  '<button data-tab="'+k+'" '+(panel===k?'class="active"':'')+'>'+tr(panels[k],settings.language)+'</button>').join(' ');
$('resume').textContent=panel==='storage'
 ?keyLabel('KeyF')+' · '+(settings.language==='fr'?'Fermer':'Close'):UI[settings.language].back;
if(panel==='settings'){
  $('shopbody').innerHTML=optionsMarkup(settings,awaitingBinding,vault.id);
  $('panelhint').textContent='';
  return;
}
let out='';
if(panel==='market'){
let group='';for(let i=0;i<1;i++){
const tier=st.tools[i]+1;if(tier>=5)continue;
const cost=toolCost(i,tier);
group+=add(settings.language==='en'?EQUIPMENT[i][tier]:tools[i][tier],types[i]+' · Palier '+(tier+1)+' / 5',cost+' OR','tool:'+i,false,i);
}
out+=section('Outils & récolte','INDUSTRIE FORESTIÈRE',group||'<p class="catalog-empty">Tous les outils sont au niveau maximum.</p>');
let utility='';
if(st.bag===8)utility+=add('Sac renforcé','8 → 16 emplacements',ECONOMY.bag+' OR','bag');
if(st.bag===16)utility+=add('Sac de randonnée','16 → 24 emplacements',ECONOMY.bag24+' OR','bag24');

if(!st.bicycle)utility+=add('Vélo utilitaire','Déplacement accéléré · sprint à vélo · V pour monter',ECONOMY.bicycle+' OR','bicycle');
out+=section('Équipement','CONSERVATION & MOBILITÉ',utility||'<p class="catalog-empty">Équipement entièrement amélioré.</p>');

}
if(panel==='build'){
out+=section('Plans de voirie','CONSTRUCTION MANUELLE',add('Dessiner des chemins et routes','Tracer ou effacer des plans · 2 cantonniers maximum','MODE CONSTRUCTION','roadDraw'));
out+=section('Logistique','TRANSPORT & COMMERCE',add('Dépôt de transport','Récolte → usine → entrepôt vendeur',buildingCost('transport')+' OR','transport:0')+add('Comptoir vendeur','Vend uniquement son propre stock',buildingCost('seller')+' OR','seller:0')+add('Atelier de voirie','Chantiers de chemins et routes, jusqu’à +50 % de vitesse',buildingCost('road')+' OR','road:0'));for(let i=0;i<1;i++){
out+=section(types[i]+' · '+raw[i].toUpperCase(),'CHAÎNE DE PRODUCTION',add(worksites[i],'Collecte automatique · stockage',buildingCost('worker',i)+' OR','worker:'+i,false,i)+add(factories[i],raw[i]+' → '+processed[i],buildingCost('factory',i)+' OR','factory:'+i,false,i));
}

}
if(panel==='employees'){
  const chosen=employeeFilterId?st.buildings.filter(b=>b.id===employeeFilterId):st.buildings;
  const fr=settings.language==='fr';
  if(!chosen.length)out+=section(fr?'Personnel':'Staff',fr?'AUCUN BÂTIMENT':'NO BUILDINGS',
    '<p class="catalog-empty">'+(fr?'Construisez un bâtiment pour recruter du personnel.':'Build a facility to hire workers.')+'</p>');
  else for(const b of chosen){
    const i=st.buildings.indexOf(b),limit=industry.workerLimit(b);
    const staff=Math.min(limit,b.workers),carrying=b.carryLevel||0;
    const name=facilityName(b),employee=recruitName(b);
    const stock=b.kind==='worker'?(fr?'Ressources brutes':'Raw materials')+': '+b.stockRaw
      :b.kind==='factory'?(fr?'Entrée':'Input')+': '+b.inputRaw+' · '+(fr?'Produits':'Products')+': '+b.stockProcessed
      :b.kind==='seller'?(fr?'En attente de vente':'Awaiting sale')+': '+
         ((b.warehouseRaw||[]).reduce((n,v)=>n+v,0)+(b.warehouseProcessed||[]).reduce((n,v)=>n+v,0))
      :b.kind==='road'?(fr?'Routes construites':'Built segments')+': '+roads.built+' · '+(fr?'Chantiers':'Queued jobs')+': '+roads.plannedCount
      :(fr?'Livraisons entre bâtiments':'Inter-building deliveries');
    const recruiting=add(fr?'Recrutement':'Recruitment',
      (fr?'Embaucher un ':'Hire a ')+employee+' · '+staff+' / '+limit,
      staff>=limit?'MAX':ECONOMY.hire+' OR','hire:'+i,staff>=limit,b.type);
    const cargoUpgrade=b.kind==='road'?'':add(fr?'Capacité de transport':'Transport capacity',
      (fr?'Niveau ':'Level ')+carrying+'/5 · '+(6+3*carrying)+' '+(fr?'unités':'units'),
      carrying>=5?'MAX':workerCarryCost(carrying)+' OR',
      'carry:'+i,carrying>=5,b.type);
    out+='<section class="facility-management biome-'+b.type+'">'+
      '<header class="facility-management-heading"><div><span class="facility-index">'+
      (fr?'BÂTIMENT ':'BUILDING ')+String(i+1).padStart(2,'0')+'</span>'+
      '<h3>'+name+'</h3></div><span class="facility-staff-count">'+
      staff+' / '+limit+' '+(fr?'employés':'workers')+'</span></header>'+
      '<p class="facility-production">'+stock+'</p>'+
      '<div class="facility-upgrade-grid">'+recruiting+cargoUpgrade+'</div></section>';
  }
}
if(panel==='storage'){
  const building=storageBuilding;
  if(!building){panel=null;renderPanel();resumeCameraControl();return}
  const field=building.kind==='worker'?'stockRaw':activeStorage.kind==='processed'?'stockProcessed':'inputRaw';
  const item=activeStorage.kind==='processed'?processed[building.type]:raw[building.type];
  const carrying=activeStorage.kind==='processed'?st.products[building.type]:st.inv[building.type];
  const fr=settings.language==='fr',name=tr(item,settings.language);
  const held=Math.max(0,Number(carrying)||0),stored=Math.max(0,Number(building[field])||0);
  const card=(action,shortcut,label,disabled)=>'<button class="stock-action" type="button" data-action="'+action+'"'+(disabled?' disabled':'')+
    '><kbd>'+keyLabel(shortcut)+'</kbd><span>'+label+'</span></button>';
  out+=section(name,fr?'RESSOURCE':'RESOURCE',
    '<div class="storage-management"><div class="storage-overview">'+
      '<span>'+(fr?'Entrepôt':'Storage')+' <strong>'+stored+' / '+industry.capacity+'</strong></span>'+
      '<span>'+(fr?'Sac':'Bag')+' <strong>'+held+'</strong></span></div>'+
      '<div class="storage-actions">'+
        card('stockDeposit','KeyA',fr?'Déposer':'Deposit',held<=0||stored>=industry.capacity)+
        card('stockWithdraw','KeyE',fr?'Retirer':'Withdraw',stored<=0||count()>=st.bag)+
      '</div></div>');
}

if(panel==='talents'){
const level=st.staminaLevel||0;
const autoLevel=Math.max(0,Math.min(4,st.autoLevel||0));
const autoNext=autoLevel<4?AUTO_UPGRADE_COSTS[autoLevel]:null;
out+=section(settings.language==='fr'?'Automatisation':'Automation',settings.language==='fr'?'EFFICIENCE DU MODE AUTO':'AUTO MODE EFFICIENCY',add(settings.language==='fr'?'Efficacité automatique':'Automatic efficiency',
  (autoLevel===0?'−20%':autoLevel===1?'−10%':autoLevel===2?'0%':autoLevel===3?'+10%':'+20%')+' → '+(autoLevel===4?'MAX':autoLevel===0?'−10%':autoLevel===1?'0%':autoLevel===2?'+10%':'+20%'),autoNext===null?'MAX':autoNext+' OR','autoUpgrade',autoNext===null));
out+=section('Endurance & sprint','PERFORMANCES',level<4?add('Endurance '+(level+1),'Réserve '+maxStamina()+' → '+(maxStamina()+32)+' · récupération +4/s',ECONOMY.stamina[level]+' OR','stamina'):add('Endurance MAX','Capacité maximale atteinte','MAX','noop',true));
out+=section('Expertise des métiers','SPÉCIALISATIONS',types.map((name,i)=>{
  const tier=Math.max(0,Math.min(MAX_EXPERTISE,st.talents[i]||0));
  const label=settings.language==='fr'
    ?'+12 % valeur de vente et +4,5 % vitesse de récolte par niveau'
    :'+12% sale value and +4.5% harvesting speed per level';
  return add(name+' · '+(settings.language==='fr'?'Niveau ':'Level ')+tier+'/'+MAX_EXPERTISE,
    label,tier>=MAX_EXPERTISE?'MAX':expertiseCost(i,tier)+' OR',
    'talent:'+i,tier>=MAX_EXPERTISE,i);
}).join(''));
}
$('shopbody').innerHTML=out;translateTree($('shopbody'),settings.language);
$('panelhint').textContent=panel==='storage'?'':
  st.gold.toLocaleString(settings.language==='fr'?'fr-FR':'en-US')+' '+(settings.language==='fr'?'or':'gold');
}
function clearCarriedInventory(){
  st.inv=[0,0,0,0,0];st.products=[0,0,0,0,0];st.stock=[];
  if(carried){scene.remove(carried);carried=null;carriedSource=null}
  stopHarvest();updateInventory();save();
}
function safeRespawn(){
  if(placing)cancelPlacement();
  if(bikeRiding){bikeRiding=false;bicycle.group.visible=false}
  autoPilot.setEnabled(false);
  clearCarriedInventory();
  player.position.set(0,0,9);
  player.rotation.y=Math.PI;
  jumpVelocity=0;st.x=0;st.z=9;
  stamina=maxStamina();streamingCenter='';
  close();save();
  pop(settings.language==='fr'?'Personnage débloqué · ressources transportées perdues':'Character unstuck · carried resources forfeited');
}
function resetEntireGame(){
  const fresh={
    gold:100,bag:8,inv:[0,0,0,0,0],products:[0,0,0,0,0],
    tools:[-1,-1,-1,-1,-1],talents:[0,0,0,0,0],
    buildings:[],stock:[],bicycle:false,staminaLevel:0,
    gameMinutes:0,x:0,z:9,
    seed:Math.floor(Math.random()*2000000000)+10000,worldVersion:3,forestFocusVersion:1,
    avatar:null,exhausted:{},explored:[],autoLevel:0,trails:{},roads:{}
  };
  vault.save(fresh).then(()=>location.reload()).catch(e=>{
    console.error('Cannot reset encrypted progress',e);pop('Save unavailable');
  });
}
$('panel').onclick=async e=>{
const button=e.target.closest('button');if(!button)return;
if(button.dataset.system){
  const action=button.dataset.system;
  if(action==='saveExport'){
    try{
      save();
      const code=await vault.backup();
      const area=$('vaultExportCode');
      $('vaultExport').classList.remove('hidden');
      area.value=code;
      let copied=false;
      try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(code);copied=true}}catch{}
      if(!copied){area.focus();area.select();copied=document.execCommand?.('copy')||false}
      $('vaultMessage').textContent=copied
        ?(settings.language==='fr'?'Code copié. Conservez-le dans un endroit privé.':'Recovery code copied. Store it privately.')
        :(settings.language==='fr'?'Sélectionnez et copiez ce code pour le conserver.':'Select and copy this code to keep it safe.');
    }catch(error){$('vaultMessage').textContent=String(error?.message||error)}
    return;
  }
  if(action==='requestImport'){$('vaultImport').classList.remove('hidden');return}
  if(action==='cancelImport'){$('vaultImport').classList.add('hidden');return}
  if(action==='confirmImport'){
    try{
      const code=$('vaultRecoveryCode').value;
      await vault.restore(code);
      location.reload();
    }catch(error){
      $('vaultMessage').textContent=settings.language==='fr'
        ?'Code invalide ou corrompu : '+String(error?.message||error)
        :'Invalid or damaged code: '+String(error?.message||error);
    }
    return;
  }
  if(action==='requestReset')$('resetConfirm').classList.remove('hidden');
  if(action==='cancelReset')$('resetConfirm').classList.add('hidden');
  if(action==='confirmReset')resetEntireGame();
  if(action==='unstuck')safeRespawn();
  return;
}
if(button.dataset.bind){awaitingBinding=button.dataset.bind;renderPanel();return}
if(button.dataset.tab){
  sound.effect('ui');
  employeeFilterId=null;
  activeStorage=null;
  panel=button.dataset.tab;
  return renderPanel();
}
const a=button.dataset.action;if(!a)return;
if(a==='stockDeposit'||a==='stockWithdraw'){
  return performStockTransfer(a==='stockDeposit'?'deposit':'withdraw');
}
if(a==='sell')return sell();
if(a==='roadDraw'){beginRoadDrawing();return}
if(a==='autoUpgrade'){
  const level=Math.max(0,Math.min(4,st.autoLevel||0));
  if(level>=4)return;
  return buy(AUTO_UPGRADE_COSTS[level],()=>{st.autoLevel=level+1;updateAutoIndicator()});
}
if(a==='bag')return buy(ECONOMY.bag,()=>st.bag=16);
if(a==='bag24')return buy(ECONOMY.bag24,()=>st.bag=24);
if(a==='stamina')return buy(ECONOMY.stamina[st.staminaLevel||0]||Infinity,()=>{st.staminaLevel=(st.staminaLevel||0)+1;stamina=maxStamina()});
if(a==='bicycle')return buy(ECONOMY.bicycle,()=>st.bicycle=true);
const [kind,id]=a.split(':'),i=+id;
if(kind==='tool'){
  const tier=st.tools[i]+1;
  if(tier>=5)return;
  return buy(toolCost(i,tier),()=>st.tools[i]=tier);
}
if(kind==='hire'){
  if(!st.buildings[i])return;
  if(st.buildings[i].workers>=industry.workerLimit(st.buildings[i]))return pop('Maximum employees reached');
  return buy(ECONOMY.hire,()=>{st.buildings[i].workers++;industry.sync()});
}
if(kind==='carry'){
  const building=st.buildings[i];
  if(!building||(building.carryLevel||0)>=5)return;
  return buy(workerCarryCost(building.carryLevel||0),()=>{building.carryLevel=(building.carryLevel||0)+1;industry.sync()});
}
if(kind==='talent'){
  const tier=st.talents[i]||0;
  if(tier>=MAX_EXPERTISE)return;
  return buy(expertiseCost(i,tier),()=>st.talents[i]++);
}
if(['factory','worker','transport','seller','road'].includes(kind)){
  const price=buildingCost(kind,i);
  return buy(price,()=>beginPlacement(kind,i,price));
}
};
$('panel').oninput=e=>{
const id=e.target.id,value=Number(e.target.value);
if(id==='settingVolume'){
  settings.volume=value/100;sound.setVolume(settings.volume);
  $('volumeLabel').textContent=value+'%';
}else if(id==='settingResolution'){
  settings.renderScale=value/100;
  $('resolutionLabel').textContent=value+'%';
  applyQuality(renderer,sun,settings.quality,settings.renderScale);
}else if(id==='settingDistance'){
  settings.viewDistance=value;
  $('distanceLabel').textContent=value+' m';
  R=Math.max(2,Math.min(8,Math.ceil(value/CH)));
  scene.fog.near=value*.71;scene.fog.far=value*.96;
  streamingCenter='';
  updateResourceVisibility();
}else if(id==='settingSensitivity'){
  settings.mouseSensitivity=value/100;
  $('sensitivityLabel').textContent=value+'%';
}else if(id==='settingMinimapSize'){
  settings.minimapSize=Math.max(72,Math.min(260,value));
  $('minimapSizeLabel').textContent=settings.minimapSize+' px';
  applyHudSettings();
}else if(id==='settingHudScale'){
  settings.hudScale=Math.max(.7,Math.min(1.4,value/100));
  $('hudScaleLabel').textContent=Math.round(settings.hudScale*100)+'%';
  applyHudSettings();
}else return;
storeSettings(settings);
};
$('panel').onchange=e=>{
const id=e.target.id;
if(id==='settingAudio')settings.muted=!e.target.checked;
else if(id==='settingGoldSound')settings.goldSound=e.target.checked;
else if(id==='settingQuality'){
  settings.quality=e.target.value;
  // Presets alter shadow quality; the independent sliders own distance and resolution.
  streamingCenter='';
  applyQuality(renderer,sun,settings.quality,settings.renderScale);
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
const close=()=>{
  const wasStorage=panel==='storage';
  panel=null;
  keys={};
  if(wasStorage)activeStorage=null;
  renderPanel();
  resumeCameraControl();
};
$('close').onclick=close;$('resume').onclick=close;
function performStockTransfer(action){
  if(panel!=='storage'||!activeStorage)return 0;
  const building=st.buildings.find(b=>b.id===activeStorage.buildingId);
  if(!building)return 0;
  const moved=transferStock(st,building,activeStorage.kind,action,industry.capacity);
  if(moved>0){
    sound.effect('ui');
    updateInventory();save();close();
    return moved;
  }
  pop(settings.language==='fr'?'Transfert impossible':'Cannot transfer');
  return 0;
}
function applyLocale(){
document.documentElement.lang=settings.language;
const mobileText=settings.language==='fr'
  ?{interact:'AGIR',jump:'SAUT',auto:'AUTO',sprint:'COURIR',drop:'POSER',vehicle:'VÉLO',cancel:'ANNULER'}
  :{interact:'ACTION',jump:'JUMP',auto:'AUTO',sprint:'RUN',drop:'DROP',vehicle:'BIKE',cancel:'CANCEL'};
const mobileAria=settings.language==='fr'
  ?{market:'Comptoir',build:'Construction',talents:'Progression',map:'Carte',settings:'Paramètres',rotateLeft:'Tourner à gauche',rotateRight:'Tourner à droite'}
  :{market:'Market',build:'Construction',talents:'Progression',map:'Map',settings:'Settings',rotateLeft:'Rotate left',rotateRight:'Rotate right'};
for(const button of document.querySelectorAll('#mobileControls [data-touch-action]')){
  const action=button.dataset.touchAction;
  if(mobileText[action])button.textContent=mobileText[action];
  button.setAttribute('aria-label',mobileAria[action]||mobileText[action]||action);
}
signCtx.clearRect(0,0,640,180);
signCtx.strokeText(settings.language==='fr'?'VENDRE':'SELL',320,93);
signCtx.fillText(settings.language==='fr'?'VENDRE':'SELL',320,93);
saleLabel.material.map.needsUpdate=true;
translateTree($('welcome'),settings.language);
translateTree(document.querySelector('.bottom'),settings.language);
translateTree(document.querySelector('.stamina'),settings.language);
translateTree(document.querySelector('.inventory-mini'),settings.language);
translateTree(document.querySelector('.placement-hud'),settings.language);
translateTree(document.querySelector('.mission'),settings.language);
translateTree(document.querySelector('.location'),settings.language);
translateTree(document.querySelector('.target'),settings.language);
if(panel)renderPanel();
translateTree($('panel'),settings.language);
industry.setLanguage(settings.language);
$('inventoryGrid').dataset.signature='';
updateInventory();
const prompt=$('prompt');if(!prompt.classList.contains('hidden'))prompt.textContent=keyLabel(carried&&!isSelling(player.position.x,player.position.z)?settings.bindings.drop:settings.bindings.interact);
$('rotationHint').innerHTML='<kbd>'+keyLabel('KeyQ')+' / '+keyLabel('KeyE')+'</kbd> '+
 (settings.language==='fr'?'TOURNER':'ROTATE');
$('autoShortcut').innerHTML='<kbd>'+keyLabel(settings.bindings.auto)+'</kbd> AUTO';
$('mapShortcut').textContent=keyLabel(settings.bindings.map);
$('marketShortcut').textContent=keyLabel(settings.bindings.market);
$('buildShortcut').textContent=keyLabel(settings.bindings.build);
$('talentShortcut').textContent=keyLabel(settings.bindings.talents);
$('interactShortcut').textContent=keyLabel(settings.bindings.interact);
$('worldMapTitle').textContent=settings.language==='fr'?'CARTE DU MONDE':'WORLD MAP';
$('worldMapHelp').textContent=settings.language==='fr'?'Glisser pour déplacer · molette pour zoomer':'Drag to pan · wheel to zoom';
$('mapBuildingLegend').textContent=settings.language==='fr'?'Bâtiments':'Buildings';
$('mapWorkerLegend').textContent=settings.language==='fr'?'Employés':'Workers';
updateAutoIndicator();

}
addEventListener('keydown',e=>{
  if(awaitingBinding){
    e.preventDefault();
    if(e.code==='Escape'||e.code==='Tab'){awaitingBinding=null;renderPanel();return}
    const prior=settings.bindings[awaitingBinding];
    const collision=ACTIONS.find(name=>name!==awaitingBinding&&settings.bindings[name]===e.code);
    if(collision)settings.bindings[collision]=prior;
    settings.bindings[awaitingBinding]=e.code;
    awaitingBinding=null;storeSettings(settings);renderPanel();applyLocale();return;
  }
  if(!$('creator').classList.contains('hidden')||
     !$('welcome').classList.contains('hidden'))return;
  if(exploration.visible){
    if(e.code===settings.bindings.map||e.code==='Escape'||e.code==='Tab'){
      e.preventDefault();exploration.setVisible(false);
    }
    return;
  }
  keys[e.code]=true;
  if(!panel&&!exploration.visible&&['forward','backward','left','right'].some(k=>isPressed(keys,settings,k))){
    autoPilot.setEnabled(false);stopHarvest();
  }
  if(e.repeat)return;
  if(e.code==='Escape'||e.code==='Tab'){
    e.preventDefault();
    if(placing){cancelPlacement();}
    else if(roadEditing){leaveConstruction();}
    else if(panel)close();
    else openPanel('settings');
    return;
  }
  if(placing&&(e.code==='KeyQ'||e.code==='KeyE')){
    e.preventDefault();rotatePlacement(e.code==='KeyE'?1:-1);return;
  }
  if(panel==='storage'){
    if(e.code==='KeyF'){e.preventDefault();close();return}
    if(e.code==='KeyA'||e.code==='KeyE'){
      e.preventDefault();
      performStockTransfer(e.code==='KeyA'?'deposit':'withdraw');
      return;
    }
  }
  // A menu shortcut is a toggle even while a panel is already open.
  // B/C/T close their own menu (restoring camera control), or switch to
  // another panel. Keep settings and storage modal input handling intact.
  if(panel&&panel!=='settings'&&panel!=='storage'){
    const shortcut=menuShortcut(e.code,settings.bindings);
    if(shortcut){
      e.preventDefault();
      openPanel(shortcut);
      return;
    }
  }
  if(panel)return;
  if(inConstruction()){
    if(e.code===settings.bindings.interact){
      if(roadEditing){paintRoad(placementPoint());save()}
      else harvest();
    }
    return;
  }
  if(e.code===settings.bindings.map){e.preventDefault();openWorldMap();return}
  if(e.code===settings.bindings.auto){if(bikeRiding){bikeRiding=false;bicycle.group.visible=false}autoPilot.toggle();return}
  if(e.code===settings.bindings.jump&&player.position.y<.01){
    autoPilot.setEnabled(false);
    e.preventDefault();jumpVelocity=8.3;sound.effect('step');
  }
  if(e.code===settings.bindings.sprint)autoPilot.setEnabled(false);
  if(e.code===settings.bindings.interact){
     if(roadEditing){paintRoad(placementPoint());save()}
     else interact();
   }
  if(e.code===settings.bindings.drop&&carried){sound.effect('ui');drop()}
  if(e.code===settings.bindings.build)openPanel('build');
  if(e.code===settings.bindings.talents)openPanel('talents');
  if(e.code===settings.bindings.market)openPanel('market');
  if(e.code===settings.bindings.vehicle)toggleBike();
});
// Desktop shortcuts are actual controls and share behavior with the keyboard.
$('hud').querySelector('.keyline').addEventListener('click',e=>{
  const button=e.target.closest('button[data-hud-action]');
  if(!button||panel||exploration.visible)return;
  const action=button.dataset.hudAction;
  if(action==='interact')return interact();
  if(action==='auto'){
    if(bikeRiding){bikeRiding=false;bicycle.group.visible=false}
    autoPilot.toggle();return;
  }
  if(action==='map'){openWorldMap();return}
  if(['market','build','talents','settings'].includes(action))openPanel(action);
});
// Construction takes input from the ground underneath the mouse or finger.
// Player movement is disabled; the mobile joystick pans the construction camera.
$('roadControls').addEventListener('click',event=>{
  const button=event.target.closest('button[data-road-mode]');
  if(!button||!roadEditing)return;
  event.preventDefault();
  if(button.dataset.roadMode==='finish'){save();leaveConstruction();return}
  roadMode=button.dataset.roadMode;
  roadSurface=button.dataset.roadSurface||roadSurface;
  refreshRoadControls();
});
renderer.domElement.addEventListener('pointerdown',event=>{
  if(!inConstruction()||panel||event.button>2)return;
  const point=constructionGround(event.clientX,event.clientY);
  if(event.button===2){
    event.preventDefault();
    constructionOrbit={pointer:event.pointerId,x:event.clientX,y:event.clientY};
    renderer.domElement.setPointerCapture(event.pointerId);
    return;
  }
  if(event.button!==0)return;
  event.preventDefault();
  constructionPointer={x:event.clientX,y:event.clientY};
  if(roadEditing){
    constructionDrag={pointer:event.pointerId,last:point,changed:false};
    if(point&&paintRoad(point))constructionDrag.changed=true;
    renderer.domElement.setPointerCapture(event.pointerId);
  }else if(placing&&point){
    placementFrame();
    harvest();
  }
});
renderer.domElement.addEventListener('pointermove',event=>{
  if(!inConstruction())return;
  if(constructionOrbit?.pointer===event.pointerId){
    const dx=event.clientX-constructionOrbit.x,dy=event.clientY-constructionOrbit.y;
    heading-=dx*.004*settings.mouseSensitivity;
    pitch=T.MathUtils.clamp(pitch+dy*.003*settings.mouseSensitivity,.35,1.35);
    constructionOrbit.x=event.clientX;constructionOrbit.y=event.clientY;
    return;
  }
  constructionPointer={x:event.clientX,y:event.clientY};
  if(constructionDrag?.pointer===event.pointerId){
    const point=constructionGround(event.clientX,event.clientY);
    if(point){
      if(paintRoad(constructionDrag.last||point,point))constructionDrag.changed=true;
      constructionDrag.last=point;
    }
  }
});
for(const kind of ['pointerup','pointercancel','lostpointercapture']){
  renderer.domElement.addEventListener(kind,event=>{
    if(constructionOrbit?.pointer===event.pointerId)constructionOrbit=null;
    if(constructionDrag?.pointer===event.pointerId){
      if(constructionDrag.changed)save();
      constructionDrag=null;
    }
  });
}
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('blur',()=>{keys={}});
addEventListener('mousemove',e=>{
  if(document.pointerLockElement===renderer.domElement){
    heading-=e.movementX*.0025*settings.mouseSensitivity;
    pitch=T.MathUtils.clamp(pitch+e.movementY*.002*settings.mouseSensitivity,-.1,1.15)
  }
});addEventListener('wheel',e=>{
  if(panel||exploration.visible||!$('welcome').classList.contains('hidden'))return;
  e.preventDefault();
  if(inConstruction()){
    constructionDistance=T.MathUtils.clamp(constructionDistance+Math.sign(e.deltaY)*2,7,85);
    return;
  }
  dist=T.MathUtils.clamp(dist+Math.sign(e.deltaY),5,18);
},{passive:false});
function resizeGame(){
  cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  applyHudSettings();
}
addEventListener('resize',resizeGame);
if(window.visualViewport)window.visualViewport.addEventListener('resize',resizeGame);
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
// Any ordinary left click on gameplay (not an open menu or active control)
// restores pointer lock, even if the user previously enabled the free cursor.
document.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.pointerType==='touch'||touchControls?.enabled||inConstruction()||panel||
      exploration.visible||!$('welcome').classList.contains('hidden')||
      !$('creator').classList.contains('hidden'))return;
  if(e.target.closest?.('button,a,input,select,textarea,[role="dialog"],.panel,.world-map,.creator,.welcome,.mobile-controls'))return;
  resumeCameraControl();
},{capture:true});
renderer.domElement.addEventListener('mousedown',e=>{
  if(e.button!==2||touchControls?.enabled||inConstruction()||panel||exploration.visible||
    !$('welcome').classList.contains('hidden'))return;
  e.preventDefault();cameraRecoveryRequested=false;mouseFree=!mouseFree;
  if(mouseFree)document.exitPointerLock?.();
  else resumeCameraControl();
  document.body.classList.toggle('mouse-free',mouseFree);
  pop(settings.language==='fr'?(mouseFree?'Curseur libre':'Contrôle de caméra'):
    (mouseFree?'Free cursor':'Camera control'));
});
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===renderer.domElement){
    cameraRecoveryRequested=false;
    mouseFree=false;document.body.classList.remove('mouse-free');
  }else if(!cameraRecoveryRequested&&!inConstruction()&&!panel&&!exploration.visible&&
     $('welcome').classList.contains('hidden')&&!touchControls?.enabled){
    // Only an actual gameplay unlock (Esc / explicit right click) enables
    // free cursor. A delayed menu-release event must not undo menu closing.
    mouseFree=true;document.body.classList.add('mouse-free');
  }
});
// A left click in the gameplay canvas always restores camera mouse control.
touchControls=createMobileControls({
  root:$('mobileControls'),canvas:renderer.domElement,
  isActive:()=>!panel&&!exploration.visible&&
    $('welcome').classList.contains('hidden')&&$('creator').classList.contains('hidden'),
  onAction:(action,pressed)=>{
    const code=action==='settings'?'Tab':action==='cancel'?'Escape':
      action==='rotateLeft'?'KeyQ':action==='rotateRight'?'KeyE':settings.bindings[action];
    if(!code)return;
    dispatchEvent(new KeyboardEvent(pressed?'keydown':'keyup',
      {code,bubbles:true,cancelable:true}));
  },
  isLookActive:()=>!inConstruction()&&!panel&&!exploration.visible,
  onLook:(dx,dy)=>{
    heading-=dx*.0045*settings.mouseSensitivity;
    pitch=T.MathUtils.clamp(pitch+dy*.0034*settings.mouseSensitivity,-.1,1.15);
  },
  onZoom:delta=>{
    if(inConstruction())constructionDistance=T.MathUtils.clamp(constructionDistance+delta*3,7,85);
    else dist=T.MathUtils.clamp(dist+delta,5,18)
  }
});
let creatorPreview=null;
function finishWelcome(){
  sound.boot();
  $('creator').classList.add('hidden');
  $('welcome').classList.add('hidden');
  $('hud').classList.remove('hidden');
  applyHudSettings();
  immersion.start();
  resumeCameraControl();
}
function closeAvatarBuilder(){
  if(creatorPreview){
    creatorPreview.active=false;
    creatorPreview.renderer.dispose();
    creatorPreview.renderer.domElement.remove();
    creatorPreview=null;
  }
  st.avatar=normalizeAvatar(avatarDraft);
  avatarDesigner.apply(st.avatar);
  save();
  finishWelcome();
}
function openAvatarBuilder(){
  sound.boot();
  $('welcome').classList.add('hidden');
  $('creator').classList.remove('hidden');
  $('creatorBody').innerHTML=avatarBuilderMarkup(avatarDraft,settings.language);
  const previewScene=new T.Scene();
  previewScene.add(new T.HemisphereLight(0xffffff,0x63715e,2.3));
  const light=new T.DirectionalLight(0xffedd8,2.1);
  light.position.set(3,7,5);previewScene.add(light);
  const previewCam=new T.PerspectiveCamera(35,300/330,.1,100);
  previewCam.position.set(4,2.9,6.8);previewCam.lookAt(0,1.36,0);
  const previewRenderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio||1,1.2));
  previewRenderer.setSize(300,330);
  $('creatorPreview').appendChild(previewRenderer.domElement);
  const view={renderer:previewRenderer,active:true,model:null,lastFrame:0};
  creatorPreview=view;
  function refreshPreview(){
    if(view.model)previewScene.remove(view.model);
    view.model=avatar.clone(true);
    previewScene.add(view.model);
  }
  refreshPreview();
  const loop=now=>{
    if(!view.active)return;
    requestAnimationFrame(loop);
    if(now-view.lastFrame<60)return;
    view.lastFrame=now;
    view.model.rotation.y=.40+Math.sin(now*.00045)*.42;
    previewRenderer.render(previewScene,previewCam);
  };
  requestAnimationFrame(loop);
  $('creatorBody').addEventListener('input',event=>{
    const key=event.target.dataset.avatar;
    if(!key)return;
    const value=event.target.type==='checkbox'?event.target.checked:
      event.target.tagName==='SELECT'?Number(event.target.value):event.target.value;
    avatarDraft=normalizeAvatar({...avatarDraft,[key]:value});
    avatarDesigner.apply(avatarDraft);
    refreshPreview();
  });
  $('creatorFinish').onclick=closeAvatarBuilder;
}
$('play').onclick=()=>{
  if(!st.avatar)openAvatarBuilder();
  else finishWelcome();
};
function openWorldMap(){
  keys={}; // Never keep a held movement key while the atlas owns input.
  exploration.setVisible(true);
  cameraRecoveryRequested=false;
  document.exitPointerLock?.();
}
let mapAgents=[],lastAgentSample=-Infinity;
const exploration=createExplorationMap({
  canvas:$('worldMapCanvas'),overlay:$('worldMap'),player,biome,
  buildings:()=>st.buildings,agents:()=>mapAgents,settings,
  onDiscover:cells=>{st.explored=cells;},
  onClose:()=>{keys={};resumeCameraControl();}
});
exploration.load(st.explored);
const minimap=$('map').getContext('2d');
// Maintain 168 logical map units while rendering at 2× resolution.
minimap.setTransform(2,0,0,2,0,0);
// Cache the biome raster independently of rotation; heading updates are cheap.
const minimapTiles=document.createElement('canvas');
minimapTiles.width=minimapTiles.height=252;
const tileCtx=minimapTiles.getContext('2d',{alpha:false});
const minimapPending=document.createElement('canvas');
minimapPending.width=minimapPending.height=252;
const pendingCtx=minimapPending.getContext('2d',{alpha:false});
let mapRasterJob=null;
function stepMinimapRaster(){
  if(!mapRasterJob)return false;
  const job=mapRasterJob;
  // Work is spread across animation frames instead of executing ~1300
  // biome queries plus 2D draws in one long hitch.
  for(let y=job.row;y<Math.min(36,job.row+5);y++){
    for(let x=0;x<36;x++){
      const b=biome(job.x+(x-18)*9,job.z+(y-18)*9);
      pendingCtx.fillStyle=b<0?'#598654':colors[b]||colors[0];
      pendingCtx.fillRect(x*7,y*7,7,7);
    }
  }
  job.row=Math.min(36,job.row+5);
  if(job.row<36)return false;
  tileCtx.clearRect(0,0,252,252);
  tileCtx.drawImage(minimapPending,0,0);
  mapRasterJob=null;
  return true;
}
let lastMapX=Infinity,lastMapZ=Infinity,lastMapAt=-Infinity,lastMapDrawAt=-Infinity,lastMapHeading=Infinity,lastExplorationSave=0;
function map(){
 const px=player.position.x,pz=player.position.z;
 const newAgents=elapsed-lastAgentSample>.32;
 if(newAgents){
   lastAgentSample=elapsed;
   mapAgents=industry.snapshot();
 }
 const moved=Math.hypot(px-lastMapX,pz-lastMapZ)>1.8;
 const refresh=moved||elapsed-lastMapAt>1.8;
 const completed=stepMinimapRaster();
 const turn=Math.abs(Math.atan2(Math.sin(heading-lastMapHeading),Math.cos(heading-lastMapHeading)));
 if(!refresh&&!completed&&!newAgents&&(turn<.014||elapsed-lastMapDrawAt<.045))return;
 if(refresh&&!mapRasterJob){
   lastMapX=px;lastMapZ=pz;lastMapAt=elapsed;
   exploration.visit(px,pz);
   if(elapsed-lastExplorationSave>22){lastExplorationSave=elapsed;save()}
   mapRasterJob={x:px,z:pz,row:0};
 }
 lastMapHeading=heading;lastMapDrawAt=elapsed;
 minimap.clearRect(0,0,168,168);
 minimap.save();minimap.beginPath();minimap.arc(84,84,82,0,Math.PI*2);minimap.clip();
 minimap.fillStyle='#17332c';minimap.fillRect(0,0,168,168);
 minimap.translate(84,84);minimap.rotate(heading);
 minimap.drawImage(minimapTiles,-126,-126);
 // Shared with the atlas: gold = building and cyan = active/abstract worker.
 const point=(x,z,radius,color)=>{
   const xpx=(x-px)*7/9,zpx=(z-pz)*7/9;
   if(Math.abs(xpx)>110||Math.abs(zpx)>110)return;
   minimap.fillStyle=color;minimap.beginPath();
   minimap.arc(xpx,zpx,radius,0,Math.PI*2);minimap.fill();
 };
 for(const b of st.buildings)point(b.x,b.z,3.1,'#ffe0a1');
 for(const agent of mapAgents)point(agent.x,agent.z,1.8,'#80f2f3');
 minimap.rotate(-heading);
 // Player arrow is always pointed toward the top of the moving minimap.
 minimap.fillStyle='#f9fff5';minimap.strokeStyle='#102b24';minimap.lineWidth=2;
 minimap.beginPath();minimap.moveTo(0,-10);minimap.lineTo(7,7);
 minimap.lineTo(0,3);minimap.lineTo(-7,7);minimap.closePath();minimap.fill();minimap.stroke();
 const dx=-px,dz=-pz,d=Math.hypot(dx,dz);
 if(d>14){
   // Rotate the actual bearing to home with the same camera transform.
   const rx=Math.cos(heading)*dx-Math.sin(heading)*dz;
   const rz=Math.sin(heading)*dx+Math.cos(heading)*dz;
   const angle=Math.atan2(rz,rx);
   minimap.save();minimap.translate(rx/d*73,rz/d*73);minimap.rotate(angle);
   minimap.fillStyle='#ffd27b';minimap.strokeStyle='#192621';minimap.lineWidth=2;
   minimap.beginPath();minimap.moveTo(9,0);minimap.lineTo(-5,-5);
   minimap.lineTo(-3,0);minimap.lineTo(-5,5);minimap.closePath();minimap.fill();minimap.stroke();
   minimap.restore();
 }
 minimap.restore();
}

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
  if(carried)return [px,2.9,pz];
  for(const log of nearbyResourceNodes())
    if(log.dead&&log.log&&Math.hypot(log.log.position.x-px,log.log.position.z-pz)<3.2)
      return [log.log.position.x,1.6,log.log.position.z];
  if(Math.hypot(px,pz)<7)return [0,3.4,2.25];
  const pile=nearestStock(st.buildings,player.position,b=>industry.buildingGeometry(b.id)?.stockPoints);
  if(pile)return [pile.point.x,1.6,pile.point.z];
  const building=nearbyBuildingEntrance();
  if(building){const p=worldPoint(building,0,2);return [p.x,2.9,p.z]}
  const nearby=closest();
  if(!nearby)return null;
  if(nearby.kind)return [nearby.x,3.1,nearby.z];
  return [nearby.x,[2.25,1.75,1.9,1.2,1.6][nearby.type],nearby.z];
}
function positionInteractionTooltip(){
  const prompt=$('prompt'),anchor=harvesting?null:interactionAnchor();
  if(!anchor){prompt.classList.add('hidden');return}
  tooltipPosition.set(anchor[0],anchor[1],anchor[2]);
  cam.getWorldDirection(tooltipForward);
  if((tooltipPosition.x-cam.position.x)*tooltipForward.x+
     (tooltipPosition.y-cam.position.y)*tooltipForward.y+
     (tooltipPosition.z-cam.position.z)*tooltipForward.z<.1){
    prompt.classList.add('hidden');return;
  }
  tooltipPosition.project(cam);
  if(!Number.isFinite(tooltipPosition.x)||!Number.isFinite(tooltipPosition.y)||tooltipPosition.z>1||
     Math.abs(tooltipPosition.x)>1.04||Math.abs(tooltipPosition.y)>1.04){
    prompt.classList.add('hidden');return;
  }
  // The HUD is transformed, so viewport coordinates must be converted back
  // to its unscaled coordinate system before positioning a world-space tooltip.
  const hudFactor=Math.max(.7,Math.min(1.4,settings.hudScale||1));
  prompt.style.left=Math.round((tooltipPosition.x+1)*.5*window.innerWidth/hudFactor)+'px';
  prompt.style.top=Math.round((1-tooltipPosition.y)*.5*window.innerHeight/hudFactor)+'px';
  const key=keyLabel(carried&&!isSelling(player.position.x,player.position.z)
  ?settings.bindings.drop:settings.bindings.interact);
if(prompt.textContent!==key)prompt.textContent=key;
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
// Respect the visual quality chosen in Settings: never permanently
// disable shadows, shorten the world draw distance or lower resolution
// based on one short low-FPS sample. Track frame-rate issues instead.
monitor.lowPerformance=fps<25;
}
applyLocale();
applyHudSettings();
const cameraTarget=new T.Vector3(),cameraOffset=new T.Vector3();
const wantsConstructionSprint=()=>isPressed(keys,settings,'sprint');
function frame(){
requestAnimationFrame(frame);
const frameDelta=Math.min(clock.getDelta(),.05);
const paused=panel==='settings'||!$('creator').classList.contains('hidden')||
  !$('welcome').classList.contains('hidden');
const dt=paused?0:frameDelta;
elapsed+=dt;st.gameMinutes=(Number(st.gameMinutes)||0)+dt;
if(dt>0)roads.update(st.gameMinutes);
roadSurfaces.update(dt);
if(autoMode)eyeChromaMaterial.uniforms.time.value=elapsed;
if(player.position.y>0||jumpVelocity>0){
  jumpVelocity-=23*dt;
  player.position.y=Math.max(0,player.position.y+jumpVelocity*dt);
  if(player.position.y===0)jumpVelocity=0;
}
trails.update(dt);
refreshDecorationShadows(dt);
harvestFx.update(dt);
pumpWorld();
placementFrame();
if(!paused)collectSaleZone();
const side=Number(isPressed(keys,settings,'right'))-Number(isPressed(keys,settings,'left'));
const front=Number(isPressed(keys,settings,'forward'))-Number(isPressed(keys,settings,'backward'));
const moving=!paused&&!panel&&!inConstruction()&&(side!==0||front!==0);
if(inConstruction()&&!paused&&(side||front)){
  const factor=dt*(wantsConstructionSprint()?35:17)/Math.max(1,Math.hypot(side,front));
  const dx=Math.cos(heading)*side-Math.sin(heading)*front;
  const dz=-Math.sin(heading)*side-Math.cos(heading)*front;
  constructionFocus.x+=dx*factor;constructionFocus.z+=dz*factor;
}
const previousMotionX=player.position.x,previousMotionZ=player.position.z;
const wantsSprint=isPressed(keys,settings,'sprint');
if(stamina<.01)sprintLocked=true;
if(stamina>=maxStamina()*.27)sprintLocked=false;
const sprinting=moving&&wantsSprint&&!sprintLocked&&stamina>.01;
if(sprinting)stamina=Math.max(0,stamina-dt*(bikeRiding?17:22));
else stamina=Math.min(maxStamina(),stamina+dt*staminaRegen());
$('staminaHud').classList.toggle('hidden',!sprinting&&stamina>=maxStamina()-.15);
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
const terrainSpeed=roads.speedAt(player.position.x,player.position.z);
movePlayer(vx*dt*terrainSpeed*(bikeRiding?(sprinting?17.5:13.1):(sprinting?10.3:6.3)),vz*dt*terrainSpeed*(bikeRiding?(sprinting?17.5:13.1):(sprinting?10.3:6.3)));
const targetAngle=Math.atan2(vx,vz);
const difference=Math.atan2(Math.sin(targetAngle-player.rotation.y),Math.cos(targetAngle-player.rotation.y));
player.rotation.y+=difference*Math.min(1,dt*16);
}
const autoWalking=!paused&&!inConstruction()&&autoPilot.update(dt);
if(autoWalking){
  footstepTimer+=dt;
  if(footstepTimer>.42){footstepTimer=0;sound.effect('step')}
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
animatePlayer(dt,moving||autoWalking,sprinting);
bicycle.update(dt,bikeRiding&&dt>0?
  Math.hypot(player.position.x-previousMotionX,player.position.z-previousMotionZ)/dt:0,sprinting);
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
cameraTarget.set(inConstruction()?constructionFocus.x:player.position.x,
  inConstruction()?0:1.5+player.position.y,
  inConstruction()?constructionFocus.z:player.position.z);
cameraOffset.set(Math.sin(heading)*Math.cos(pitch),Math.sin(pitch),Math.cos(heading)*Math.cos(pitch));
cam.position.copy(cameraTarget).addScaledVector(cameraOffset,
  inConstruction()?constructionDistance:dist);
cam.lookAt(cameraTarget);
skyWeather.update(dt,elapsed,st.gameMinutes);
nightLighting.update(dt,skyWeather.dayFactor);
positionInteractionTooltip();
const nowIndustry=performance.now();
const workDt=paused?0:Math.min(.22,Math.max(0,(nowIndustry-lastIndustryTime)/1000));
lastIndustryTime=nowIndustry;
if(!paused)try{
  const stats=industry.update(workDt,player.position.x,player.position.z,cam);
  monitor.employees=stats.employees;monitor.visibleEmployees=stats.visible;
  monitor.delivered=stats.delivered;monitor.soldByWorkers=stats.sold;
  monitor.abstractWorkers=stats.abstract;monitor.workerAvoidance=stats.separations;
  monitor.routeReplans=stats.replans;
}catch(error){
  monitor.lastError=String(error);
  console.error('Industry update failed',error);
}
if(!paused)wildlife.update(dt);

if(ticks++%12===0){
stream();renewResources();updateResourceVisibility();updateInventory();
$('coins').textContent=st.gold;
$('goldUnit').textContent=settings.language==='fr'?'OR':'GOLD';
const biomeId=biome(player.position.x,player.position.z);
$('biomeName').textContent=tr(biomeId<0?'CAMP CENTRAL':types[biomeId],settings.language);
const gameClock=Math.floor(st.gameMinutes||0)+8*60;
$('clock').textContent=tr('JOUR',settings.language)+' '+String(1+Math.floor(gameClock/1440)).padStart(2,'0')+' · '+String(Math.floor(gameClock/60)%24).padStart(2,'0')+':'+String(gameClock%60).padStart(2,'0');
$('objective').textContent=tr(st.tools.every(t=>t<0)?'COMMENCEZ AVEC VOS POINGS':'DÉVELOPPEZ VOTRE EMPIRE',settings.language);
$('detail').textContent=tr(st.tools.every(t=>t<0)?'Récoltez lentement avec vos poings, puis améliorez votre équipement':'Récoltez, transformez et automatisez',settings.language);
const highlighted=harvesting;
if(highlighted){
$('targetTitle').textContent=tr(raw[highlighted.type],settings.language);
$('targetLifeValue').textContent=highlighted.hp+' / '+highlighted.max+' '+(settings.language==='fr'?'PV':'HP');
$('targetLife').style.setProperty('--hp',(highlighted.hp/highlighted.max*100)+'%');
$('targetHint').textContent=tr('RÉCOLTE EN COURS',settings.language);
$('target').classList.remove('hidden')
}else $('target').classList.add('hidden');
document.body.dataset.biome=String(biomeId);
if(ticks%120===1){
  monitor.buildingLabels=industry.getLabels();
  monitor.resourceGeometries=resourceGraphics.geometryCount;
  monitor.batchedChunks=0;
  for(const c of world.values())if(c.resourceBatches?.length)monitor.batchedChunks++;
}
}
map();
exploration.update(dt);
if(st.gold!==observedGold){
  if(st.gold>observedGold){
    const difference=st.gold-observedGold,indicator=$('goldGain');
    indicator.textContent='+'+difference.toLocaleString(settings.language==='fr'?'fr-FR':'en-US');
    indicator.classList.remove('visible');void indicator.offsetWidth;
    indicator.classList.add('visible');goldHideAt=elapsed+2.4;
    if(settings.goldSound!==false)sound.effect('coin');
  }
  observedGold=st.gold;
}
if(goldHideAt&&elapsed>goldHideAt){$('goldGain').classList.remove('visible');goldHideAt=0}
renderer.render(scene,cam);
monitor.frames++;monitor.drawCalls=renderer.info.render.calls;
monitor.playerX=player.position.x;monitor.playerZ=player.position.z;
monitor.placementRotation=placing?.rotation??null;monitor.autoMode=autoMode;monitor.bikeRiding=bikeRiding;monitor.bicycleDistance=bicycle.distance;monitor.bagCapacity=st.bag;monitor.music=sound.currentMusic;
if(ticks%240===1)monitor.resourceExhausted=Object.keys(resourceLife.exhausted).length;
monitor.chunks=world.size;monitor.resources=resources.length;
monitor.inventoryCount=count();monitor.cameraDistance=dist;monitor.constructionActive=!!placing;
monitor.gameMinutes=st.gameMinutes;monitor.terrainPaths=trails.count;
monitor.roadTiles=roads.built;monitor.roadPlan=roads.plannedCount;
monitor.roadSurfaceTiles=roadSurfaces.visibleTiles;
monitor.roadLanterns=nightLighting.roadsLit;
monitor.activeNightLights=nightLighting.activeLights;
monitor.wildlifeLand=wildlife.landCount;monitor.wildlifeBirds=wildlife.birdCount;
monitor.wildlifeSpecies=wildlife.speciesCount;
monitor.cloudCount=skyWeather.cloudCount;
monitor.daylight=skyWeather.dayFactor;
monitor.renderResolution=renderer.getPixelRatio();monitor.viewDistance=settings.viewDistance;
monitor.jumpHeight=player.position.y;
controlQuality();
}
stream();pumpWorld();updateInventory();frame();
// Encrypt the periodic save while the browser is idle, rather than forcing a
// potentially large serialized road network in the middle of a rendered frame.
let autosavePending=false;
function scheduleAutosave(){
  if(autosavePending)return;
  autosavePending=true;
  const write=()=>{autosavePending=false;save()};
  if(typeof requestIdleCallback==='function')
    requestIdleCallback(write,{timeout:1700});
  else setTimeout(write,0);
}
setInterval(scheduleAutosave,15000);
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden')save();
});
addEventListener('pagehide',save);
