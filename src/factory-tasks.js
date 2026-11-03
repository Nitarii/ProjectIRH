import {worldPoint} from './facility-layout.js';
// Factory stations occupy a covered yard outside the solid workshop footprint.
// Each type provides five distinct jobs with separate work positions and apparatus.
export const FACTORY_TASKS=[
 [
  {name:'sort logs',point:[-6.4,9.0],tool:'rack',motion:'inspect',duration:2.8},
  {name:'circular saw',point:[-3.2,9.12],tool:'saw',motion:'feed',duration:3.4},
  {name:'plane boards',point:[0,9.24],tool:'planer',motion:'plane',duration:3.2},
  {name:'move timber',point:[3.2,9.12],tool:'trolley',motion:'lift',duration:2.7},
  {name:'stack planks',point:[6.4,9.0],tool:'pallet',motion:'stack',duration:3.0}
 ],[
  {name:'sort stone',point:[-6.4,9.0],tool:'rack',motion:'inspect',duration:2.8},
  {name:'cut blocks',point:[-3.2,9.12],tool:'saw',motion:'cut',duration:3.5},
  {name:'chisel edges',point:[0,9.24],tool:'anvil',motion:'hammer',duration:3.1},
  {name:'smooth slabs',point:[3.2,9.12],tool:'polisher',motion:'polish',duration:3.5},
  {name:'stack stone',point:[6.4,9.0],tool:'pallet',motion:'stack',duration:3.0}
 ],[
  {name:'sort ore',point:[-6.4,9.0],tool:'rack',motion:'inspect',duration:2.8},
  {name:'load furnace',point:[-3.2,9.12],tool:'furnace',motion:'shovel',duration:3.5},
  {name:'work bellows',point:[0,9.24],tool:'bellows',motion:'pump',duration:3.2},
  {name:'pour casting',point:[3.2,9.12],tool:'mold',motion:'pour',duration:3.6},
  {name:'stack ingots',point:[6.4,9.0],tool:'pallet',motion:'stack',duration:3.0}
 ],[
  {name:'sift sand',point:[-6.4,9.0],tool:'sieve',motion:'sift',duration:3.1},
  {name:'feed kiln',point:[-3.2,9.12],tool:'furnace',motion:'shovel',duration:3.4},
  {name:'shape glass',point:[0,9.24],tool:'bench',motion:'rotate',duration:3.7},
  {name:'anneal glass',point:[3.2,9.12],tool:'kiln',motion:'inspect',duration:3.3},
  {name:'pack glass',point:[6.4,9.0],tool:'pallet',motion:'pack',duration:3.2}
 ],[
  {name:'sort grain',point:[-6.4,9.0],tool:'sacks',motion:'inspect',duration:2.8},
  {name:'hopper grain',point:[-3.2,9.12],tool:'hopper',motion:'pour',duration:3.1},
  {name:'turn millstone',point:[0,9.24],tool:'mill',motion:'crank',duration:3.6},
  {name:'sift flour',point:[3.2,9.12],tool:'sieve',motion:'sift',duration:3.1},
  {name:'fill sacks',point:[6.4,9.0],tool:'pallet',motion:'pack',duration:3.0}
 ]
];
export const YARD={
  raw:{x:-7.25,z:4.45},
  output:{x:7.25,z:4.45},
  gate:{x:0,z:4.6},
  clearance:0.52
};
export function yardPoint(building,spot){
  const p=Array.isArray(spot)?{x:spot[0],z:spot[1]}:spot;
  return worldPoint(building,p.x,p.z);
}
export function workstation(type,slot){
  return FACTORY_TASKS[Math.max(0,Math.min(4,type|0))][slot%5];
}
export function storagePoint(building,processed=false){
  // Shared physical pickup/drop-off, used for both stock meshes and worker navigation.
  if(building.kind==='factory')return yardPoint(building,processed?YARD.output:YARD.raw);
  return worldPoint(building,processed?2.75:-2.75,3.15);
}

// Operator-safe factory walkways, reserved inside the existing yard footprint.
// Equipment occupies z≈7.5–8.6. Crossing directly between storage and
// operators would cut through furnaces, saws, hoppers and processing benches.
export const FACTORY_AISLE={leftX:-8.42,rightX:8.42,entryZ:5.75,frontZ:10.88};
export function factoryWorkPath(building,slot){
  const task=workstation(building.type,slot);
  return [
    worldPoint(building,FACTORY_AISLE.leftX,FACTORY_AISLE.entryZ),
    worldPoint(building,FACTORY_AISLE.leftX,FACTORY_AISLE.frontZ),
    worldPoint(building,task.point[0],FACTORY_AISLE.frontZ),
    yardPoint(building,task.point)
  ];
}
export function factoryOutputPath(building,slot){
  const task=workstation(building.type,slot);
  return [
    worldPoint(building,task.point[0],FACTORY_AISLE.frontZ),
    worldPoint(building,FACTORY_AISLE.rightX,FACTORY_AISLE.frontZ),
    worldPoint(building,FACTORY_AISLE.rightX,FACTORY_AISLE.entryZ),
    storagePoint(building,true)
  ];
}
