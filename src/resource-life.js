// Persistent resource lifetimes are tracked by world coordinates, not by a
// transient Three.js mesh or a timeout attached to an unloaded chunk.
export const RESPAWN_MINUTES=[8,9,10,7,6];
export function resourceId(node){
  return node.type+':'+node.x.toFixed(2)+':'+node.z.toFixed(2);
}
export function createResourceLifecycle(state,{now=()=>Date.now()}={}){
  const exhausted=state.exhausted&&typeof state.exhausted==='object'&&!Array.isArray(state.exhausted)
    ?state.exhausted:(state.exhausted={});
  function spawn(node){
    node.hp=Math.max(0,Math.min(node.max,node.hp??node.max));
    const until=Number(exhausted[resourceId(node)])||0;
    if(until>0){
      node.dead=true;node.hp=0;node.respawnAt=until;
      node.mesh.visible=false;
    }
    return node;
  }
  function hit(node){
    node.lastHitAt=now();
    node.nextRegenAt=node.lastHitAt+42000;
  }
  function deplete(node){
    if(node.dead&&node.respawnAt)return node.respawnAt;
    node.dead=true;node.hp=0;node.lastHitAt=now();
    // A deterministic variation prevents thousands of nodes respawning in one frame.
    const jitter=Math.abs(Math.floor(node.x*7+node.z*11+node.type*13))%105;
    const until=node.lastHitAt+(RESPAWN_MINUTES[node.type]*60+jitter)*1000;
    node.respawnAt=until;
    exhausted[resourceId(node)]=until;
    node.mesh.visible=false;
    return until;
  }
  function update(nodes,canRespawn,onRespawn){
    const stamp=now();let revived=0,healed=0;
    for(const node of nodes){
      if(node.dead){
        if(!node.respawnAt||stamp<node.respawnAt)continue;
        if(!canRespawn(node))continue;
        node.dead=false;node.hp=node.max;node.respawnAt=0;node.nextRegenAt=0;
        delete exhausted[resourceId(node)];onRespawn?.(node);
        revived++;
      }else if(node.hp<node.max&&stamp>=(node.nextRegenAt||Infinity)){
        const gained=Math.min(node.max-node.hp,Math.max(1,Math.floor((stamp-node.nextRegenAt)/6500)+1));
        node.hp+=gained;node.nextRegenAt=stamp+6500;
        healed+=gained;
      }
    }
    return {revived,healed};
  }
  return {spawn,hit,deplete,update,exhausted};
}
