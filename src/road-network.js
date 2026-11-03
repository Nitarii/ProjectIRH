// Data-only road construction. Tiles are rendered by the existing terrain vertex colors.
// Re-planning is triggered by a building signature, never by the render loop.
import {createRouter} from './navigation.js?v=20261106d';
import {worldPoint} from './facility-layout.js';
export function createRoadNetwork(state,{cell=3,maxTiles=5600}={}){
  const tiles=state.roads&&typeof state.roads==='object'&&!Array.isArray(state.roads)?state.roads:{};
  state.roads=tiles;
  let blocked=()=>false,traffic=()=>0,onChange=()=>{},signature='';
  let planned=new Set(),claims=new Map(),completion=0,revision=0;
  let upgradeKeys=[],upgradeCursor=0,clock=Number(state.gameMinutes)||0,lastAgeScan=-Infinity;
  const key=(x,z)=>Math.floor(x/cell)+','+Math.floor(z/cell);
  const point=k=>{const [ix,iz]=k.split(',').map(Number);return{x:(ix+.5)*cell,z:(iz+.5)*cell}};
  const stage=k=>Math.max(0,Math.min(2,Number(tiles[k]?.l??tiles[k])||0));
  const retired=k=>!!tiles[k]?.retired;
  const available=()=>planned.size-[...planned].filter(retired).length;
  let built=Object.keys(tiles).filter(k=>stage(k)>0).length;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const passable=(p)=>!blocked(p.x,p.z,.62);
  function setProbes({blocked:isBlocked,traffic:getTraffic,invalidate}={}){
    if(isBlocked)blocked=isBlocked;
    if(getTraffic)traffic=getTraffic;
    if(invalidate)onChange=invalidate;
  }
  function clearClaimsFor(k){for(const [id,target] of claims)if(target.key===k)claims.delete(id)}
  function addLine(a,b){
    const length=distance(a,b),steps=Math.max(1,Math.ceil(length/(cell*.52)));
    for(let i=0;i<=steps&&planned.size<maxTiles;i++){
      const t=i/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      const k=key(x,z);
      if(planned.has(k))continue;
      const p=point(k);
      if(passable(p))planned.add(k);
    }
  }
  function addConnection(from,to){
    const length=distance(from,to);
    if(length>900||length<.01)return;
    const waypoints=[from];
    const parts=Math.ceil(length/55);
    let current=from;
    const router=createRouter((x,z)=>blocked(x,z,.62),{cell:1.9,maxVisits:920});
    for(let j=1;j<=parts;j++){
      const t=j/parts,dest={
        x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t
      };
      let route=router.route(current,dest,{allowNearby:true,arrivalRadius:.75});
      if(!route){
        // Probe offset bypasses at planning time, not during movement.
        const nx=-(to.z-from.z)/length,nz=(to.x-from.x)/length;
        for(const offset of [6,-6,13,-13,21,-21]){
          const mid={x:(current.x+dest.x)/2+nx*offset,z:(current.z+dest.z)/2+nz*offset};
          if(!passable(mid))continue;
          const first=router.route(current,mid,{allowNearby:true,arrivalRadius:.7});
          const second=first&&router.route(mid,dest,{allowNearby:true,arrivalRadius:.7});
          if(first&&second){route=[...first,...second];break}
        }
      }
      if(!route)break;
      for(const p of route){addLine(current,p);current=p}
    }
  }
  function rebuild(buildings,sale){
    const relevant=buildings.filter(b=>Number.isFinite(b.x+b.z));
    const next=relevant.map(b=>[b.id,b.kind,b.x.toFixed(1),b.z.toFixed(1),b.rotation||0].join(':')).join('|')+
      ':sale:'+sale.x.toFixed(1)+','+sale.z.toFixed(1);
    if(next===signature)return false;
    signature=next;revision++;
    const anchors=[{x:sale.x,z:sale.z}];
    for(const b of relevant){
      // Accessible front approach, outside the structure and factory yard.
      anchors.push(worldPoint(b,0,b.kind==='factory'?14.1:5.8));
    }
    const old=planned;planned=new Set();
    // Incremental nearest-connected network limits unnecessary cross-country links.
    const connected=[anchors[0]];
    const remaining=anchors.slice(1);
    while(remaining.length&&planned.size<maxTiles){
      let chosen=-1,neighbor=null,best=Infinity;
      for(let i=0;i<remaining.length;i++)for(const anchor of connected){
        const d=distance(remaining[i],anchor);
        if(d<best){best=d;chosen=i;neighbor=anchor}
      }
      if(chosen<0)break;
      const target=remaining.splice(chosen,1)[0];
      if(best<=900)addConnection(neighbor,target);
      connected.push(target);
    }
    upgradeKeys=[...planned];upgradeCursor=0;
    // A changed building network may require a new route in a previously
    // abandoned corridor. Only newly-added planned cells can be rebuilt.
    for(const k of planned)if(!old.has(k)&&retired(k)&&stage(k)===0)
      delete tiles[k];
    for(const k of Object.keys(tiles))if(!planned.has(k)&&stage(k)===0)delete tiles[k];
    completion=0;
    for(const k of planned)if(stage(k)>0)completion++;
    for(const k of old)if(!planned.has(k))clearClaimsFor(k);
    return true;
  }
  function recordUse(id,x,z,at=clock){
    if(!Number.isFinite(x+z))return;
    const k=key(x,z),tile=tiles[k];
    if(!tile||stage(k)===0)return;
    const now=Number.isFinite(at)?at:clock;
    // Real movement only. At most one saved timestamp per tile per 2 seconds.
    if(!Number.isFinite(tile.usedAt)||now-tile.usedAt>=2){
      if(typeof tile==='object')tile.usedAt=now;
      else tiles[k]={l:stage(k),p:0,usedAt:now};
    }
    // A route used again before dismantling is no longer considered abandoned.
    if(retired(k)&&planned.has(k)){
      tiles[k].retired=false;tiles[k].p=0;revision++;
      clearClaimsFor(k);
    }
  }
  function update(now=clock){
    if(!Number.isFinite(now))return;
    clock=Math.max(clock,now);
    if(clock-lastAgeScan<2)return;
    lastAgeScan=clock;
    for(const k of Object.keys(tiles)){
      if(stage(k)===0||retired(k))continue;
      const original=tiles[k],tile=typeof original==='object'?original:
        (tiles[k]={l:stage(k),p:0,usedAt:clock});
      if(!Number.isFinite(tile.usedAt))tile.usedAt=clock; // legacy saves
      if(clock-tile.usedAt>=300){
        tile.retired=true;tile.p=0;
        // The maintenance crew dismantles the aging surface progressively.
        clearClaimsFor(k);revision++;
      }
    }
  }
  function levelAt(x,z){return stage(key(x,z))}
  function speedAt(x,z){const level=levelAt(x,z);return level===2?1.5:level===1?1.2:1}
  function claim(workerId,position){
    if(claims.has(workerId))return claims.get(workerId);
    const reserved=new Set([...claims.values()].map(t=>t.key));
    let best=null,score=Infinity;
    const consider=(k,mode)=>{
      if(reserved.has(k))return;
      const p=point(k);
      const d=distance(p,position);
      if(d>160)return;
      const priority=mode==='demolish'?.65:mode==='build'?1:1.6;
      const cost=d*priority;
      if(cost<score){score=cost;best={key:k,mode,x:p.x,z:p.z}}
    };
    // Keep the old network usable until replacement paths are laid,
    // then dismantle obsolete segments. New routes take precedence.
    for(const k of planned)if(stage(k)===0&&!retired(k))consider(k,'build');
    if(!best)for(const k of Object.keys(tiles))
      if((!planned.has(k)||retired(k))&&stage(k)>0)consider(k,'demolish');
    if(!best&&completion>=available()&&upgradeKeys.length){
      // Inspect a small moving window, never thousands of traffic cells per worker.
      const checked=Math.min(180,upgradeKeys.length);
      for(let i=0;i<checked;i++){
        const k=upgradeKeys[(upgradeCursor+i)%upgradeKeys.length];
        if(stage(k)!==1||retired(k))continue;
        const p=point(k);
        if(traffic(p.x,p.z)>=12)consider(k,'upgrade');
      }
      upgradeCursor=(upgradeCursor+checked)%upgradeKeys.length;
    }
    if(best)claims.set(workerId,best);
    return best;
  }
  function release(workerId){claims.delete(workerId)}
  function work(workerId,task,dt){
    const active=claims.get(workerId);
    if(!active||!task||active.key!==task.key)return 'cancelled';
    const k=task.key,l=stage(k);
    if(task.mode==='build'&&(!planned.has(k)||l!==0||retired(k)))return 'cancelled';
    if(task.mode==='upgrade'&&(!planned.has(k)||l!==1||retired(k)||completion<available()))return 'cancelled';
    if(task.mode==='demolish'&&((planned.has(k)&&!retired(k))||l===0))return 'cancelled';
    const duration=task.mode==='build'?3.4:task.mode==='upgrade'?5.5:2.8;
    const previous=typeof tiles[k]==='object'?tiles[k]:{l:l,p:0};
    const progress=Math.max(0,Math.min(duration,previous.p||0))+Math.max(0,dt);
    if(progress<duration){tiles[k]={...previous,l,p:Number(progress.toFixed(2))};return 'working'}
    if(task.mode==='demolish'){
      if(l===2){
        // Road → dirt path → cleared ground, both stages done by employees.
        tiles[k]={l:1,p:0,retired:true,usedAt:previous.usedAt??clock};
      }else{
        if(planned.has(k)){
          // Persist a no-rebuild tombstone after an unused planned route.
          tiles[k]={l:0,p:0,retired:true,usedAt:previous.usedAt??clock};
          completion=Math.max(0,completion-1);
        }else delete tiles[k];
        built=Math.max(0,built-1);
      }
    }else{
      const next=task.mode==='build'?1:2;
      tiles[k]={l:next,p:0,usedAt:previous.usedAt??clock};
      if(task.mode==='build'){tiles[k].usedAt=clock;built++;completion++}
    }
    revision++;
    onChange(task.x,task.z);release(workerId);
    return 'done';
  }
  function invalidatePlan(){signature=''}
  function clear(){
    for(const k of Object.keys(tiles))delete tiles[k];
    claims.clear();planned.clear();upgradeKeys=[];upgradeCursor=0;signature='';built=0;completion=0;revision++;lastAgeScan=-Infinity;
  }
  return {setProbes,rebuild,levelAt,speedAt,recordUse,update,claim,release,work,invalidatePlan,clear,
    get built(){return built},get plannedCount(){return planned.size},get completed(){return completion},
    get revision(){return revision},get data(){return tiles}};
}
