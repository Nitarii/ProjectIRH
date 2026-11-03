// Warm, world-anchored industrial lighting. Building wall lanterns and road
// lanterns use instanced models; a strictly capped pool of non-shadowed point
// lights provides nearby soft illumination without one light per object.
import {worldPoint} from './facility-layout.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const sq=(a,b)=>{const x=a.x-b.x,z=a.z-b.z;return x*x+z*z};
const tileLevel=tile=>Math.max(0,Math.min(2,Number(tile?.l??tile)||0));

// Every road lantern is sampled from the permanent road grid, not the player.
// A lamp disappears only when its physical road tile is fully dismantled.
export function roadLampSites(tiles,viewer,range=140,maxCount=110,cell=3,isBlocked=()=>false){
  const sites=[],r2=range*range;
  for(const [key,tile] of Object.entries(tiles||{})){
    if(tileLevel(tile)===0)continue;
    const coord=key.split(',');
    if(coord.length!==2)continue;
    const ix=Number(coord[0]),iz=Number(coord[1]);
    if(!Number.isInteger(ix)||!Number.isInteger(iz))continue;
    if(((ix*17+iz*29)%7+7)%7!==0)continue;
    const x=(ix+.5)*cell,z=(iz+.5)*cell;
    const d2=(viewer.x-x)**2+(viewer.z-z)**2;
    if(d2>r2)continue;
    const neighbors=(ix,iz)=>tileLevel(tiles[ix+','+iz])>0;
    const eastWest=Number(neighbors(ix+1,iz))+Number(neighbors(ix-1,iz));
    const northSouth=Number(neighbors(ix,iz+1))+Number(neighbors(ix,iz-1));
    // Lights sit a few metres beside the actual usable road surface.
    const side=((ix+iz)&1)?-1:1;
    const px=x+(eastWest>=northSouth?0:side*2.7);
    const pz=z+(eastWest>=northSouth?side*2.7:0);
    if(isBlocked(px,pz))continue;
    sites.push({x:px,z:pz,level:tileLevel(tile),d2});
  }
  sites.sort((a,b)=>a.d2-b.d2);
  return sites.slice(0,maxCount);
}

export function createNightLighting(T,scene,{
  buildings=()=>[],fixedBuildings=[],roads,player,
  viewDistance=()=>128,quality=()=> 'balanced',isBlocked=()=>false
}={}){
  const metal=new T.MeshLambertMaterial({color:0x514b47});
  const copper=new T.MeshLambertMaterial({color:0x9c7750});
  const glass=new T.MeshLambertMaterial({
    color:0xffe4b5,emissive:0xffb56e,emissiveIntensity:0
  });
  const aura=new T.MeshBasicMaterial({
    color:0xffc68b,transparent:true,opacity:0,depthWrite:false,
    blending:T.AdditiveBlending,fog:true
  });
  const poleGeo=new T.CylinderGeometry(.057,.085,2.8,7);
  const capGeo=new T.CylinderGeometry(.28,.23,.16,8);
  const bulbGeo=new T.SphereGeometry(.20,8,6);
  const glowGeo=new T.SphereGeometry(.60,8,6);
  const bracketGeo=new T.BoxGeometry(.40,.08,.23);
  const MAX_ROAD=150,MAX_BUILDING=140,MAX_BULBS=MAX_ROAD+MAX_BUILDING;
  function batch(geo,mat,max){
    const mesh=new T.InstancedMesh(geo,mat,max);
    mesh.count=0;mesh.frustumCulled=false;
    mesh.castShadow=false;mesh.receiveShadow=false;
    scene.add(mesh);return mesh;
  }
  const poles=batch(poleGeo,metal,MAX_ROAD);
  const roadCaps=batch(capGeo,copper,MAX_ROAD);
  const brackets=batch(bracketGeo,copper,MAX_BUILDING);
  const bulbs=batch(bulbGeo,glass,MAX_BULBS);
  const glows=batch(glowGeo,aura,MAX_BULBS);
  const dummy=new T.Object3D();
  const lightPool=Array.from({length:8},()=>{
    const light=new T.PointLight(0xffbd7b,0,18,2);
    light.castShadow=false;light.visible=false;scene.add(light);return light;
  });
  let night=0,refreshClock=Infinity,oldX=Infinity,oldZ=Infinity;
  let lastRevision=-1,lastBuildings='',lastRange=0,lastQuality='';
  let candidates=[],bulbCount=0,roadCount=0;
  function pose(mesh,index,x,y,z,sx=1,sy=1,sz=1,angle=0){
    dummy.position.set(x,y,z);
    dummy.rotation.set(0,angle,0);
    dummy.scale.set(sx,sy,sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(index,dummy.matrix);
  }
  function refresh(){
    const center=player.position,range=clamp(viewDistance()*.84,36,210);
    const mode=quality();
    const maxRoad=mode==='low'?45:mode==='high'?MAX_ROAD:95;
    const maxBuildings=mode==='low'?48:mode==='high'?MAX_BUILDING:100;
    const nearby=[...buildings(),...fixedBuildings].filter(b=>Number.isFinite(b.x+b.z)&&sq(center,b)<(range+4)**2)
      .sort((a,b)=>sq(center,a)-sq(center,b)).slice(0,Math.floor(maxBuildings/2));
    const roadSites=roadLampSites(roads?.data,center,range,maxRoad,3,isBlocked);
    candidates=[];let poleCount=0,capCount=0,bracketCount=0;bulbCount=0;
    for(const site of roadSites){
      pose(poles,poleCount++,site.x,1.40,site.z);
      pose(roadCaps,capCount++,site.x,2.84,site.z);
      pose(bulbs,bulbCount,site.x,2.70,site.z,.80,.80,.80);
      pose(glows,bulbCount,site.x,2.70,site.z,.80,.80,.80);
      candidates.push({x:site.x,z:site.z,y:2.70,road:true,d2:site.d2});
      bulbCount++;
    }
    roadCount=poleCount;
    for(const b of nearby){
      for(const side of [-1,1]){
        const bracket=worldPoint(b,side*1.52,2.02);
        const lamp=worldPoint(b,side*1.52,2.32);
        pose(brackets,bracketCount++,bracket.x,2.15,bracket.z,1,1,1,b.rotation||0);
        pose(bulbs,bulbCount,lamp.x,2.07,lamp.z,.90,.90,.90);
        pose(glows,bulbCount,lamp.x,2.07,lamp.z,.75,.75,.75);
        candidates.push({x:lamp.x,z:lamp.z,y:2.07,road:false,d2:sq(center,lamp)});
        bulbCount++;
      }
    }
    poles.count=poleCount;roadCaps.count=capCount;brackets.count=bracketCount;
    bulbs.count=bulbCount;glows.count=bulbCount;
    for(const mesh of [poles,roadCaps,brackets,bulbs,glows])
      if(mesh.count)mesh.instanceMatrix.needsUpdate=true;
    // A compact pool provides genuine illumination; all remaining fixtures
    // still visibly glow without allocating more GPU lights or shadow maps.
    candidates.sort((a,b)=>(a.d2-(a.road?0:45))-(b.d2-(b.road?0:45)));
    const limit=mode==='low'?2:mode==='high'?8:5;
    for(let i=0;i<lightPool.length;i++){
      const light=lightPool[i],site=i<limit?candidates[i]:null;
      light.visible=!!site;
      if(site){
        light.position.set(site.x,site.y+.04,site.z);
        light.distance=site.road?14:16;
      }else light.intensity=0;
    }
  }
  function update(dt,dayFactor=1){
    if(dt<0)return;
    const target=clamp((.83-dayFactor)/.70,0,1);
    night+=(target-night)*(1-Math.exp(-Math.min(.15,dt)*2.5));
    glass.emissiveIntensity=night*2.15;
    aura.opacity=night*.18;
    glows.visible=night>.018;
    const pos=player.position,mode=quality(),range=viewDistance();
    refreshClock+=dt;
    if(refreshClock>.9||sq(pos,{x:oldX,z:oldZ})>100||
       lastRevision!==roads?.revision||lastRange!==range||lastQuality!==mode){
      // Dynamic building signatures are only compared at the refresh
      // boundary, not allocated and joined on every animation frame.
      const signature=buildings().map(b=>
        b.id+':'+b.x+':'+b.z+':'+(b.rotation||0)).join('|');
      refreshClock=0;oldX=pos.x;oldZ=pos.z;
      lastRevision=roads?.revision;lastBuildings=signature;
      lastRange=range;lastQuality=mode;
      refresh();
    }
    for(const light of lightPool)
      if(light.visible)light.intensity=(light.distance>15?1.65:1.33)*night;
  }
  function dispose(){
    for(const mesh of [poles,roadCaps,brackets,bulbs,glows])scene.remove(mesh);
    for(const light of lightPool)scene.remove(light);
    for(const geo of [poleGeo,capGeo,bulbGeo,glowGeo,bracketGeo])geo.dispose();
    for(const mat of [metal,copper,glass,aura])mat.dispose();
  }
  return {update,dispose,get count(){return bulbCount},
    get roadsLit(){return roadCount},get activeLights(){return lightPool.filter(l=>l.visible&&l.intensity>.02).length},
    get nightFactor(){return night}};
}
