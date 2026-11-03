import {createRouter} from './navigation.js?v=20261106d';

// Autonomous harvest/sell mode uses the same physical obstacles as the player.
// The navigator performs a bounded plan per objective, never once per frame.
// The player's best available tool determines node priority. Within the
// same tier, choose nearer resources; still fall back to reachable weaker tiers.
// -1 means this resource has no purchased tool (hand harvesting only).
export function rankHarvestNodes(nodes,position,toolTier=()=>-1,maxDistance=150,isIgnored=()=>false){
  const ranked=[];
  for(const node of nodes){
    if(!node||node.dead||node.log||isIgnored(node))continue;
    const distance=Math.hypot(position.x-node.x,position.z-node.z);
    if(!Number.isFinite(distance)||distance>=maxDistance)continue;
    const current=Number(toolTier(node.type));
    const tier=Number.isFinite(current)?Math.max(-1,Math.min(4,Math.floor(current))):-1;
    ranked.push({node,tier,distance});
  }
  ranked.sort((a,b)=>b.tier-a.tier||a.distance-b.distance);
  return ranked.map(entry=>entry.node);
}
export function createAutoPilot({
  player,blocked,move,resources,count,capacity,isSelling,sale,
  harvest,isHarvesting,sell,onChange,speedMultiplier=()=>.8,terrainSpeed=()=>1,hasRoads=()=>false,
  toolTier=()=>-1,cancelHarvest=()=>{}
}){
  let enabled=false,route=[],stepIndex=0,target=null,goal=null;
  let selling=false,stalled=0,retry=0,elapsed=0;
  const ignored=new WeakMap();
  function clearRoute(){route=[];stepIndex=0;goal=null;target=null;stalled=0}
  function setEnabled(value){
    const next=!!value;if(next===enabled)return enabled;
    enabled=next;clearRoute();retry=0;
    onChange?.(enabled);return enabled;
  }
  function toggle(){return setEnabled(!enabled)}
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const safe=point=>!blocked(point.x,point.z);
  function tryRoute(destination,router){
    if(!safe(destination))return null;
    return router.route(player.position,destination,{allowNearby:true,arrivalRadius:.48});
  }
  function plan(){
    const router=createRouter(blocked,{cell:1.15,maxVisits:1550,
      speedAt:hasRoads()?(x,z)=>terrainSpeed(x,z):null});
    selling=count()>=capacity();
    if(selling){
      // Route toward the market in bounded, obstacle-aware legs when far away.
      // The grid router has a finite search horizon, so distant goals must be staged.
      const remaining=distance(player.position,sale);
      if(remaining>73){
        const a=Math.atan2(sale.z-player.position.z,sale.x-player.position.x);
        for(const length of [58,35,17])for(const offset of [0,.24,-.24,.58,-.58,1,-1]){
          const direction=a+offset;
          const waypoint={x:player.position.x+Math.cos(direction)*length,z:player.position.z+Math.sin(direction)*length};
          const path=tryRoute(waypoint,router);
          if(path){goal=waypoint;route=path;stepIndex=0;return true}
        }
        return false;
      }
      const options=[
        {x:sale.x,z:sale.z},{x:sale.x-1,z:sale.z},
        {x:sale.x+1,z:sale.z},{x:sale.x,z:sale.z+1}
      ];
      for(const destination of options){
        const candidate=tryRoute(destination,router);
        if(candidate){goal=destination;route=candidate;stepIndex=0;return true}
      }
      return false;
    }
    const nearby=rankHarvestNodes(resources(),player.position,toolTier,150,
      node=>(ignored.get(node)||0)>elapsed);
    // Small planning budget preserves FPS when many resource nodes are active.
    // After a failed top-tier target, try the next reachable node instead of
    // repeatedly wasting a full planning cycle on the same obstruction.
    let routeAttempts=0,considered=0;
    for(const node of nearby){
      if(considered++>=6||routeAttempts>=12)break;
      const angle=Math.atan2(player.position.z-node.z,player.position.x-node.x);
      const radius=node.type===0?2.10:node.type===1?2.35:node.type===2?2.2:1.85;
      let attemptedForNode=0;
      for(const offset of [0,.8,-.8,1.55,-1.55,Math.PI]){
        const destination={
          x:node.x+Math.cos(angle+offset)*radius,
          z:node.z+Math.sin(angle+offset)*radius
        };
        if(!safe(destination))continue;
        routeAttempts++;attemptedForNode++;
        const candidate=tryRoute(destination,router);
        if(candidate){
          goal=destination;route=candidate;stepIndex=0;target=node;
          return true;
        }
        if(attemptedForNode>=3||routeAttempts>=12)break;
      }
      // A blocked higher-tier node should not monopolize autopilot decisions.
      ignored.set(node,elapsed+18);
    }
    return false;
  }
  function update(dt){
    if(!enabled||dt<=0)return false;
    elapsed+=dt;
    const full=count()>=capacity();
    // A bag reaching capacity takes precedence over harvesting and every
    // existing resource objective. Cancel the current animation immediately
    // instead of waiting beside the node for another harvest interval.
    if(full){
      if(isHarvesting())cancelHarvest();
      if(!selling||target){clearRoute();retry=0}
      selling=true;
    }else if(selling){
      selling=false;clearRoute();retry=0;
    }
    if(isHarvesting())return false;
    // The sale zone is a rectangle, not necessarily its center point.
    // Sell as soon as the character enters it, then plan the next harvest.
    if(full&&isSelling(player.position.x,player.position.z)){
      sell();clearRoute();selling=false;retry=.25;return false;
    }
    if(retry>0){retry=Math.max(0,retry-dt);return false}
    if(target?.dead||target?.respawnAt)clearRoute();
    if(!route.length||stepIndex>=route.length){
      clearRoute();
      if(!plan()){retry=selling?.8:1.2;return false}
    }
    if(target&&distance(player.position,target)<3.1&&
       distance(player.position,goal)<.8){
      const node=target;clearRoute();
      harvest(node);return false;
    }
    let point=route[stepIndex];
    if(!point){clearRoute();return false}
    if(distance(player.position,point)<.38&&stepIndex<route.length-1)
      point=route[++stepIndex];
    const d=distance(player.position,point);
    if(d<.38){
      if(selling&&isSelling(player.position.x,player.position.z)){
        sell();clearRoute();retry=.2;
      }else if(target){
        const node=target;clearRoute();harvest(node);
      }else clearRoute();
      return false;
    }
    const speed=6.3*Math.max(.5,Math.min(1.5,Number(speedMultiplier())||.8))*terrainSpeed(player.position.x,player.position.z),speedStep=Math.min(d,dt*speed);
    const dx=(point.x-player.position.x)/d,dz=(point.z-player.position.z)/d;
    const oldX=player.position.x,oldZ=player.position.z;
    move(dx*speedStep,dz*speedStep);
    const actual=Math.hypot(player.position.x-oldX,player.position.z-oldZ);
    if(actual<speedStep*.18){
      stalled+=dt;
      if(stalled>.8){
        if(target)ignored.set(target,elapsed+25);
        clearRoute();retry=.55;
      }
      return false;
    }
    stalled=Math.max(0,stalled-dt*2);
    const aim=Math.atan2(dx,dz),delta=Math.atan2(
      Math.sin(aim-player.rotation.y),Math.cos(aim-player.rotation.y));
    player.rotation.y+=delta*Math.min(1,dt*12);
    return true;
  }
  return {update,toggle,setEnabled,get enabled(){return enabled},get target(){return target}};
}
