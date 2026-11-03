// Camera-independent world-space vegetation particles and subtle foliage sway.
// Player position only selects which fixed world cells are rendered; it NEVER
// determines particle coordinates or their motion. Five instanced draw batches.
const fract=n=>n-Math.floor(n);
const hash=(x,z,seed)=>fract(Math.sin(x*127.91+z*78.41+seed*41.37)*43758.5453);
export function atmosphereSite(ix,iz,slot=0,cell=19){
  const seed=slot*7.13+1;
  return {
    x:(ix+.16+hash(ix,iz,seed)*.68)*cell,
    z:(iz+.16+hash(ix,iz,seed+2)*.68)*cell,
    height:.35+hash(ix,iz,seed+3)*4.2,
    phase:hash(ix,iz,seed+4)*Math.PI*2,
    speed:.12+hash(ix,iz,seed+5)*.34
  };
}
export function createAtmosphere(T,scene,player,biomeAt,nearbyResources=null){
  const colors=[0x87bb63,0xc4d0d4,0xb1a9a4,0xe9c892,0xe9c16d];
  const geo=new T.PlaneGeometry(.27,.17);
  const materials=colors.map(color=>new T.MeshBasicMaterial({
    color,transparent:true,opacity:.52,side:T.DoubleSide,
    depthWrite:false,alphaTest:.045,fog:true
  }));
  const batches=materials.map((mat)=>{
    const mesh=new T.InstancedMesh(geo,mat,10);
    mesh.count=0;mesh.frustumCulled=false;
    scene.add(mesh);return mesh;
  });
  const dummy=new T.Object3D(),sites=[];
  let enabled=true,frame=0,wind=0,lastCX=Infinity,lastCZ=Infinity;
  const CELL=19,MAX_PARTICLES=32;
  function refreshSites(px,pz){
    const cx=Math.floor(px/CELL),cz=Math.floor(pz/CELL);
    if(cx===lastCX&&cz===lastCZ)return;
    lastCX=cx;lastCZ=cz;
    const candidates=[];
    for(let ix=cx-2;ix<=cx+2;ix++)for(let iz=cz-2;iz<=cz+2;iz++){
      for(let slot=0;slot<2;slot++){
        if(hash(ix,iz,slot+21)>.86)continue;
        const site=atmosphereSite(ix,iz,slot,CELL);
        const d2=(site.x-px)**2+(site.z-pz)**2;
        candidates.push({...site,d2});
      }
    }
    candidates.sort((a,b)=>a.d2-b.d2);
    sites.length=0;
    sites.push(...candidates.slice(0,MAX_PARTICLES));
  }
  function setEnabled(value){
    enabled=!!value;
    if(!enabled)for(const batch of batches)batch.count=0;
    else {lastCX=Infinity;lastCZ=Infinity}
  }
  function update(dt,elapsed){
    if(!enabled||dt<=0)return;
    wind=Number.isFinite(elapsed)?elapsed:wind+dt;
    frame+=dt;
    if(frame<.065)return;
    frame=0;
    const px=player.position.x,pz=player.position.z;
    refreshSites(px,pz);
    const counts=[0,0,0,0,0];
    for(const site of sites){
      // Oscillating world wind: walking or turning cannot drag particles.
      const x=site.x+Math.sin(wind*site.speed*.47+site.phase)*1.7;
      const z=site.z+Math.cos(wind*site.speed*.36+site.phase)*1.9;
      const biome=biomeAt(site.x,site.z);
      if(biome<0||biome>4||counts[biome]>=10)continue;
      const y=site.height+Math.sin(wind*.7+site.phase)*.52;
      dummy.position.set(x,y,z);
      dummy.rotation.set(wind*.35+site.phase,wind*.25+site.phase,
        Math.sin(wind*.81+site.phase)*.7);
      const scale=biome===3?.68:biome===4?.85:1;
      dummy.scale.setScalar(scale);dummy.updateMatrix();
      batches[biome].setMatrixAt(counts[biome]++,dummy.matrix);
    }
    for(let i=0;i<5;i++){
      batches[i].count=counts[i];
      if(counts[i])batches[i].instanceMatrix.needsUpdate=true;
    }
    // Only the selection of nearby foliage depends on the observer; each
    // plant's sway is computed from its own world position and world time.
    if(nearbyResources){
      const breeze=Math.sin(wind*.81)*.019;
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
  return {update,setEnabled,dispose,
    get particleCount(){return batches.reduce((n,b)=>n+b.count,0)}};
}
