// Forest-only procedural vegetation. No mining, desert, quarry or farm meshes.
export function createResourceGraphics(T){
  const colors={
    oak:0x367c4f,pine:0x315b47,autumn:0x9e8047,birch:0xa2b18a,
    wood:0x815a37,bark:0xb7ae9d,sunlit:0xe4cf87
  };
  const materials=Object.fromEntries(Object.entries(colors).map(
    ([name,color])=>[name,new T.MeshLambertMaterial({color})]));
  const cache=new Map();
  function shared(kind,dimensions,make){
    const id=kind+':'+dimensions.join(':');
    let geo=cache.get(id);
    if(!geo){geo=make();geo.userData={...geo.userData,sharedWorldGeometry:true};cache.set(id,geo)}
    return geo;
  }
  function place(group,geo,mat,x=0,y=0,z=0){
    const mesh=new T.Mesh(geo,materials[mat]);
    mesh.position.set(x,y,z);mesh.receiveShadow=false;mesh.castShadow=false;
    group.add(mesh);return mesh;
  }
  const cylinder=(g,rt,rb,h,mat,x,y,z,n=7)=>place(g,
    shared('c',[rt,rb,h,n],()=>new T.CylinderGeometry(rt,rb,h,n)),mat,x,y,z);
  const ico=(g,r,mat,x,y,z,detail=0)=>place(g,
    shared('i',[r,detail],()=>new T.IcosahedronGeometry(r,detail)),mat,x,y,z);
  const cone=(g,r,h,mat,x,y,z,n=7)=>place(g,
    shared('k',[r,h,n],()=>new T.ConeGeometry(r,h,n)),mat,x,y,z);
  function createNode(type,variant){
    // A single renewable *category* (wood), with four purely visual trees.
    const group=new T.Group(),v=((variant%4)+4)%4;
    const height=[3.8,4.4,3.4,3.15][v];
    const trunk=cylinder(group,v===3?.23:.32,.4,height*.71,
      v===3?'bark':'wood',0,height*.355,0);
    trunk.castShadow=true;
    if(v===0){
      ico(group,1.03,'oak',-.38,3.06,.02,1);
      ico(group,.94,'oak',.50,3.13,-.08,1);
      ico(group,1.03,'oak',0,3.55,.03,1);
    }else if(v===1){
      for(let i=0;i<4;i++)
        cone(group,1.25-i*.2,1.9-i*.13,i%2?'pine':'oak',
          0,2.15+i*.62,0);
    }else if(v===2){
      ico(group,1.01,'autumn',.2,2.9,-.2,1);
      ico(group,.84,'autumn',-.54,3.02,.15,1);
      ico(group,.89,'sunlit',.04,3.54,.1,1);
    }else{
      for(let i=0;i<3;i++)
        ico(group,.75-i*.12,'birch',(i-1)*.30,2.50+i*.43,.07,1);
      for(let i=0;i<5;i++){
        const bark=cylinder(group,.095,.1,.83,'bark',
          (i-2)*.07,2.52+(i%3)*.25,.15,5);
        bark.rotation.z=(i-2)*.19;
      }
    }
    return group;
  }
  return {createNode,get geometryCount(){return cache.size}};
}
