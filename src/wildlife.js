// Deterministic, world-anchored biome ecology. No per-creature pathfinding,
// geometry creation, or expensive proximity searches during frame updates.
export const WILDLIFE_SPECIES=[
  [{name:'deer',coat:0x99734e,belly:0xd3bb91,shape:1.10,legs:1.3,ears:.26,horns:1,tail:.22},
   {name:'fox',coat:0xc56839,belly:0xf1d9af,shape:.66,legs:.64,ears:.37,tail:.82},
   {name:'boar',coat:0x5b493d,belly:0x9b8972,shape:1.04,legs:.56,ears:.17,tusks:1,tail:.24}],
  [{name:'ibex',coat:0x977c65,belly:0xddd0b3,shape:.98,legs:1.08,ears:.20,horns:2,tail:.2},
   {name:'marmot',coat:0x9d8565,belly:0xd3b488,shape:.63,legs:.3,ears:.13,tail:.38},
   {name:'snow-hare',coat:0xdcd8ca,belly:0xf1eddd,shape:.55,legs:.63,ears:.69,tail:.17}],
  [{name:'badger',coat:0x525350,belly:0xe9e7d8,shape:.80,legs:.40,ears:.14,tail:.26},
   {name:'mole',coat:0x423d3b,belly:0x94867b,shape:.42,legs:.17,ears:.02,tail:.15},
   {name:'rock-lizard',coat:0x697c65,belly:0xa3ad82,shape:.73,legs:.23,ears:0,tail:1.1}],
  [{name:'fennec',coat:0xd6ae79,belly:0xf1dbb2,shape:.58,legs:.52,ears:.85,tail:.65},
   {name:'jerboa',coat:0xc39c64,belly:0xf5dcb6,shape:.36,legs:.78,ears:.42,tail:.93},
   {name:'sand-monitor',coat:0xb29867,belly:0xd4c394,shape:.83,legs:.27,ears:0,tail:1.18}],
  [{name:'rabbit',coat:0x95836c,belly:0xe1d3b7,shape:.50,legs:.5,ears:.57,tail:.16},
   {name:'hedgehog',coat:0x665c4e,belly:0xc3a67d,shape:.45,legs:.20,ears:.11,spikes:1,tail:.08},
   {name:'field-vole',coat:0x988468,belly:0xcebc9e,shape:.32,legs:.18,ears:.13,tail:.44}]
];
export const BIRD_SPECIES=[
  {name:'forest-jay',color:0x41839b,accent:0xd5e0cf,span:.85,speed:1.22},
  {name:'mountain-eagle',color:0x735f51,accent:0xe2d0aa,span:1.75,speed:.78},
  {name:'excavation-raven',color:0x303c42,accent:0x79909c,span:1.25,speed:1.05},
  {name:'desert-vulture',color:0xb78d69,accent:0xe9d9b7,span:1.55,speed:.67},
  {name:'field-lark',color:0xab9164,accent:0xeee0bb,span:.75,speed:1.46}
];
const fract=v=>v-Math.floor(v);
const random=(a,b,s)=>fract(Math.sin(a*127.11+b*319.29+s*74.23)*43758.5453);
const distance=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);
export function createWildlife(T,scene,{
  biomeAt,seed=1,blocked=()=>false,quality=()=> 'balanced',
  viewDistance=()=>128,playerPosition=()=>({x:0,z:0})
}={}){
  const shared={
    body:new T.IcosahedronGeometry(1,1),
    head:new T.IcosahedronGeometry(1,1),
    leg:new T.CylinderGeometry(.09,.12,1,5),
    ear:new T.ConeGeometry(.19,.68,4),
    snout:new T.ConeGeometry(.26,.55,5),
    tail:new T.ConeGeometry(.24,1,5),
    eye:new T.IcosahedronGeometry(.085,0),
    wing:new T.BoxGeometry(1,.055,.38),
    bird:new T.ConeGeometry(.20,.92,5)
  };
  const materialPool=new Map();
  const material=color=>{
    if(!materialPool.has(color))materialPool.set(color,new T.MeshLambertMaterial({color}));
    return materialPool.get(color);
  };
  const eyes=material(0x111a1b);
  const active=new Map(),inactive=[],birds=new Map(),inactiveBirds=[];
  let sampleClock=0,clock=0,rebuildCount=0,stepAccumulator=0;
  const make=(geo,mat,parent,x,y,z,sx,sy,sz)=>{
    const mesh=new T.Mesh(geo,mat);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.castShadow=false;mesh.receiveShadow=false;
    parent.add(mesh);return mesh;
  };
  function creatureModel(biome,variant){
    const c=WILDLIFE_SPECIES[biome][variant],g=new T.Group();
    const coat=material(c.coat),belly=material(c.belly),legs=[];
    const scale=c.shape,legHeight=c.legs*.49+.16,back=legHeight+scale*.54;
    make(shared.body,coat,g,0,back,0,scale*.54,scale*.43,scale*.84);
    make(shared.body,belly,g,0,back-.09,scale*.18,scale*.43,scale*.28,scale*.59);
    make(shared.head,coat,g,0,back+scale*.31,scale*.66,scale*.37,scale*.37,scale*.39);
    make(shared.snout,belly,g,0,back+scale*.20,scale*.99,scale*.22,scale*.28,scale*.40).rotation.x=Math.PI/2;
    for(const side of [-1,1]){
      const eye=make(shared.eye,eyes,g,side*scale*.29,back+scale*.40,scale*.84,.065,.08,.066);
      for(const z of [-.48,.47]){
        const pivot=new T.Group();pivot.position.set(side*scale*.36,legHeight+.09,z*scale);g.add(pivot);
        make(shared.leg,coat,pivot,0,-legHeight*.50,0,scale*.11,legHeight,scale*.11);
        legs.push(pivot);
      }
      if(c.ears){
        const ear=make(shared.ear,coat,g,side*scale*.25,back+scale*(.60+c.ears*.2),scale*.57,
          c.ears*.23,c.ears*.82,c.ears*.22);
        ear.rotation.z=side*.17;
      }
      if(c.horns){
        const h=make(shared.leg,belly,g,side*scale*.24,back+scale*.81,scale*.48,
          c.horns===2?.13:.08,scale*(c.horns===2?.95:.62),.08);
        h.rotation.z=side*(c.horns===2?.31:.54);
      }
      if(c.tusks){
        const tusk=make(shared.ear,belly,g,side*scale*.28,back+scale*.16,scale*.96,
          .10,.18,.10);tusk.rotation.x=.3;
      }
    }
    const tail=make(shared.tail,coat,g,0,back+scale*.19,-scale*(.79+c.tail*.28),
      scale*.22,Math.max(.08,c.tail*scale*.67),scale*.22);
    tail.rotation.x=-Math.PI/2;
    if(c.spikes)for(let i=0;i<11;i++){
      const angle=i*2.4,spike=make(shared.ear,material(0x413d32),g,
        Math.sin(angle)*scale*.32,back+scale*.42,-scale*.15+Math.cos(angle)*scale*.45,
        .12,.30,.12);spike.rotation.z=Math.sin(angle)*.32;
    }
    scene.add(g);return {group:g,legs,tail,species:c,detail:g.children.slice(3),nearDetail:true};
  }
  function birdModel(biome){
    const s=BIRD_SPECIES[biome],group=new T.Group(),wings=[];
    const coat=material(s.color),highlight=material(s.accent);
    const body=make(shared.bird,coat,group,0,0,0,.8,.84,1.1);body.rotation.x=Math.PI/2;
    make(shared.head,highlight,group,0,.09,.38,.17,.15,.2);
    for(const side of [-1,1]){
      const arm=new T.Group();arm.position.set(side*.14,.04,0);group.add(arm);
      make(shared.wing,coat,arm,side*s.span*.40,0,-.07,s.span*.82,.75,.9);
      make(shared.wing,highlight,arm,side*s.span*.68,-.035,-.12,s.span*.26,.25,.55);
      wings.push({arm,side});
    }
    const tail=make(shared.tail,coat,group,0,-.02,-.48,.26,.34,.62);tail.rotation.x=-Math.PI/2;
    scene.add(group);return {group,wings,species:s};
  }
  function acquire(b,v){
    const index=inactive.findIndex(item=>item.biome===b&&item.variant===v);
    if(index>=0)return inactive.splice(index,1)[0];
    return {biome:b,variant:v,model:creatureModel(b,v)};
  }
  function acquireBird(b){
    let index=inactiveBirds.findIndex(item=>item.biome===b);
    if(index>=0)return inactiveBirds.splice(index,1)[0];
    return {biome:b,model:birdModel(b)};
  }
  function refresh(){
    const pos=playerPosition(),range=Math.min(180,Math.max(65,viewDistance()*.79));
    const maxLand=quality()==='low'?12:quality()==='high'?32:23;
    const maxAir=quality()==='low'?5:quality()==='high'?17:11;
    const cell=48,cx=Math.floor(pos.x/cell),cz=Math.floor(pos.z/cell);
    const candidates=[],airCandidates=[];
    const cells=Math.ceil(range/cell)+1;
    for(let dx=-cells;dx<=cells;dx++)for(let dz=-cells;dz<=cells;dz++){
      const ix=cx+dx,iz=cz+dz;
      const ax=ix*cell+(random(ix,iz,seed+1)-.5)*cell*.78+cell*.5;
      const az=iz*cell+(random(ix,iz,seed+2)-.5)*cell*.78+cell*.5;
      const d=distance(ax,az,pos.x,pos.z);
      const biome=biomeAt(ax,az);
      if(biome<0||biome>4||d>range||d<15)continue;
      if(random(ix,iz,seed+3)>.78)continue;
      if(!blocked(ax,az,.5)){
        const variant=Math.floor(random(ix,iz,seed+4)*3);
        candidates.push({id:ix+','+iz,biome,variant,x:ax,z:az,d});
      }
      if(random(ix,iz,seed+5)<.34&&d<range*.92){
        airCandidates.push({id:'b'+ix+','+iz,biome,x:ax,z:az,d});
      }
    }
    candidates.sort((a,b)=>a.d-b.d);
    airCandidates.sort((a,b)=>a.d-b.d);
    const wanted=new Set(),wantedBirds=new Set();
    for(const site of candidates.slice(0,maxLand)){
      wanted.add(site.id);
      if(active.has(site.id))continue;
      const a=acquire(site.biome,site.variant);
      a.id=site.id;a.homeX=site.x;a.homeZ=site.z;
      a.x=site.x;a.z=site.z;a.direction=random(site.x,site.z,seed)*Math.PI*2;
      a.timer=random(site.x,site.z,seed+8)*3;a.pause=0;
      a.speed=(.55+random(site.x,site.z,seed+7)*.72)*(a.model.species.legs<.4?.65:1);
      a.phase=random(site.x,site.z,seed+12)*10;a.life=0;
      a.model.group.visible=true;active.set(site.id,a);
    }
    for(const [id,a] of active)if(!wanted.has(id)){
      active.delete(id);a.model.group.visible=false;
      if(inactive.length<26)inactive.push(a);
      else scene.remove(a.model.group);
    }
    for(const site of airCandidates.slice(0,maxAir)){
      wantedBirds.add(site.id);
      if(birds.has(site.id))continue;
      const a=acquireBird(site.biome);a.id=site.id;
      a.x=site.x;a.z=site.z;
      a.altitude=16+random(site.x,site.z,seed+10)*21;
      a.radius=12+random(site.x,site.z,seed+11)*19;
      a.phase=random(site.x,site.z,seed+12)*6.28;a.life=0;
      a.model.group.visible=true;birds.set(site.id,a);
    }
    for(const [id,a] of birds)if(!wantedBirds.has(id)){
      birds.delete(id);a.model.group.visible=false;
      if(inactiveBirds.length<12)inactiveBirds.push(a);
      else scene.remove(a.model.group);
    }
    rebuildCount++;
  }
  function update(dt){
    if(dt<=0)return;
    stepAccumulator+=dt;
    const mode=quality(),interval=mode==='low'?.093:mode==='high'?.033:.050;
    if(stepAccumulator<interval)return;
    dt=Math.min(.18,stepAccumulator);stepAccumulator=0;
    clock+=dt;sampleClock+=dt;
    if(sampleClock>=1.7){sampleClock=0;refresh()}
    const player=playerPosition(),visible=Math.min(180,viewDistance()*.84);
    for(const a of active.values()){
      a.life=Math.min(1,a.life+dt*.72);a.timer-=dt;
      const radial=distance(a.x,a.z,a.homeX,a.homeZ);
      if(a.timer<0){
        const turn=radial>14?Math.atan2(a.homeZ-a.z,a.homeX-a.x):
          a.direction+(random(a.x+clock*.21,a.z,seed)-.5)*2.4;
        a.direction=turn;
        a.timer=1.6+random(a.x,a.z+clock*.09,seed)*4.8;
        a.pause=random(a.x+clock*.1,a.z,seed+19)>.63?1.3:0;
      }
      a.pause=Math.max(0,a.pause-dt);
      let moving=false;
      if(a.pause<=0){
        const nx=a.x+Math.cos(a.direction)*a.speed*dt,
              nz=a.z+Math.sin(a.direction)*a.speed*dt;
        if(biomeAt(nx,nz)===a.biome&&!blocked(nx,nz,.64)){
          a.x=nx;a.z=nz;moving=true;
        }else{a.direction+=1.37;a.timer=.4}
      }
      const model=a.model,g=model.group;
      const dPlayer=distance(a.x,a.z,player.x,player.z);
      g.visible=dPlayer<visible;
      if(!g.visible)continue;
      // Hysteretic distant-detail LOD: silhouette survives while small parts
      // stop consuming draw calls when they occupy less than a few pixels.
      if((model.nearDetail&&dPlayer>47)||(!model.nearDetail&&dPlayer<38)){
        model.nearDetail=dPlayer<38;
        for(const part of model.detail)part.visible=model.nearDetail;
      }
      g.position.set(a.x,0,a.z);g.rotation.y=Math.PI/2-a.direction;
      const gait=moving?Math.sin(clock*9*a.speed+a.phase)*.39:0;
      for(let i=0;i<model.legs.length;i++)
        model.legs[i].rotation.x=(i%2?1:-1)*gait;
      model.tail.rotation.y=Math.sin(clock*1.4+a.phase)*.16;
      g.position.y=moving?Math.abs(gait)*.036:Math.sin(clock*1.3+a.phase)*.012;
      const fade=Math.min(1,a.life,Math.max(0,(visible-distance(a.x,a.z,player.x,player.z))/9));
      g.scale.setScalar(Math.max(.02,fade));
    }
    for(const a of birds.values()){
      a.life=Math.min(1,a.life+dt*.50);
      const s=a.model.species;
      const w=clock*.20*s.speed+a.phase;
      const px=a.x+Math.sin(w)*a.radius,pz=a.z+Math.cos(w*.9)*a.radius;
      const y=a.altitude+Math.sin(clock*.40+a.phase)*4.2;
      const g=a.model.group;
      const far=distance(px,pz,player.x,player.z);
      g.visible=far<visible;
      if(!g.visible)continue;
      g.position.set(px,y,pz);
      g.rotation.y=Math.atan2(Math.cos(w)*s.speed,Math.sin(w*.9)*s.speed)+.2;
      g.rotation.z=Math.sin(clock*.35+a.phase)*.12;
      const flap=Math.sin(clock*6.2*s.speed+a.phase)*.46;
      for(const wing of a.model.wings)wing.arm.rotation.z=flap*wing.side;
      g.scale.setScalar(Math.max(.02,Math.min(1,a.life,(visible-far)/12)));
    }
  }
  function dispose(){
    for(const a of [...active.values(),...inactive])scene.remove(a.model.group);
    for(const a of [...birds.values(),...inactiveBirds])scene.remove(a.model.group);
    for(const mesh of Object.values(shared))mesh.dispose();
    for(const mat of materialPool.values())mat.dispose();
  }
  return {update,refresh,dispose,
    get landCount(){return active.size},
    get birdCount(){return birds.size},
    get speciesCount(){return WILDLIFE_SPECIES.reduce((n,v)=>n+v.length,0)+BIRD_SPECIES.length},
    get resamples(){return rebuildCount}};
}
