export function createResourceGraphics(T){
  const palette={oak:0x367c4f,pine:0x315b47,autumn:0x9e8047,birch:0xa2b18a,wood:0x815a37,bark:0xb7ae9d,
    stone:0x929ba0,stoneDark:0x68767d,stoneLight:0xbbc0ad,ore:0x58a6bd,oreAlt:0x88b5b0,
    sand:0xe1c88a,sandLight:0xf3dcab,sandDark:0xbfa077,wheat:0xe9bc60,wheatLight:0xf1d885,wheatGreen:0x9dae68};
  const materials=Object.fromEntries(Object.entries(palette).map(([key,value])=>[key,new T.MeshLambertMaterial({color:value})]));
  function part(group,geometry,material,x=0,y=0,z=0){
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);
    mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);return mesh
  }
  // Geometries are identical across thousands of streamed nodes.
  // Reuse the exact primitive where dimensions match; retain unique randomized
  // ore shapes without growing the cache indefinitely.
  const geometryCache=new Map(),MAX_SHARED=180;
  function geometry(kind,args,build){
    const key=kind+':'+args.join(':');
    let result=geometryCache.get(key);
    if(result)return result;
    result=build();
    if(geometryCache.size<MAX_SHARED){
      if(!result.userData)result.userData={};
      result.userData.sharedWorldGeometry=true;
      geometryCache.set(key,result);
    }
    return result;
  }
  function cyl(g,rt,rb,h,mat,x,y,z,segments=7){
    return part(g,geometry('c',[rt,rb,h,segments],
      ()=>new T.CylinderGeometry(rt,rb,h,segments)),mat,x,y,z);
  }
  function ico(g,r,mat,x,y,z,detail=0){
    return part(g,geometry('i',[r,detail],
      ()=>new T.IcosahedronGeometry(r,detail)),mat,x,y,z);
  }
  function cone(g,r,h,mat,x,y,z,seg=7){
    return part(g,geometry('k',[r,h,seg],
      ()=>new T.ConeGeometry(r,h,seg)),mat,x,y,z);
  }
  function box(g,w,h,d,mat,x,y,z){
    return part(g,geometry('b',[w,h,d],
      ()=>new T.BoxGeometry(w,h,d)),mat,x,y,z);
  }
  const rnd=(s)=>{let t=Math.sin(s*115.87+18.46)*43758.545;return t-Math.floor(t)};
  function createNode(type,variant,seed){
    const g=new T.Group(),v=((variant%4)+4)%4;
    if(type===0){
      const height=[3.8,4.4,3.4,3.15][v];
      const trunk=cyl(g,v===3?.23:.32,.4,height*.71,v===3?materials.bark:materials.wood,0,height*.355,0);
      trunk.castShadow=true;
      if(v===0){
        ico(g,1.03,materials.oak,-.38,3.06,.02,1);
        ico(g,.94,materials.oak,.5,3.13,-.08,1);
        ico(g,1.03,materials.oak,0,3.55,.03,1);
      }else if(v===1){
        for(let k=0;k<4;k++)cone(g,1.25-k*.2,1.9-k*.13,k%2?materials.pine:materials.oak,0,2.15+k*.62,0,7);
      }else if(v===2){
        ico(g,1.01,materials.autumn,.2,2.9,-.2,1);
        ico(g,.84,materials.autumn,-.54,3.02,.15,1);
        ico(g,.89,materials.wheatLight,.04,3.54,.1,1);
      }else{
        for(let k=0;k<3;k++)ico(g,.75-k*.12,materials.birch,(k-1)*.30,2.50+k*.43,.07,1);
        for(let k=0;k<5;k++){
          const b=cyl(g,.095,.10,.83,materials.bark,(k-2)*.07,2.52+(k%3)*.25,.15,5);
          b.rotation.z=(k-2)*.19;
        }
      }
    }else if(type===1){
      const colors=[materials.stone,materials.stoneDark,materials.stoneLight,materials.stone];
      if(v===0){
        const q=ico(g,1.18,colors[v],0,.93,0,1);q.scale.set(1.24,.75,.92);
        ico(g,.4,materials.stoneDark,-.70,.44,.48);
      }else if(v===1){
        for(let i=0;i<5;i++){const q=ico(g,.61+((i+v)%3)*.17,colors[i%4],Math.cos(i*2.5)*.56,.65+(.2*(i%2)),Math.sin(i*2.5)*.46);q.scale.y=.88}
      }else if(v===2){
        for(let i=0;i<4;i++)box(g,.92,.35+i*.16,.84,i%2?materials.stoneDark:materials.stoneLight,(i%2-.5)*.52,.22+i*.27,(i-1.5)*.26);
      }else{
        const q=ico(g,1.1,materials.stone,0,.75,0,1);q.scale.set(1.05,.70,1.25);
        for(let i=0;i<4;i++)ico(g,.21,materials.stoneDark,-.35+i*.25,1.12,.57);
      }
    }else if(type===2){
      const base=ico(g,.95,materials.stoneDark,0,.64,0,1);
      base.scale.set(1.25,.83,1.12);
      if(v===0||v===2){
        for(let i=0;i<6;i++){
          const h=.64+rnd(seed+i)*.73;
          const crystal=cone(g,.23,h,i%2?materials.oreAlt:materials.ore,Math.sin(i*2.4)*.55,1.03+h*.38,Math.cos(i*2.4)*.47,5);
          crystal.rotation.z=(i-2.5)*.12;
        }
      }else if(v===1){
        for(let i=0;i<5;i++)ico(g,.29,materials.oreAlt,Math.sin(i*2.2)*.54,.98+Math.abs(Math.sin(i))*.29,Math.cos(i*2.2)*.43);
      }else{
        for(let i=0;i<4;i++){const c=box(g,.37,.45,.45,materials.ore,Math.cos(i*Math.PI/2)*.52,1.04,Math.sin(i*Math.PI/2)*.49);c.rotation.y=i*.66}
        ico(g,.4,materials.oreAlt,0,1.2,0);
      }
    }else if(type===3){
      if(v===0){
        const dune=ico(g,1.0,materials.sand,0,.49,0,1);dune.scale.set(1.27,.5,1.2);
        ico(g,.45,materials.sandLight,-.48,.35,.25);
      }else if(v===1){
        for(let i=0;i<4;i++){const q=ico(g,.60,materials.sandDark,Math.sin(i*2.1)*.55,.3,Math.cos(i*2.1)*.49);q.scale.y=.35}
        ico(g,.70,materials.sandLight,0,.45,0);
      }else if(v===2){
        for(let i=0;i<3;i++){const q=ico(g,.72,materials.sand,Math.sin(i*2.1)*.48,.36,Math.cos(i*2.1)*.39);q.scale.set(1,.55,1.2)}
        box(g,.44,.17,.28,materials.sandDark,.28,.4,-.06);
      }else{
        const q=ico(g,.98,materials.sandLight,0,.42,0,1);q.scale.set(1.4,.45,1.05);
        for(let i=0;i<4;i++)ico(g,.17,materials.sandDark,(i-1.5)*.28,.43,.15);
      }
    }else if(type===4){
      const amount=12+v*3;
      const stems=new T.InstancedMesh(geometry('c',[.025,.034,1,5],()=>new T.CylinderGeometry(.025,.034,1,5)),materials.wheatGreen,amount);
      const grain=new T.InstancedMesh(geometry('k',[.092,.4,5],()=>new T.ConeGeometry(.092,.4,5)),materials.wheat,amount);
      stems.castShadow=false;grain.castShadow=false;
      const dummy=new T.Object3D();
      for(let i=0;i<amount;i++){
        const a=i*2.399,r=.18+.55*Math.sqrt((i+.5)/amount),x=Math.sin(a)*r,z=Math.cos(a)*r;
        const h=.99+rnd(seed+i)*.31,lean=(rnd(i+seed*3)-.5)*.2;
        dummy.position.set(x,h*.5,z);dummy.rotation.set(0,0,lean);
        dummy.scale.set(1,h,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
        dummy.position.set(x+lean*.15,h+.12,z);dummy.rotation.set(0,0,(rnd(seed+i*5)-.5)*.4);
        dummy.scale.set(1,1,1);dummy.updateMatrix();grain.setMatrixAt(i,dummy.matrix);
      }
      stems.instanceMatrix.needsUpdate=true;grain.instanceMatrix.needsUpdate=true;
      g.add(stems,grain);
    }
    return g;
  }
  return {createNode,get geometryCount(){return geometryCache.size}};
}
