// Factory stations occupy a covered yard outside the solid workshop footprint.
// Each type provides five distinct jobs with separate work positions and apparatus.
export const FACTORY_TASKS=[
 [
  {name:'sort logs',point:[-5.0,6.4],tool:'rack',motion:'inspect',duration:2.8},
  {name:'circular saw',point:[-2.55,7.65],tool:'saw',motion:'feed',duration:3.4},
  {name:'plane boards',point:[0,8.1],tool:'planer',motion:'plane',duration:3.2},
  {name:'move timber',point:[2.55,7.65],tool:'trolley',motion:'lift',duration:2.7},
  {name:'stack planks',point:[5.0,6.4],tool:'pallet',motion:'stack',duration:3.0}
 ],[
  {name:'sort stone',point:[-5.0,6.4],tool:'rack',motion:'inspect',duration:2.8},
  {name:'cut blocks',point:[-2.55,7.65],tool:'saw',motion:'cut',duration:3.5},
  {name:'chisel edges',point:[0,8.1],tool:'anvil',motion:'hammer',duration:3.1},
  {name:'smooth slabs',point:[2.55,7.65],tool:'polisher',motion:'polish',duration:3.5},
  {name:'stack stone',point:[5.0,6.4],tool:'pallet',motion:'stack',duration:3.0}
 ],[
  {name:'sort ore',point:[-5.0,6.4],tool:'rack',motion:'inspect',duration:2.8},
  {name:'load furnace',point:[-2.55,7.65],tool:'furnace',motion:'shovel',duration:3.5},
  {name:'work bellows',point:[0,8.1],tool:'bellows',motion:'pump',duration:3.2},
  {name:'pour casting',point:[2.55,7.65],tool:'mold',motion:'pour',duration:3.6},
  {name:'stack ingots',point:[5.0,6.4],tool:'pallet',motion:'stack',duration:3.0}
 ],[
  {name:'sift sand',point:[-5.0,6.4],tool:'sieve',motion:'sift',duration:3.1},
  {name:'feed kiln',point:[-2.55,7.65],tool:'furnace',motion:'shovel',duration:3.4},
  {name:'shape glass',point:[0,8.1],tool:'bench',motion:'rotate',duration:3.7},
  {name:'anneal glass',point:[2.55,7.65],tool:'kiln',motion:'inspect',duration:3.3},
  {name:'pack glass',point:[5.0,6.4],tool:'pallet',motion:'pack',duration:3.2}
 ],[
  {name:'sort grain',point:[-5.0,6.4],tool:'sacks',motion:'inspect',duration:2.8},
  {name:'hopper grain',point:[-2.55,7.65],tool:'hopper',motion:'pour',duration:3.1},
  {name:'turn millstone',point:[0,8.1],tool:'mill',motion:'crank',duration:3.6},
  {name:'sift flour',point:[2.55,7.65],tool:'sieve',motion:'sift',duration:3.1},
  {name:'fill sacks',point:[5.0,6.4],tool:'pallet',motion:'pack',duration:3.0}
 ]
];
export const YARD={
  raw:{x:-5.0,z:3.4},
  output:{x:5.0,z:3.4},
  gate:{x:0,z:3.55},
  clearance:0.52
};
export function yardPoint(building,spot){
  const p=Array.isArray(spot)?{x:spot[0],z:spot[1]}:spot;
  return {x:building.x+p.x,z:building.z+p.z};
}
export function workstation(type,slot){
  return FACTORY_TASKS[Math.max(0,Math.min(4,type|0))][slot%5];
}
export function storagePoint(building,processed=false){
  // Shared physical pickup/drop-off, used for both stock meshes and worker navigation.
  if(building.kind==='factory')return yardPoint(building,processed?YARD.output:YARD.raw);
  return {x:building.x+(processed?2.75:-2.75),z:building.z+3.15};
}
