// Readable, rounded paths and paved roads rendered in five shared draw batches.
// No per-tile mesh allocation, no collision shapes, no shadow maps, no
// per-frame rebuilds. Geometry is fixed to world coordinates, independent
// of the camera, and respects the existing road network's 3m cells.
const stage=t=>Math.max(0,Math.min(2,Number(t?.l??t)||0));
export function createRoadSurfaces(T,scene,roads,player,{
  viewDistance=()=>128,quality=()=> 'balanced',origin=()=>player.position,cell=3
}={}){
  const MAX=1550;
  const plane=new T.PlaneGeometry(1,1);plane.rotateX(-Math.PI/2);
  const stone=new T.MeshLambertMaterial({
    color:0x918c7c,transparent:true,opacity:.96,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
  });
  const dirt=new T.MeshLambertMaterial({
    color:0xbca17c,transparent:true,opacity:.95,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
  });
  const shoulder=new T.MeshLambertMaterial({
    color:0x6c624e,transparent:true,opacity:.76,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
  });
  const border=new T.MeshLambertMaterial({
    color:0xcfc4a9,transparent:true,opacity:.74,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
  });
  const center=new T.MeshBasicMaterial({
    color:0xe0d5a9,transparent:true,opacity:.48,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
  });
  // Rounded, softly fading edges on a low-overdraw tile. The path stays
  // legible in forests and deserts, without 1000 independent road meshes.
  for(const mat of [stone,dirt,shoulder]){
    mat.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying vec2 roadUv;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nroadUv=position.xz+vec2(.5);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\nvarying vec2 roadUv;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',
        '#include <alphatest_fragment>\nvec2 q=abs(roadUv-.5)*2.0;'+
        'float edge=max(q.x,q.y);'+
        'diffuseColor.a*=1.0-smoothstep(.81,1.0,edge);');
    };
    mat.customProgramCacheKey=()=> 'nim-rounded-road-v1';
  }
  function batch(mat,max=MAX){
    const mesh=new T.InstancedMesh(plane,mat,max);
    mesh.count=0;mesh.castShadow=false;mesh.receiveShadow=true;
    mesh.frustumCulled=false;mesh.renderOrder=1;scene.add(mesh);
    return mesh;
  }
  const shoulders=batch(shoulder),paths=batch(dirt),pavement=batch(stone);
  const borders=batch(border,MAX*2),centers=batch(center);
  const blueprintMaterial=new T.MeshBasicMaterial({color:0x59d2e4,transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide});
  const demolitionMaterial=new T.MeshBasicMaterial({color:0xed8e67,transparent:true,opacity:.49,depthWrite:false,side:T.DoubleSide});
  const blueprints=batch(blueprintMaterial),demolitions=batch(demolitionMaterial);
  const dummy=new T.Object3D();
  let clock=0,previousX=Infinity,previousZ=Infinity,
      previousRevision=-1,previousRange=-1,visible=0;
  const key=(x,z)=>x+','+z;
  function pose(mesh,index,x,z,w,l,y=.022){
    dummy.position.set(x,y,z);
    dummy.rotation.set(0,0,0);
    dummy.scale.set(w,1,l);
    dummy.updateMatrix();
    mesh.setMatrixAt(index,dummy.matrix);
  }
  function refresh(){
    const center=origin(),radius=Math.min(205,Math.max(48,viewDistance()*.89));
    const r2=radius*radius,tiles=roads?.data||{},found=[];
    const detailed=quality()!=='low';
    for(const [k,item] of Object.entries(tiles)){
      const level=stage(item);if(!level&&!item?.goal)continue;
      const [ix,iz]=k.split(',').map(Number);
      if(!Number.isFinite(ix+iz))continue;
      const x=(ix+.5)*cell,z=(iz+.5)*cell;
      const d2=(x-center.x)**2+(z-center.z)**2;
      if(d2>r2)continue;
      found.push({ix,iz,x,z,d2,level,goal:item?.goal});
    }
    found.sort((a,b)=>a.d2-b.d2);
    let nc=0,np=0,nd=0,nb=0,ns=0,ng=0,nr=0;
    for(const item of found.slice(0,MAX)){
      const {ix,iz,x,z,level,goal}=item;
      if(goal==='build'&&ng<MAX)pose(blueprints,ng++,x,z,cell*.89,cell*.89,.044);
      if(goal==='demolish'&&nr<MAX)pose(demolitions,nr++,x,z,cell*.89,cell*.89,.046);
      if(!level)continue;
      pose(shoulders,nc++,x,z,cell+1.0,cell+1.0,.014);
      if(level===1){
        pose(paths,nd++,x,z,cell+.35,cell+.35,.020);
      }else{
        pose(pavement,np++,x,z,cell+.50,cell+.50,.023);
        if(detailed){
          const has=(ax,az)=>stage(tiles[key(ax,az)])>0;
          const horizontal=Number(has(ix+1,iz))+Number(has(ix-1,iz))>=
            Number(has(ix,iz+1))+Number(has(ix,iz-1));
          if(nb+2<=MAX*2){
            if(horizontal){
              pose(borders,nb++,x,z-1.24,cell*.85,.065,.029);
              pose(borders,nb++,x,z+1.24,cell*.85,.065,.029);
            }else{
              pose(borders,nb++,x-1.24,z,.065,cell*.85,.029);
              pose(borders,nb++,x+1.24,z,.065,cell*.85,.029);
            }
          }
          if(ns<MAX){
            if(horizontal)pose(centers,ns++,x,z,.49,.047,.031);
            else pose(centers,ns++,x,z,.047,.49,.031);
          }
        }
      }
    }
    shoulders.count=nc;paths.count=nd;pavement.count=np;
    borders.count=nb;centers.count=ns;blueprints.count=ng;demolitions.count=nr;visible=nc;
    for(const mesh of [shoulders,paths,pavement,borders,centers,blueprints,demolitions])
      if(mesh.count)mesh.instanceMatrix.needsUpdate=true;
  }
  function update(dt){
    clock+=Math.max(0,dt);
    const pos=origin(),r=roads?.revision??0,range=viewDistance();
    if(clock<.65&&r===previousRevision&&
       (pos.x-previousX)**2+(pos.z-previousZ)**2<64&&range===previousRange)return;
    clock=0;previousX=pos.x;previousZ=pos.z;
    previousRevision=r;previousRange=range;
    refresh();
  }
  function dispose(){
    for(const mesh of [shoulders,paths,pavement,borders,centers,blueprints,demolitions])scene.remove(mesh);
    plane.dispose();for(const mat of [stone,dirt,shoulder,border,center,blueprintMaterial,demolitionMaterial])mat.dispose();
  }
  return {update,dispose,get visibleTiles(){return visible},get drawBatches(){return 7}};
}
