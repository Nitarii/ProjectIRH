// Bounded obstacle-aware A* for the ground plane.
// Paths validate the full corridor between waypoints, never just grid centers.
export function createRouter(isBlocked,{cell=1.2,maxVisits=1900}={}){
  const dirs=[[1,0,1],[0,1,1],[-1,0,1],[0,-1,1],
    [1,1,Math.SQRT2],[-1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,-1,Math.SQRT2]];
  class Heap{
    constructor(){this.items=[]}
    push(item){
      const a=this.items;let i=a.length;a.push(item);
      while(i>0){const p=(i-1)>>1;if(a[p].f<=item.f)break;a[i]=a[p];i=p}a[i]=item;
    }
    pop(){
      const a=this.items,out=a[0],last=a.pop();if(!a.length)return out;
      let i=0;
      while(true){
        const l=i*2+1,r=l+1;if(l>=a.length)break;
        const c=r<a.length&&a[r].f<a[l].f?r:l;
        if(a[c].f>=last.f)break;a[i]=a[c];i=c;
      }
      a[i]=last;return out;
    }
    get length(){return this.items.length}
  }
  const id=(x,z)=>x+','+z;
  function route(from,to,{allowNearby=false,arrivalRadius=.38}={}){
    if(!Number.isFinite(from.x+from.z+to.x+to.z))return null;
    const sx=Math.round(from.x/cell),sz=Math.round(from.z/cell);
    const gx=Math.round(to.x/cell),gz=Math.round(to.z/cell);
    if(Math.hypot(gx-sx,gz-sz)>118)return null;
    const probes=new Map(),cells=new Map(),costs=new Map(),heap=new Heap();
    const clear=(x,z)=>{
      const k=Math.round(x*4)+','+Math.round(z*4);
      if(!probes.has(k))probes.set(k,!isBlocked(x,z));
      return probes.get(k);
    };
    const corridor=(x0,z0,x1,z1)=>{
      const dist=Math.hypot(x1-x0,z1-z0);
      const n=Math.max(1,Math.ceil(dist/.30));
      for(let i=1;i<=n;i++){
        const t=i/n;if(!clear(x0+(x1-x0)*t,z0+(z1-z0)*t))return false;
      }
      return true;
    };
    if(clear(from.x,from.z)&&clear(to.x,to.z)&&corridor(from.x,from.z,to.x,to.z))
      return [{x:to.x,z:to.z}];
    const walkable=(x,z)=>{
      const k=id(x,z);
      if(!cells.has(k))cells.set(k,clear(x*cell,z*cell));
      return cells.get(k);
    };
    const h=(x,z)=>Math.hypot(to.x-x*cell,to.z-z*cell)/cell;
    // Any nearby walkable grid point can start a route, provided the actor
    // can actually reach it without cutting through an obstacle.
    let seeds=0;
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      const x=sx+dx,z=sz+dz,wx=x*cell,wz=z*cell;
      if(Math.hypot(wx-from.x,wz-from.z)>2.0||!walkable(x,z))continue;
      if(!corridor(from.x,from.z,wx,wz))continue;
      const g=Math.hypot(wx-from.x,wz-from.z)/cell;
      heap.push({x,z,g,f:g+h(x,z),parent:null});costs.set(id(x,z),g);seeds++;
    }
    if(!seeds)return null;
    let visited=0,best=null,bestDistance=Infinity,finish=null,exact=false;
    const tolerance=Math.max(.3,Math.min(1.05,arrivalRadius));
    while(heap.length&&visited++<maxVisits){
      const current=heap.pop(),k=id(current.x,current.z);
      if(current.g>(costs.get(k)??Infinity)+.00001)continue;
      const wx=current.x*cell,wz=current.z*cell;
      const remaining=Math.hypot(wx-to.x,wz-to.z);
      if(remaining<bestDistance){best=current;bestDistance=remaining}
      if(remaining<=cell*1.8&&clear(to.x,to.z)&&corridor(wx,wz,to.x,to.z)){
        finish=current;exact=true;break;
      }
      if(allowNearby&&remaining<=tolerance&&
          (!finish||remaining<Math.hypot(finish.x*cell-to.x,finish.z*cell-to.z))){
        finish=current;
        // A valid nearby endpoint is enough; no need to enter obstructed stockpiles.
        break;
      }
      for(const [dx,dz,cost] of dirs){
        const x=current.x+dx,z=current.z+dz;
        if(Math.abs(x-sx)>92||Math.abs(z-sz)>92||!walkable(x,z))continue;
        if(dx&&dz&&(!walkable(current.x+dx,current.z)||!walkable(current.x,current.z+dz)))continue;
        if(!corridor(wx,wz,x*cell,z*cell))continue;
        const g=current.g+cost,k2=id(x,z);
        if(g>=(costs.get(k2)??Infinity))continue;
        costs.set(k2,g);heap.push({x,z,g,f:g+h(x,z),parent:current});
      }
    }
    if(!finish){
      // Do not return a partial path into a wall; the caller must retry
      // an alternative goal or suspend the unreachable resource.
      if(!allowNearby||bestDistance>tolerance||!best)return null;
      finish=best;
    }
    const path=[];let p=finish;
    while(p&&path.length<180){path.push({x:p.x*cell,z:p.z*cell});p=p.parent}
    path.reverse();
    if(exact)path.push({x:to.x,z:to.z});
    if(path.length>1&&Math.hypot(path[0].x-from.x,path[0].z-from.z)<.18)path.shift();
    if(!path.length)path.push({x:finish.x*cell,z:finish.z*cell});
    // Avoid unnecessary zig-zags in open passages without compromising clearance.
    const smooth=[];
    let anchor={x:from.x,z:from.z},i=0;
    while(i<path.length){
      let j=Math.min(path.length-1,i+7);
      while(j>i&&!corridor(anchor.x,anchor.z,path[j].x,path[j].z))j--;
      smooth.push(path[j]);anchor=path[j];i=j+1;
    }
    return smooth;
  }
  return {route};
}
