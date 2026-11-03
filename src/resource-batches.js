// Instancing preserves the exact resource geometry at distance, while nearby
// resources keep their individual models and environmental animation.
export function batchResourceNodes(T,chunk){
  if(chunk.resourceBatches)return chunk.resourceBatches;
  const groups=new Map(),hidden=new T.Matrix4().makeScale(0,0,0);
  for(const node of chunk.nodes){
    node.batchSlots=[];
    node.batchFar=false;
    // The wheat resource already uses internal instancing and is surrounded by
    // the continuously instanced grain fields. Leave that model untouched.
    if(node.type===4)continue;
    node.mesh.updateMatrixWorld(true);
    for(const mesh of node.mesh.children){
      if(!mesh.isMesh||mesh.isInstancedMesh)continue;
      const key=mesh.geometry.uuid+'|'+mesh.material.uuid;
      let group=groups.get(key);
      if(!group){group={geometry:mesh.geometry,material:mesh.material,shadow:false,items:[]};groups.set(key,group)}
      group.shadow||=mesh.castShadow;
      group.items.push({node,matrix:mesh.matrixWorld.clone()});
    }
  }
  const batches=[];
  for(const group of groups.values()){
    const mesh=new T.InstancedMesh(group.geometry,group.material,group.items.length);
    mesh.castShadow=group.shadow;mesh.receiveShadow=false;
    mesh.frustumCulled=true;
    group.items.forEach(({node,matrix},index)=>{
      mesh.setMatrixAt(index,hidden);
      node.batchSlots.push({mesh,index,matrix});
    });
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.instanceMatrix.needsUpdate=true;
    chunk.root.add(mesh);
    batches.push(mesh);
  }
  chunk.resourceBatches=batches;
  return batches;
}
export function setDistantResource(T,node,visible){
  if(!node.batchSlots?.length)return;
  const desired=!!visible;
  if(node.batchFar===desired)return;
  if(!setDistantResource.emptyMatrix)setDistantResource.emptyMatrix=new T.Matrix4().makeScale(0,0,0);
  const empty=setDistantResource.emptyMatrix;
  for(const entry of node.batchSlots){
    entry.mesh.setMatrixAt(entry.index,desired?entry.matrix:empty);
    entry.mesh.instanceMatrix.needsUpdate=true;
  }
  node.batchFar=desired;
}
