// All manual transactions happen at the same physical piles used by employees.
export function nearestStock(buildings,position,getPoints,maxDistance=2.65){
  let best=null,distance=maxDistance;
  for(const building of buildings){
    if(building.kind!=='worker'&&building.kind!=='factory')continue;
    const points=getPoints(building);
    if(!points)continue;
    for(const kind of (building.kind==='factory'?['raw','processed']:['raw'])){
      const point=points[kind];
      if(!point)continue;
      const d=Math.hypot(point.x-position.x,point.z-position.z);
      if(d<distance){distance=d;best={building,kind,point,distance:d}}
    }
  }
  return best;
}
export function transferStock(state,building,kind,action,limit=100){
  if(!building||!['worker','factory'].includes(building.kind))return 0;
  if(!['raw','processed'].includes(kind)||!['deposit','withdraw'].includes(action))return 0;
  if(kind==='processed'&&building.kind!=='factory')return 0;
  const index=building.type|0;
  if(index<0||index>4)return 0;
  const storedField=building.kind==='worker'?'stockRaw':kind==='processed'?'stockProcessed':'inputRaw';
  const inventory=kind==='processed'?state.products:state.inv;
  const present=Math.max(0,Number(building[storedField])||0);
  const carried=Math.max(0,Number(inventory[index])||0);
  const total=state.inv.reduce((a,b)=>a+b,0)+state.products.reduce((a,b)=>a+b,0);
  const maximum=Math.max(0,Number(state.bag)||0);
  if(action==='deposit'){
    const n=Math.min(carried,Math.max(0,limit-present));
    if(n<1)return 0;
    inventory[index]-=n;building[storedField]=present+n;
    building.stock=building.kind==='worker'?building.stockRaw:building.stockProcessed||0;
    return n;
  }
  const n=Math.min(present,Math.max(0,maximum-total));
  if(n<1)return 0;
  inventory[index]+=n;building[storedField]=present-n;
  building.stock=building.kind==='worker'?building.stockRaw:building.stockProcessed||0;
  return n;
}
