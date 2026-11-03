import assert from 'node:assert/strict';
import {createTrails} from '../src/trails.js';

class Color{
  constructor(value){
    const n=Number.parseInt(String(value).replace('#',''),16);
    this.r=((n>>16)&255)/255;
    this.g=((n>>8)&255)/255;
    this.b=(n&255)/255;
  }
}
const T={Color};
function makeTile(){
  const colors={array:new Float32Array([.46,.62,.43]),needsUpdate:false};
  const position={count:1,getX:()=>-13.5,getZ:()=>-14.8};
  const chunk={root:{children:[{geometry:{attributes:{position,color:colors}}}]}};
  return {chunk,colors};
}
const state={trails:{}},world=new Map();
const {chunk,colors}=makeTile();world.set('0,0',chunk);
const trails=createTrails(T,state,world);
trails.initChunk(chunk,0,0);
const natural=[...colors.array];
assert.equal(trails.count,0);
trails.recordMovement('staff1',1.2,1.2);
trails.recordMovement('staff1',3.5,1.2);
trails.update(1.8);
assert.ok(natural.every((v,i)=>Math.abs(v-colors.array[i])<.0001),
  'one traversal must not instantly carve a road');
for(let i=0;i<440;i++)trails.recordMovement('staff1',i%2?1.2:3.5,1.2);
trails.update(1.8);
assert.ok(trails.count>=2,'traffic must accumulate in sparse cells');
assert.ok(Object.values(state.trails).some(v=>v>70),'well-used paths accumulate measurable wear');
assert.ok(natural.some((v,i)=>Math.abs(v-colors.array[i])>.01),
  'repeated traffic should gradually modify terrain colors');
const saved=JSON.parse(JSON.stringify(state));
const second=new Map();const fresh=makeTile();second.set('0,0',fresh.chunk);
createTrails(T,saved,second).initChunk(fresh.chunk,0,0);
assert.ok(fresh.colors.array.some((v,i)=>Math.abs(v-natural[i])>.01),
  'worn routes must survive saving and reloading');
console.log(JSON.stringify({records:trails.count,traffic:Object.values(state.trails),terrainColor:[...colors.array]}));
console.log('Terrain wear and persistence checks passed');
