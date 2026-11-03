import assert from 'node:assert/strict';
import {batchResourceNodes,setDistantResource} from '../src/resource-batches.js';
class Matrix4{
  constructor(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
  makeScale(x,y,z){this.elements[0]=x;this.elements[5]=y;this.elements[10]=z;return this}
  clone(){const next=new Matrix4();next.elements=[...this.elements];return next}
}
class Vector3{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}}
class Sphere{constructor(center,radius){this.center=center;this.radius=radius}}
class InstancedMesh{
  constructor(geometry,material,count){
    this.geometry=geometry;this.material=material;this.count=count;
    this.instanceMatrix={needsUpdate:false,setUsage(){}};
    this.matrices=Array(count);this.isInstancedMesh=true;
  }
  setMatrixAt(index,matrix){this.matrices[index]=matrix.clone()}
}
const T={Matrix4,Vector3,Sphere,InstancedMesh,DynamicDrawUsage:35048};
const treeGeometry={uuid:'shared-tree'},trunkMaterial={uuid:'brown'};
const node=(x,z)=>({
  type:0,dead:false,mesh:{updateMatrixWorld(){},children:[{
    isMesh:true,isInstancedMesh:false,castShadow:true,
    geometry:treeGeometry,material:trunkMaterial,
    matrixWorld:Object.assign(new Matrix4(),{elements:[1,0,0,0,0,1,0,0,0,0,1,0,x,1,z,1]})
  }]}
});
const a=node(14,22),b=node(19,25);
const chunk={nodes:[a,b],root:{children:[],add(m){this.children.push(m)}}};
const batches=batchResourceNodes(T,chunk);
assert.equal(batches.length,1,'same detailed model must share one draw call');
assert.equal(batches[0].count,2,'both trees must retain their own full geometry');
assert.equal(batches[0].geometry,treeGeometry,'geometry quality may not be reduced');
assert.ok(batches[0].matrices.every(m=>m.elements[0]===0),'no far ghosts at initialization');
setDistantResource(T,a,true);
assert.equal(batches[0].matrices[0].elements[12],14);
assert.equal(batches[0].matrices[1].elements[0],0);
setDistantResource(T,b,true);
assert.equal(batches[0].matrices[1].elements[12],19);
setDistantResource(T,a,false);
assert.equal(batches[0].matrices[0].elements[0],0,'hidden node must disappear');
assert.equal(batchResourceNodes(T,chunk),batches,'chunk batches must be reused');
console.log('Exact resource instancing, live visibility and batch caching verified');
