import {normalizeRotation} from './facility-layout.js';
import {decorateFacility} from './factory-scene.js?v=20261106c';
// Small industrial structures share materials and geometry detail budgets.
export function makeStructure(T, scene, building) {
  const palette=[
    {wall:0x805a3f,roof:0x456d43,trim:0xc9a477,ground:0x789c77},
    {wall:0x777c80,roof:0x3b505c,trim:0xd2c9b7,ground:0x9eaba8},
    {wall:0x776e62,roof:0x47565e,trim:0xd7a364,ground:0x9f8a70},
    {wall:0xd6b784,roof:0xb97954,trim:0xf5d8a4,ground:0xe2c494},
    {wall:0xb29365,roof:0x996241,trim:0xe6ce83,ground:0x92a46e}
  ];
  const t=Math.max(0,Math.min(4,building.type|0));
  const p=palette[t], kind=building.kind;
  const cache=makeStructure._materials||(makeStructure._materials=new Map());
  function mat(c,emissive=0){const k=c+':'+emissive;
    if(!cache.has(k))cache.set(k,new T.MeshLambertMaterial({color:c,emissive,emissiveIntensity:emissive?.32:0}));
    return cache.get(k);
  }
  const wall=mat(p.wall),roof=mat(p.roof),trim=mat(p.trim),ground=mat(p.ground),
    dark=mat(0x293739),metal=mat(0x7f9aa0),wood=mat(0x98623c),stone=mat(0x89908c),
    amber=mat(0xef9b39,0xe36f16),grass=mat(0x4f8057);
  const group=new T.Group(),moving=[];
  function box(w,h,d,m,x=0,y=0,z=0){const q=new T.Mesh(new T.BoxGeometry(w,h,d),m);
    q.position.set(x,y,z);q.castShadow=h>.5;q.receiveShadow=true;group.add(q);return q}
  function cylinder(rTop,rBottom,h,m,x=0,y=0,z=0,segments=9){const q=new T.Mesh(new T.CylinderGeometry(rTop,rBottom,h,segments),m);
    q.position.set(x,y,z);q.castShadow=h>.5;q.receiveShadow=true;group.add(q);return q}
  function ico(r,m,x=0,y=0,z=0){const q=new T.Mesh(new T.IcosahedronGeometry(r,0),m);
    q.position.set(x,y,z);q.castShadow=false;group.add(q);return q}
  function beamRoof(m=roof){const left=box(2.45,.26,3.9,m,-.97,2.6,0),right=box(2.45,.26,3.9,m,.97,2.6,0);
    left.rotation.z=.42;right.rotation.z=-.42}
  function shed(m=wall){box(3.4,2.25,3.2,m,0,1.15,0);beamRoof();box(.9,1.5,.10,dark,0,.76,1.66);
    box(.9,.7,.12,trim,-1,.95,1.66);box(.9,.7,.12,trim,1,.95,1.66)}
  function stackLogs(x,z){for(let i=0;i<5;i++){const q=cylinder(.16,.16,1.4,wood,x+(i%3)*.28,.25+Math.floor(i/3)*.32,z);
    q.rotation.z=Math.PI/2}}
  function crates(x,z){for(let i=0;i<3;i++){box(.58,.55,.58,i%2?wood:trim,x+(i%2)*.7,.30+Math.floor(i/2)*.56,z)}}
  function chimney(x,z){cylinder(.23,.29,2.35,dark,x,3,z);cylinder(.29,.28,.18,metal,x,4.15,z)}
  function rotor(x,y,z,axis='z'){const pivot=new T.Group();pivot.position.set(x,y,z);group.add(pivot);
    for(let i=0;i<4;i++){const arm=new T.Mesh(new T.BoxGeometry(.20,1.65,.12),trim);
      arm.position.y=.91;const blade=new T.Mesh(new T.BoxGeometry(.65,.96,.09),roof);
      blade.position.set(.25,1.46,0);
      const part=new T.Group();part.rotation.z=i*Math.PI/2;part.add(arm,blade);pivot.add(part)}
    if(axis==='x')pivot.rotation.y=Math.PI/2;
    moving.push({mesh:pivot,mode:'spin',speed:1.4});return pivot}
  box(4.05,.15,3.95,ground,0,.04,0);
  if(kind==='worker'){
    if(t===0){
      shed();for(let i=-1;i<=1;i++)box(3.45,.15,.15,wood,0,.72+i*.45,1.71);
      box(1.52,.15,.80,wood,2,.22,-1.1);cylinder(.31,.42,.8,stone,-2,.42,-1.1);
    }else if(t===1){
      shed(stone);for(let i=0;i<5;i++)ico(.42,stone,-1.5+i*.55,.4,2);
      box(2.1,.26,1.1,metal,.7,1.4,-1.0);cylinder(.10,.1,2,wood,1.5,1.5,-1.6);
    }else if(t===2){
      box(2.9,1.7,2.9,wall,0,.88,0);box(3.4,.3,3.4,metal,0,1.85,0);
      for(let x of [-1.25,1.25])for(let z of [-1.25,1.25])cylinder(.12,.12,4.0,dark,x,2,z);
      const top=box(3.45,.21,.3,metal,0,4,0);top.rotation.z=.10;
      cylinder(.46,.46,.32,metal,0,3.55,.15);
      crates(2,1.1);ico(.62,stone,-2,.4,-1.1);
    }else if(t===3){
      box(3.1,1.65,2.8,wall,0,.88,0);
      const cover=box(3.8,.2,3.4,roof,0,2,0);cover.rotation.z=.12;
      for(let x of [-1.6,1.6])for(let z of [-1.3,1.3])cylinder(.09,.09,2.1,wood,x,1.1,z);
      crates(1.9,1.5);cylinder(.4,.42,.65,trim,-1.9,.37,1.3);
    }else{
      shed();box(3.7,.23,3.7,trim,0,2.42,0);
      for(let i=0;i<6;i++){const q=cylinder(.05,.07,.95,grass,-2.0+i*.3,.48,1.9);q.rotation.z=.06}
      cylinder(.58,.63,.85,wood,1.95,.5,1.2);
    }
  }else if(kind==='factory'){
    if(t===0){
      shed();
      box(3.1,.35,1.13,dark,0,.84,2.0);
      for(let i=0;i<6;i++)cylinder(.15,.15,.22,metal,-1.2+i*.45,.76,2);
      const blade=cylinder(.61,.61,.12,metal,0,1.35,1.92,14);blade.rotation.x=Math.PI/2;
      moving.push({mesh:blade,mode:'blade',speed:5.5});
      box(1.55,.15,.9,wood,2,.22,1.0);chimney(-1.2,-1.0);
    }else if(t===1){
      shed(stone);box(2.6,.30,1.2,dark,0,.75,2);
      for(let i=0;i<3;i++)box(.7,.65,.65,stone,-.85+i*.75,1.24,2);
      const saw=cylinder(.54,.54,.18,metal,.65,1.85,2.1,12);saw.rotation.x=Math.PI/2;
      moving.push({mesh:saw,mode:'blade',speed:3.2});
      chimney(-1,-1);
    }else if(t===2){
      box(3.4,2.6,3.1,stone,0,1.34,0);
      box(3.8,.27,3.5,dark,0,2.77,0);
      box(1.3,1.22,.13,amber,0,.82,1.62);
      for(let x of [-1.3,1.3])chimney(x,-1);
      crates(2,1);
    }else if(t===3){
      box(3.4,2.3,3.1,wall,0,1.2,0);box(3.8,.24,3.5,roof,0,2.53,0);
      box(2.0,1.1,.13,amber,0,.78,1.6);
      chimney(-1,-1);chimney(1,-1);
      for(let i=0;i<3;i++)cylinder(.29,.29,.8,metal,1.6,.47,-1.1+i);
    }else{
      box(2.7,3.0,2.7,wall,0,1.54,0);
      const roofTop=new T.Mesh(new T.ConeGeometry(2.15,1.1,4),roof);roofTop.rotation.y=Math.PI/4;roofTop.position.y=3.54;
      roofTop.castShadow=true;group.add(roofTop);
      rotor(0,3.18,1.59);cylinder(.65,.68,.9,wood,1.9,.48,1.1);
      box(1.4,1.1,1.0,wood,-1.75,.58,.9);
    }
  }else if(kind==='road'){
    // Small civil-engineering depot, unmistakable from freight and sales facilities.
    box(3.7,1.95,3.4,wall,0,1.04,-.08);
    box(4.5,.32,4.2,roof,0,2.2,-.08);
    box(3.1,1.55,.12,dark,0,.82,1.62);
    for(let x of [-1.65,1.65])cylinder(.12,.12,2.0,metal,x,1.05,1.90);
    box(2.3,.20,1.1,stone,0,.12,2.75);
    for(let i=0;i<3;i++)box(.57,.25,.44,i%2?stone:trim,-1.1+i*1.1,.33,2.76);
    // Surveyor's marker poles and a compactor stored against the wall.
    for(let x of [-1.85,1.85])cylinder(.08,.08,2.30,trim,x,1.18,-1.4);
    cylinder(.42,.42,.85,metal,1.9,.48,-1.20);
  }else if(kind==='transport'){
    box(3.4,2.1,3.2,wall,0,1.1,-.1);
    box(4.1,.30,3.8,roof,0,2.29,-.1);
    box(2.35,1.6,.15,dark,0,.85,1.57);
    for(let x of [-1.4,1.4])cylinder(.09,.09,1.8,metal,x,.9,1.86);
    crates(2,1.15);
    const cart=box(1.4,.22,.9,wood,-1.9,.5,1.2);
    for(let x of [-2.4,-1.4]){const wheel=cylinder(.28,.28,.16,dark,x,.32,1.2);wheel.rotation.z=Math.PI/2}
    for(let i=0;i<3;i++)box(.64,.37,.55,trim,-1.9,.82+i*.4,1.2);
  }else{
    box(3.4,1.6,3.1,wall,0,.86,-.18);
    box(4.1,.29,3.8,roof,0,2.0,-.08);
    for(let z of [-1.4,1.4])for(let x of [-1.65,1.65])cylinder(.12,.12,2.2,wood,x,1.1,z);
    box(3.45,.48,.76,wood,0,1.1,1.78);
    for(let i=0;i<5;i++){const q=box(.72,.10,.80,i%2?trim:roof,-1.4+i*.7,2.25,1.34);
      q.rotation.z=i%2?.02:-.02}
    crates(2,1.2);cylinder(.42,.4,.9,trim,-1.95,.48,1.25);
  }
  // The nameplate is an integrated material that can change language in place.
  const industries={
    en:[['LOGGING HUT','QUARRY','MINE','EARTHWORKERS CAMP','FARM'],
      ['SAWMILL','STONE WORKSHOP','FOUNDRY','GLASSWORKS','MILL']],
    fr:[['CABANE DE BÛCHERON','CARRIÈRE','MINE','CAMP DE TERRASSIERS','FERME'],
      ['SCIERIE','ATELIER DE TAILLE','FONDERIE','VERRERIE','MOULIN']]
  };
  const names={en:['FREIGHT DEPOT','TRADE HOUSE','ROADWORKS'],fr:['DÉPÔT','COMPTOIR','ATELIER DE VOIRIE']};
  function labelFor(language){
    const lang=language==='fr'?'fr':'en';
    return kind==='worker'?industries[lang][0][t]:
      kind==='factory'?industries[lang][1][t]:
      names[lang][kind==='transport'?0:kind==='road'?2:1];
  }
  box(2.43,.52,.14,wood,0,2.19,1.72).castShadow=false;
  box(2.34,.39,.03,trim,0,2.19,1.815).castShadow=false;
  let plaque=null,currentLabel='';
  function setLanguage(lang){
    if(!plaque)return;
    const label=labelFor(lang);
    if(label===currentLabel)return;
    const texts=makeStructure._labels||(makeStructure._labels=new Map());
    if(!texts.has(label)){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=110;
      const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,110);
      ctx.fillStyle='#1d312d';ctx.font='bold 45px sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,56,480);
      texts.set(label,new T.CanvasTexture(canvas));
    }
    plaque.material.map=texts.get(label);
    plaque.material.needsUpdate=true;currentLabel=label;
  }
  if(typeof document!=='undefined'){
    plaque=new T.Mesh(new T.PlaneGeometry(2.22,.43),
      new T.MeshBasicMaterial({transparent:true,depthWrite:false}));
    plaque.position.set(0,2.19,1.85);group.add(plaque);
    let lang='en';
    try{lang=JSON.parse(localStorage.getItem('irh-options')||'{}').language||
      ((navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en')}
    catch{lang=(navigator.language||'en').toLowerCase().startsWith('fr')?'fr':'en'}
    setLanguage(lang);
  }
  if(kind==='worker'){
    for(let i=0;i<3;i++)box(.16,1.12,.16,wood,-1.35+i*1.35,.64,1.86);
    if(t===0){box(1.5,.15,1.0,wood,-1.5,.23,-2);box(1.5,.13,1.6,roof,2,1.08,-1)}
    else if(t===1||t===2){ico(.43,stone,1.85,.45,-1.5);ico(.28,metal,-1.80,.34,-1.6)}
    else if(t===3){cylinder(.42,.46,1.1,metal,1.6,.60,-1.5)}
    else {box(2.0,.22,1.1,wood,1.6,.46,-1.6);cylinder(.5,.54,.7,wood,-1.6,.40,-1.6)}
  }else if(kind==='factory'){
    for(let i=0;i<3;i++)box(.17,.65,.16,metal,-1.3+i*1.3,1.1,1.75);
    if(t===0||t===1){box(1.4,.14,.7,metal,0,.46,2.05);box(1.5,.15,1.0,wood,-1.8,.22,-2)}
    if(t===2||t===3){
      for(let i=0;i<2;i++)cylinder(.24,.31,1.8,metal,-1.5+i*3,1.1,-1.4);
      box(1.35,.42,.22,amber,.60,.47,1.83)
    }
    if(t===4)for(let i=0;i<3;i++)cylinder(.42,.46,.7,wood,-1.25+i*1.2,.44,1.82);
  }else{
    for(let i=0;i<3;i++)crates(-1.5+i*1.6,-1.75);
    if(kind==='transport')box(1.5,.12,1.4,metal,1.65,.35,-1.6);
    if(kind==='road'){box(1.5,.10,.55,stone,1.4,.38,-1.6);box(.30,1.5,.30,trim,-1.8,.8,-1.6)}
    if(kind==='seller')box(3.0,.19,.6,trim,0,.95,2.05);
  }
  // Do not change the model scale without changing its collision envelopes.
  const facility=decorateFacility(T,group,building,[wood,stone,metal,trim,roof,amber]);
  group.position.set(building.x,0,building.z);
  group.rotation.y=normalizeRotation(building.rotation);
  scene.add(group);
  return {
    group,setLanguage,get labelText(){return currentLabel},colliders:facility.colliders,workstations:facility.workstations,
    stockPoints:facility.stockPoints,
    update(time,active){
      facility.updateStock();
      if(!active)return;
      for(const item of moving)item.mesh.rotation.z=time*item.speed;
      facility.updateAnimations(time);
    }
  };
}
