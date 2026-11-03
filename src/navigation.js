// Bounded grid navigation with diagonal corner guards and a hard expansion budget.
export function createRouter(isBlocked,{cell=1.25,maxVisits=2600}={}){
  const key=(x,z)=>x+','+z;
  const point=(x,z)=>({x:x*cell,z:z*cell});
  const round=(v)=>Math.round(v/cell);
  const dirs=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  function route(from,to){
    const sx=round(from.x),sz=round(from.z),gx=round(to.x),gz=round(to.z);
    if(Math.hypot(gx-sx,gz-sz)>115)return null;
    const open=[{x:sx,z:sz,g:0,h:Math.hypot(gx-sx,gz-sz)}],visited=new Map();
    let best=open[0],visits=0;
    const clear=(x,z)=>!isBlocked(x*cell,z*cell);
    while(open.length&&visits++<maxVisits){
      let index=0;
      for(let i=1;i<open.length;i++)if(open[i].g+open[i].h<open[index].g+open[index].h)index=i;
      const current=open.splice(index,1)[0],k=key(current.x,current.z);
      if(visited.has(k)&&visited.get(k).g<=current.g)continue;
      visited.set(k,current);
      if(current.h<best.h)best=current;
      if(current.x===gx&&current.z===gz){best=current;break}
      for(const [dx,dz] of dirs){
        const nx=current.x+dx,nz=current.z+dz;
        if(Math.abs(nx-sx)>85||Math.abs(nz-sz)>85)continue;
        if(!clear(nx,nz))continue;
        if(dx&&dz&&(!clear(current.x+dx,current.z)||!clear(current.x,current.z+dz)))continue;
        const nk=key(nx,nz),ng=current.g+(dx&&dz?1.414:1);
        if(visited.has(nk)&&visited.get(nk).g<=ng)continue;
        open.push({x:nx,z:nz,g:ng,h:Math.hypot(gx-nx,gz-nz),parent:current});
      }
    }
    if(best.h>2.25)return null;
    let path=[],p=best;while(p&&path.length<150){path.push(point(p.x,p.z));p=p.parent}
    path.reverse();
    if(path.length>1)path.shift();
    path.push({x:to.x,z:to.z});
    return path;
  }
  return {route};
}
