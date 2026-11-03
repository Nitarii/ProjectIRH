// Wind-driven ambient particles. Instanced batches replace dozens of
// individual leaf meshes, keeping environmental detail to four draw calls.
export function createAtmosphere(T,scene,player,biomeAt,nearbyResources=null){
  const colors=[0x87bb63,0xc4d0d4,0xb1a9a4,0xe9c892,0xe9c16d];
  const geo=new T.PlaneGeometry(.27,.17);
  const materials=colors.map(color=>new T.MeshBasicMaterial({
    color,transparent:true,opacity:.52,side:T.DoubleSide,
    depthWrite:false,alphaTest:.045,fog:true
  }));
  const batches=materials.map((mat,i)=>{
    const mesh=new T.InstancedMesh(geo,mat,10);
    mesh.count=0;mesh.frustumCulled=false;
    scene.add(mesh);return mesh;
  });
  const dummy=new T.Object3D(),items=[];
  const rand=(a,b)=>{const n=Math.sin(a*137.91+b*78.41)*43758.5453;return n-Math.floor(n)};
  for(let i=0;i<32;i++){
    const theta=i*2.39996;
    items.push({angle:theta,range:4+rand(i,1)*32,height:.35+rand(i,2)*4.2,
      speed:.12+rand(i,3)*.34,seed:i*8.57});
  }
  let enabled=true,frame=0,wind=0;
  function setEnabled(value){
    enabled=!!value;
    if(!enabled)for(const batch of batches)batch.count=0;
  }
  function update(dt,elapsed,resources){
    if(!enabled||dt<=0)return;
    wind+=dt;frame+=dt;
    if(frame<.065)return;
    frame=0;
    const px=player.position.x,pz=player.position.z;
    const counts=[0,0,0,0,0];
    for(const item of items){
      const t=wind*item.speed;
      const x=px+Math.cos(item.angle)*item.range+Math.sin(t+item.seed)*2.2;
      const z=pz+Math.sin(item.angle)*item.range+Math.cos(t*.74+item.seed)*2.4;
      const b=biomeAt(x,z);
      if(b<0||b>4||counts[b]>=10)continue;
      const y=item.height+Math.sin(wind*.7+item.seed)*.52;
      dummy.position.set(x,y,z);
      dummy.rotation.set(t+item.seed,t*.7,Math.sin(wind+item.seed)*.7);
      const scale=b===3?.68:b===4?.85:1;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      batches[b].setMatrixAt(counts[b]++,dummy.matrix);
    }
    for(let i=0;i<5;i++){
      batches[i].count=counts[i];
      if(counts[i]>0)batches[i].instanceMatrix.needsUpdate=true;
    }
    // World-anchored wind sway, limited to nearby plant meshes only.
    const breeze=Math.sin(wind*.81)*.019;
    if(nearbyResources){
      for(const o of nearbyResources()){
        if(o.dead||Math.abs(o.x-px)>38||Math.abs(o.z-pz)>38)continue;
        o.mesh.rotation.z=o.type===0||o.type===4?
          breeze*Math.sin(o.x*.3+o.z*.2+wind):0;
      }
    }
  }
  function dispose(){
    for(const batch of batches)scene.remove(batch);
    geo.dispose();for(const mat of materials)mat.dispose();
  }
  return {update,setEnabled,dispose,get particleCount(){return batches.reduce((n,b)=>n+b.count,0)}};
}
