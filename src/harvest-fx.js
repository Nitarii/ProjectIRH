// Five reusable, geometry-instanced harvest effects. No particles are allocated
// or removed on impact: each biome has a fixed pool and a maximum GPU budget.
export function createHarvestEffects(T,scene){
  const styles=[
    {colors:[0x397c40,0x78ad55,0xa68b4c,0x9e6b34],gravity:5.1,wind:.90,height:2.5},
    {colors:[0x929795,0xc0c4b8,0x555c5e,0xb9a99c],gravity:13,wind:.12,height:.85},
    {colors:[0x67adbd,0xe9c680,0x608692,0xc9e5dc],gravity:10,wind:.16,height:.95},
    {colors:[0xe6c48e,0xd9af69,0xc2a176,0xf1d5a4],gravity:4.8,wind:1.1,height:.65},
    {colors:[0xeac56c,0xf3d886,0xa3b05d,0x897742],gravity:4.0,wind:1.05,height:1.20}
  ];
  const MAX=64,dummy=new T.Object3D();
  const shape=[
    new T.PlaneGeometry(.095,.18),
    new T.TetrahedronGeometry(.09,0),
    new T.TetrahedronGeometry(.077,0),
    new T.PlaneGeometry(.068,.15),
    new T.PlaneGeometry(.052,.19)
  ];
  const effects=styles.map((style,type)=>{
    const particles=Array.from({length:MAX},()=>({
      life:0,total:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,rotation:0,spin:0
    }));
    const material=new T.MeshLambertMaterial({
      color:0xffffff,side:T.DoubleSide,vertexColors:false,transparent:true,opacity:.9,
      depthWrite:false
    });
    const mesh=new T.InstancedMesh(shape[type],material,MAX);
    mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;mesh.visible=false;
    dummy.scale.set(0,0,0);dummy.updateMatrix();
    for(let i=0;i<MAX;i++)mesh.setMatrixAt(i,dummy.matrix);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate=true;
    scene.add(mesh);
    return {mesh,particles,cursor:0,style,palette:style.colors.map(hex=>new T.Color(hex))};
  });
  const impacted=new Set();
  function emit(node,playerPosition=null){
    if(!node||node.dead)return;
    const type=node.type;
    const e=effects[type];if(!e)return;
    if(playerPosition&&Math.hypot(node.x-playerPosition.x,node.z-playerPosition.z)>43)return;
    const count=[13,10,12,14,14][type],style=e.style;
    node.impactTime=.36;
    impacted.add(node);
    for(let j=0;j<count;j++){
      const i=e.cursor++%MAX,p=e.particles[i],angle=Math.random()*Math.PI*2;
      const radius=type===0?.45+Math.random()*.8:.16+Math.random()*.54;
      const spread=.55+Math.random()*.95;
      p.total=.45+Math.random()*(type===0?1.30:.80);
      p.life=p.total;
      p.x=node.x+Math.cos(angle)*radius;
      p.z=node.z+Math.sin(angle)*radius;
      p.y=style.height+Math.random()*(type===0?1.7:.52);
      p.vx=Math.cos(angle)*spread*1.4;
      p.vz=Math.sin(angle)*spread*1.3;
      p.vy=type===0?1.05+Math.random():1.5+Math.random()*2.6;
      p.rotation=Math.random()*Math.PI*2;p.spin=(Math.random()-.5)*7;
      e.mesh.setColorAt(i,e.palette[(j+Math.floor(Math.random()*3))%e.palette.length]);
    }
    e.mesh.instanceColor.needsUpdate=true;
    e.mesh.visible=true;
  }
  function update(dt){
    if(dt<=0)return;
    const step=Math.min(.065,dt);
    for(const node of impacted){
      node.impactTime-=step;
      if(node.impactTime<=0){node.mesh.rotation.set(0,0,0);impacted.delete(node)}
      else {
        const energy=node.impactTime/.36;
        // Forest trunks sway gently; rock and ore only vibrate.
        const strength=node.type===0?.045:node.type===4?.035:.014;
        node.mesh.rotation.z=Math.sin(node.impactTime*41)*strength*energy;
      }
    }
    for(const {mesh,particles,style} of effects){
      let active=0;
      for(let i=0;i<MAX;i++){
        const p=particles[i];if(p.life<=0)continue;
        p.life=Math.max(0,p.life-step);
        if(p.life<=0){
          dummy.position.set(0,-500,0);dummy.scale.set(0,0,0);
        }else{
          const ratio=p.life/p.total;
          p.x+=(p.vx+style.wind*Math.sin(p.rotation)*.30)*step;
          p.y+=p.vy*step;
          p.z+=(p.vz+style.wind*.25)*step;
          p.vy-=style.gravity*step;
          p.rotation+=p.spin*step;
          dummy.position.set(p.x,Math.max(.12,p.y),p.z);
          dummy.rotation.set(p.rotation,p.rotation*.37,p.rotation*.2);
          const size=Math.max(.012,Math.sqrt(ratio));
          dummy.scale.set(size,size,size);active++;
        }
        dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      }
      mesh.visible=active>0;
      if(active)mesh.instanceMatrix.needsUpdate=true;
    }
  }
  function dispose(){
    for(const e of effects){scene.remove(e.mesh);e.mesh.dispose?.();e.mesh.material.dispose()}
    for(const g of shape)g.dispose();
    impacted.clear();
  }
  return {emit,update,dispose};
}
