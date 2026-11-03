// Logistics contract: haulers move goods BETWEEN facilities.
// Sales staff only sell merchandise that has actually reached their own warehouse.
export const WAREHOUSE_CAPACITY=120;
const bounded=n=>Math.max(0,Math.min(WAREHOUSE_CAPACITY,Math.floor(Number(n)||0)));
const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function prepareWarehouse(building){
  if(building.kind!=='seller')return building;
  for(const key of ['warehouseRaw','warehouseProcessed']){
    const previous=Array.isArray(building[key])?building[key]:[];
    building[key]=Array.from({length:5},(_,i)=>bounded(previous[i]));
  }
  // Protect legacy/edited saves against overfull inventories.
  let room=WAREHOUSE_CAPACITY;
  for(const key of ['warehouseProcessed','warehouseRaw'])
    for(let i=0;i<5;i++){
      building[key][i]=Math.min(room,building[key][i]);
      room-=building[key][i];
    }
  return building;
}
export function warehouseRoom(b){
  if(b.kind!=='seller')return 0;
  if(!b.warehouseRaw||!b.warehouseProcessed)prepareWarehouse(b);
  return Math.max(0,WAREHOUSE_CAPACITY-
    b.warehouseRaw.reduce((a,n)=>a+n,0)-b.warehouseProcessed.reduce((a,n)=>a+n,0));
}
export function chooseWarehouseSale(b){
  if(!b||b.kind!=='seller')return null;
  prepareWarehouse(b);
  for(const processed of [true,false]){
    const array=processed?b.warehouseProcessed:b.warehouseRaw;
    let type=-1,amount=0;
    for(let i=0;i<5;i++)if(array[i]>amount){type=i;amount=array[i]}
    if(type>=0)return {type,processed,amount};
  }
  return null;
}
export function pickupWarehouse(b,type,processed,maxLoad){
  if(!b||b.kind!=='seller'||type<0||type>4)return 0;
  const items=processed?b.warehouseProcessed:b.warehouseRaw;
  if(!items)return 0;
  const amount=Math.min(bounded(maxLoad),items[type]||0);
  items[type]-=amount;
  return amount;
}
export function transportSpace(destination,type,processed,capacity=100){
  if(!destination||type<0||type>4)return 0;
  if(destination.kind==='factory')
    return !processed&&destination.type===type?Math.max(0,capacity-(destination.inputRaw||0)):0;
  if(destination.kind==='seller')return warehouseRoom(destination);
  return 0;
}
export function deliverTransport(destination,type,processed,amount,capacity=100){
  const n=Math.min(bounded(amount),transportSpace(destination,type,processed,capacity));
  if(n<=0)return 0;
  if(destination.kind==='factory')destination.inputRaw+=n;
  else (processed?destination.warehouseProcessed:destination.warehouseRaw)[type]+=n;
  return n;
}
export function selectTransportJob(home,buildings,capacity=100){
  let best=null,bestScore=Infinity;
  const sellers=buildings.filter(b=>b.kind==='seller'&&warehouseRoom(b)>0);
  const factories=buildings.filter(b=>b.kind==='factory');
  for(const origin of buildings){
    if(origin.kind!=='worker'&&origin.kind!=='factory')continue;
    const processed=origin.kind==='factory';
    const amount=processed?origin.stockProcessed:origin.stockRaw;
    if(amount<1||d(home,origin)>215)continue;
    const destinations=processed?sellers:[...factories,...sellers];
    for(const dest of destinations){
      if(dest===origin||d(origin,dest)>240)continue;
      if(transportSpace(dest,origin.type,processed,capacity)<=0)continue;
      const separation=d(origin,dest);
      // Prefer completing the production chain; clear full raw stock as a fallback.
      const premium=processed?-32:dest.kind==='factory'?-21:(amount>=capacity*.8?-10:28);
      const score=d(home,origin)+separation*.75+premium;
      if(score<bestScore){
        bestScore=score;
        best={origin,dest,processed,type:origin.type};
      }
    }
  }
  return best;
}
