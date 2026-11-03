// Resource nodes are single-use. Exhaustion is stored by deterministic
// position, independent of streamed chunks and browser restarts.
// Legacy positive respawn timestamps migrate into permanent exhaustion.
export function resourceId(node){
  return node.type+':'+node.x.toFixed(2)+':'+node.z.toFixed(2);
}
export function createResourceLifecycle(state,{now=()=>Date.now()}={}){
  const exhausted=state.exhausted&&typeof state.exhausted==='object'&&!Array.isArray(state.exhausted)
    ?state.exhausted:(state.exhausted={});
  function spawn(node){
    node.hp=Math.max(0,Math.min(node.max,node.hp??node.max));
    if(Object.hasOwn(exhausted,resourceId(node))&&exhausted[resourceId(node)]){
      node.dead=true;node.hp=0;node.respawnAt=Infinity;
      if(node.mesh)node.mesh.visible=false;
    }
    return node;
  }
  function hit(node){
    if(node.dead)return;
    node.lastHitAt=now();
    node.nextRegenAt=node.lastHitAt+42000;
  }
  function deplete(node){
    if(node.dead&&exhausted[resourceId(node)])return true;
    node.dead=true;node.hp=0;node.lastHitAt=now();
    node.respawnAt=Infinity;
    exhausted[resourceId(node)]=true;
    if(node.mesh)node.mesh.visible=false;
    return true;
  }
  function update(nodes){
    const stamp=now();let healed=0;
    for(const node of nodes){
      // Healthy but damaged resources may regain HP. Exhausted nodes do not.
      if(node.dead)continue;
      if(node.hp<node.max&&stamp>=(node.nextRegenAt||Infinity)){
        const gained=Math.min(node.max-node.hp,
          Math.max(1,Math.floor((stamp-node.nextRegenAt)/6500)+1));
        node.hp+=gained;node.nextRegenAt=stamp+6500;healed+=gained;
      }
    }
    return {revived:0,healed};
  }
  return {spawn,hit,deplete,update,exhausted};
}
