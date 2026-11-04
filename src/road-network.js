// Explicit player-authored road works. No automatic routes, aging, traffic
// upgrades or rebuilding: only brush strokes create/destroy work orders.
// The same compact tile records are stored in the encrypted world save.
export function createRoadNetwork(state,{cell=3,maxTiles=5600}={}){
  const tiles=state.roads&&typeof state.roads==='object'&&!Array.isArray(state.roads)?state.roads:{};
  state.roads=tiles;
  const assignments=new Map();
  let blocked=()=>false,onChange=()=>{},revision=0;
  let built=0,pending=0;
  const key=(x,z)=>Math.floor(x/cell)+','+Math.floor(z/cell);
  const point=k=>{const [ix,iz]=k.split(',').map(Number);
    return {x:(ix+.5)*cell,z:(iz+.5)*cell}};
  const level=k=>Math.max(0,Math.min(2,Number(tiles[k]?.l??tiles[k])||0));
  const goal=k=>tiles[k]&&typeof tiles[k]==='object'?tiles[k].goal:null;
  function recount(){
    built=0;pending=0;
    for(const k of Object.keys(tiles)){
      if(level(k)>0)built++;
      if(goal(k))pending++;
    }
  }
  recount();
  function setProbes({blocked:isBlocked,invalidate}={}){
    if(isBlocked)blocked=isBlocked;
    if(invalidate)onChange=invalidate;
  }
  function releaseFor(k){
    for(const [id,task] of assignments)if(task.key===k)assignments.delete(id);
  }
  function paint(from,to,mode='build',surface='road'){
    if(!from||!to||!Number.isFinite(from.x+from.z+to.x+to.z))return 0;
    if(mode!=='build'&&mode!=='demolish')return 0;
    const distance=Math.hypot(from.x-to.x,from.z-to.z);
    // Bound strokes to avoid a malicious/mobile jump allocating a huge array.
    const steps=Math.min(4096,Math.max(1,Math.ceil(distance/(cell*.35))));
    const requested=surface==='path'?1:2;
    let changed=0,tileCount=Object.keys(tiles).length;
    for(let i=0;i<=steps;i++){
      const p={x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps};
      const k=key(p.x,p.z),at=point(k),old=tiles[k];
      if(mode==='build'&&!old&&tileCount>=maxTiles)break;
      if(mode==='build'&&blocked(at.x,at.z,.44))continue;
      const current=level(k),currentGoal=goal(k),target=mode==='build'?requested:0;
      if(mode==='demolish'&&current===0){
        // Erasing a blueprint doesn't require a road worker.
        if(old){delete tiles[k];tileCount--;releaseFor(k);changed++}
        continue;
      }
      if(current===target&&(!currentGoal||currentGoal==='build'&&target===Number(old?.target))){
        if(currentGoal){delete old.goal;delete old.target;old.p=0;releaseFor(k);changed++}
        continue;
      }
      if(current===target&&!currentGoal)continue;
      if(currentGoal===(mode==='build'?'build':'demolish')&&
         (mode!=='build'||Number(old?.target)===requested))continue;
      if(!old)tileCount++;
      tiles[k]={l:current,p:0,goal:mode==='build'?'build':'demolish',
        target:mode==='build'?requested:0};
      releaseFor(k);changed++;
    }
    if(changed){recount();revision++;}
    return changed;
  }
  function claim(workerId,position){
    const existing=assignments.get(workerId);
    if(existing&&goal(existing.key)===existing.mode)return existing;
    assignments.delete(workerId);
    const reserved=new Set([...assignments.values()].map(item=>item.key));
    let best=null,score=Infinity;
    for(const k of Object.keys(tiles)){
      const mode=goal(k);
      if(!mode||reserved.has(k))continue;
      const p=point(k),distance=Math.hypot(p.x-position.x,p.z-position.z);
      if(distance>450||distance>=score)continue;
      best={key:k,mode,x:p.x,z:p.z};
      score=distance;
    }
    if(best)assignments.set(workerId,best);
    return best;
  }
  function release(workerId){assignments.delete(workerId)}
  function work(workerId,task,dt){
    const held=assignments.get(workerId);
    if(!held||!task||held.key!==task.key||held.mode!==task.mode)return 'cancelled';
    const k=task.key,item=tiles[k],mode=goal(k);
    if(!item||mode!==task.mode){release(workerId);return 'cancelled'}
    const duration=mode==='demolish'?26:Number(item.target)===1?32:46;
    item.p=Math.min(duration,Math.max(0,Number(item.p)||0)+Math.max(0,Number(dt)||0));
    if(item.p<duration)return 'working';
    const finished=mode==='demolish'?0:Number(item.target)===1?1:2;
    if(finished===0)delete tiles[k];
    else tiles[k]={l:finished,p:0};
    release(workerId);recount();revision++;
    onChange(task.x,task.z);
    return 'done';
  }
  const levelAt=(x,z)=>level(key(x,z));
  const speedAt=(x,z)=>[1,1.2,1.5][levelAt(x,z)];
  // Keep legacy interface consumers compatible, with no implicit planning.
  const rebuild=()=>false;
  const recordUse=()=>{};
  const update=()=>{};
  const invalidatePlan=()=>{};
  function clear(){
    for(const k of Object.keys(tiles))delete tiles[k];
    assignments.clear();recount();revision++;
  }
  return {setProbes,paint,claim,release,work,levelAt,speedAt,rebuild,
    recordUse,update,invalidatePlan,clear,point,
    get built(){return built},
    get plannedCount(){return pending},
    get completed(){return built},
    get revision(){return revision},
    get data(){return tiles}};
}
