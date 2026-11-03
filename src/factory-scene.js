import {worldPoint,normalizeRotation} from './facility-layout.js';
import {FACTORY_TASKS,YARD,yardPoint,storagePoint} from './factory-tasks.js?v=20261104b';

export function decorateFacility(T,group,b,materials){
  const [wood,stone,metal,trim,roof,amber]=materials;
  const workstations=[],animated=[],colliders=[];
  const stocks={raw:[],processed:[]};
  const p=(x,y,z)=>({x,y,z});
  const collision=(x,z,w,d)=>{
    const point=worldPoint(b,x,z);
    colliders.push({...point,w,d,angle:normalizeRotation(b.rotation)});
  };
  function box(w,h,d,m,x,y,z,collide=false){
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z);mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);
    if(collide)collision(x,z,w,d);
    return mesh;
  }
  function cy(rt,rb,h,m,x,y,z,collide=false){
    const mesh=new T.Mesh(new T.CylinderGeometry(rt,rb,h,8),m);
    mesh.position.set(x,y,z);mesh.castShadow=false;group.add(mesh);
    if(collide)collision(x,z,rt*2,rt*2);
    return mesh;
  }
  const contentMaterials=[
    new T.MeshLambertMaterial({color:0x976743}),
    new T.MeshLambertMaterial({color:0xa0a5a5}),
    new T.MeshLambertMaterial({color:0x6898ad}),
    new T.MeshLambertMaterial({color:0xe5c48b}),
    new T.MeshLambertMaterial({color:0xe2c678})
  ];
  const finishedMaterials=[
    new T.MeshLambertMaterial({color:0xc89a66}),
    new T.MeshLambertMaterial({color:0xb8bfc2}),
    new T.MeshLambertMaterial({color:0x9fc1c8}),
    new T.MeshLambertMaterial({color:0xcce7df,transparent:true,opacity:.84}),
    new T.MeshLambertMaterial({color:0xece2ca})
  ];
  function stock(kind,access,type){
    const z=access.z-1.03;
    const finished=kind==='processed',mat=finished?finishedMaterials[type]:contentMaterials[type];
    const x=access.x;
    box(1.35,.18,.88,wood,x,.15,z,true);
    for(let i=0;i<12;i++){
      const level=Math.floor(i/4),col=i%4,px=x-.44+col*.29;
      let obj;
      if(finished){
        if(type===0)obj=box(.25,.12,.61,mat,px,.30+level*.135,z);
        else if(type===1)obj=box(.26,.23,.50,mat,px,.37+level*.235,z);
        else if(type===2)obj=box(.24,.16,.46,mat,px,.33+level*.175,z);
        else if(type===3){
          obj=cy(.115,.13,.31,mat,px,.35+level*.36,z);
          // Bottled product is represented by its cylinder silhouette.
        }else obj=cy(.13,.19,.33,mat,px,.34+level*.38,z);
      }else if(type===0){
        obj=cy(.115,.115,.94,mat,px,.32+level*.24,z);obj.rotation.z=Math.PI/2;
      }else if(type===1||type===2){
        obj=new T.Mesh(new T.IcosahedronGeometry(.20,0),mat);
        obj.position.set(px,.32+level*.30,z);group.add(obj);
      }else if(type===3){
        obj=box(.24,.18,.48,mat,px,.30+level*.18,z);
      }else obj=cy(.12,.18,.40,mat,px,.38+level*.42,z);
      obj.castShadow=false;stocks[kind].push(obj);
    }
    // Side board makes the functional storage role immediately apparent.
    box(1.37,.12,.08,trim,x,1.0,z-.45);
  }
  if(b.kind==='worker'){
    stock('raw',{x:-2.75,z:3.15},b.type);
    // Tree piles, ore crates and produce sacks are deliberately at the pickup point.
  }
  if(b.kind==='factory'){
    // Four square units of clear yard in front of the workshop and five separate stations.
    box(17.8,.06,12.25,stone,0,.00,6.55);
    box(17.0,.07,.26,trim,0,.06,12.7);
    stock('raw',YARD.raw,b.type);stock('processed',YARD.output,b.type);
    FACTORY_TASKS[b.type].forEach((task,i)=>{
      const {x,z}=yardPoint({x:0,z:0},task.point);
      const bodyZ=z-1.15;
      const color=[wood,metal,stone,roof,trim][i];
      box(1.45,.10,1.34,stone,x,.05,bodyZ);
      // Machine remains behind operator standing point; no worker walks through apparatus.
      switch(task.tool){
        case 'rack':
        case 'pallet':
        case 'sacks':
          box(1.2,.56,.63,wood,x,.37,bodyZ,true);
          for(let k=0;k<4;k++)box(.22,.18,.45,k%2?trim:color,x-.42+k*.27,.74,bodyZ-.07);
          break;
        case 'saw':{
          box(1.5,.60,.64,metal,x,.45,bodyZ,true);
          const blade=cy(.38,.38,.10,trim,x,.86,bodyZ);
          blade.rotation.x=Math.PI/2;
          animated.push({mesh:blade,spin:6});
          box(.56,.12,.15,wood,x,.91,bodyZ+.2);break;
        }
        case 'planer':
        case 'anvil':
        case 'polisher':
        case 'bench':
          box(1.48,.70,.7,color,x,.44,bodyZ,true);
          box(.95,.18,.43,trim,x,.84,bodyZ);
          break;
        case 'furnace':
        case 'kiln':
          box(1.25,1.15,.95,metal,x,.63,bodyZ,true);
          box(.75,.43,.13,amber,x,.57,bodyZ+.50);
          break;
        case 'bellows':
          box(1.35,.54,.70,wood,x,.45,bodyZ,true);
          cy(.27,.30,.36,metal,x,.91,bodyZ);break;
        case 'mold':
          box(1.45,.64,.73,metal,x,.43,bodyZ,true);
          for(let k=0;k<3;k++)box(.32,.14,.26,trim,x-.47+k*.45,.82,bodyZ);break;
        case 'sieve':
          box(1.48,.62,.71,wood,x,.39,bodyZ,true);
          box(1.0,.08,.5,metal,x,.81,bodyZ);break;
        case 'hopper':
          cy(.48,.3,.72,metal,x,.80,bodyZ,true);
          box(.65,.51,.40,wood,x,.23,bodyZ);break;
        case 'mill':{
          cy(.63,.65,.28,stone,x,.49,bodyZ,true);
          const rotor=box(1.04,.11,.16,wood,x,.72,bodyZ);
          animated.push({mesh:rotor,spin:.7});break;
        }
        case 'trolley':
          box(1.34,.22,.75,wood,x,.34,bodyZ,true);
          for(let k of [-1,1])cy(.14,.14,.16,metal,x+k*.51,.16,bodyZ);break;
        default:
          box(1.3,.64,.65,color,x,.4,bodyZ,true);
      }
      workstations.push({...task,station:i,position:worldPoint(b,x,z)});
    });
  }
  // Model bounds are broad-phase collision shapes, not rigid-body simulation.
  collision(0,0,4.25,4.10);
  let cachedRaw=-1,cachedProcessed=-1;
  function updateStock(){
    const raw=b.kind==='factory'?b.inputRaw:b.kind==='worker'?b.stockRaw:0;
    const processed=b.kind==='factory'?b.stockProcessed:0;
    if(raw!==cachedRaw){
      cachedRaw=raw;const amount=Math.ceil(Math.max(0,raw)/9);
      stocks.raw.forEach((mesh,i)=>mesh.visible=i<amount);
    }
    if(processed!==cachedProcessed){
      cachedProcessed=processed;const amount=Math.ceil(Math.max(0,processed)/9);
      stocks.processed.forEach((mesh,i)=>mesh.visible=i<amount);
    }
  }
  updateStock();
  return {colliders,workstations,stockPoints:{
    raw:storagePoint(b,false),processed:storagePoint(b,true)
  },updateStock,updateAnimations(time){
    for(const anim of animated)anim.mesh.rotation.z=time*anim.spin;
  }};
}
