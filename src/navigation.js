// Bounded eight-way A* navigation. The open set is a min-heap rather than
// an O(n) scan; static collision probes are memoized for one route request.
export function createRouter(isBlocked,{cell=1.2,maxVisits=1700}={}){
  const dirs=[[1,0,1],[0,1,1],[-1,0,1],[0,-1,1],
    [1,1,Math.SQRT2],[-1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,-1,Math.SQRT2]];
  const id=(x,z)=>x+','+z;
  class Heap{
    constructor(){this.items=[]}
    push(item){
      const a=this.items;let i=a.length;a.push(item);
      while(i>0){const p=(i-1)>>1;if(a[p].f<=item.f)break;a[i]=a[p];i=p}a[i]=item;
    }
    pop(){
      const a=this.items,out=a[0],last=a.pop();
      if(!a.length)return out;
      let i=0;
      while(true){
        const l=i*2+1,r=l+1;if(l>=a.length)break;
        const c=r<a.length&&a[r].f<a[l].f?r:l;
        if(a[c].f>=last.f)break;
        a[i]=a[c];i=c;
      }
      a[i]=last;return out;
    }
    get length(){return this.items.length}
  }
  function route(from,to){
    const sx=Math.round(from.x/cell),sz=Math.round(from.z/cell),
      gx=Math.round(to.x/cell),gz=Math.round(to.z/cell);
    if(Math.hypot(gx-sx,gz-sz)>118)return null;
    const heap=new Heap(),blockedCache=new Map(),costs=new Map();
    const walkable=(x,z)=>{
      const k=id(x,z);
      if(!blockedCache.has(k))blockedCache.set(k,!isBlocked(x*cell,z*cell));
      return blockedCache.get(k);
    };
    const h=(x,z)=>Math.hypot(x-gx,z-gz);
    const first={x:sx,z:sz,g:0,f:h(sx,sz),parent:null};
    heap.push(first);costs.set(id(sx,sz),0);
    let best=first,visits=0;
    while(heap.length&&visits++<maxVisits){
      const current=heap.pop();
      if(current.g>costs.get(id(current.x,current.z))+.0001)continue;
      if(h(current.x,current.z)<h(best.x,best.z))best=current;
      if(current.x===gx&&current.z===gz){best=current;break}
      for(const [dx,dz,cost] of dirs){
        const x=current.x+dx,z=current.z+dz;
        if(Math.abs(x-sx)>90||Math.abs(z-sz)>90||!walkable(x,z))continue;
        if(dx&&dz&&(!walkable(current.x+dx,current.z)||!walkable(current.x,current.z+dz)))continue;
        const g=current.g+cost,k=id(x,z);
        if(g>=(costs.get(k)??Infinity))continue;
        costs.set(k,g);
        heap.push({x,z,g,f:g+h(x,z),parent:current});
      }
    }
    if(h(best.x,best.z)>1.8)return null;
    const path=[];let p=best;
    while(p&&path.length<160){path.push({x:p.x*cell,z:p.z*cell});p=p.parent}
    path.reverse();
    if(path.length>1)path.shift();
    path.push({x:to.x,z:to.z});
    return path;
  }
  return {route};
}
