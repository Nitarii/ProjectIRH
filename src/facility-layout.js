// Building geometry uses quarter-turn rotation, shared by visual models,
// resource stockpile access, collisions, workstation navigation and placement.
export function normalizeRotation(value){
 const quarter=Math.PI/2;
 return ((Math.round((Number(value)||0)/quarter)%4)+4)%4*quarter;
}
export function rotateOffset(x,z,angle=0){
 const a=normalizeRotation(angle),c=Math.cos(a),s=Math.sin(a);
 return {x:x*c+z*s,z:-x*s+z*c};
}
export function worldPoint(building,x,z){
 const p=rotateOffset(x,z,building.rotation);
 return {x:building.x+p.x,z:building.z+p.z};
}
export function pointInOrientedRect(x,z,rect,radius=0){
 const local=rotateOffset(x-rect.x,z-rect.z,-rect.angle);
 return Math.abs(local.x)<rect.w/2+radius&&Math.abs(local.z)<rect.d/2+radius;
}
export function facilityFootprint(building){
 const factory=building.kind==='factory';
 const local=factory?{x:0,z:6.45,w:19.2,d:14}:{x:0,z:1.5,w:7.0,d:8.4};
 const center=worldPoint(building,local.x,local.z);
 return {...center,w:local.w,d:local.d,angle:normalizeRotation(building.rotation)};
}
export function footprintsOverlap(a,b,gap=0){
 const axes=[];
 for(const r of [a,b]){
  const c=Math.cos(r.angle),s=Math.sin(r.angle);
  axes.push({x:c,z:-s},{x:s,z:c});
 }
 for(const axis of axes){
  const p=(r)=>Math.abs(r.w/2*(axis.x*Math.cos(r.angle)-axis.z*Math.sin(r.angle)))+
    Math.abs(r.d/2*(axis.x*Math.sin(r.angle)+axis.z*Math.cos(r.angle)));
  const projection=Math.abs((a.x-b.x)*axis.x+(a.z-b.z)*axis.z);
  if(projection>p(a)+p(b)+gap)return false;
 }
 return true;
}
