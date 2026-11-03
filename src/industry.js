import {makeStructure} from './structures.js?v=20261103r2';
import {createRouter} from './navigation.js?v=20261103aa';
import {workstation,storagePoint,yardPoint} from './factory-tasks.js?v=20261103v';
import {worldPoint,rotateOffset,normalizeRotation,pointInOrientedRect} from './facility-layout.js';

export function createIndustry(T, scene, st, resources, biome, sale, values, hooks={}) {
  const agents=[],agentById=new Map(), buildings=st.buildings;
  const byId=new Map(), models=new Map(), totalCapacity=100, employeeLimit=5;
  const colors=[0x438258,0x8c9a9d,0x7d889e,0xd4a772,0xaaa36c];
  const outfits={
    worker:0x477365, factory:0x486f8c, transport:0xb58748, seller:0x7964a3
  };
  const resourcesColors=[0xa87849,0x8b9398,0x6496b4,0xdcc58b,0xcdb451];
  const viewPool=new Map();
  const bodyGeometry=new T.CylinderGeometry(.23,.27,.8,6);
  const headGeometry=new T.IcosahedronGeometry(.19,0);
  const legGeometry=new T.BoxGeometry(.15,.55,.19);
  const armGeometry=new T.BoxGeometry(.13,.62,.16);
  const loadGeometry=new T.BoxGeometry(.43,.39,.37);
  const skin=new T.MeshLambertMaterial({color:0xe3b38d});
  const trousers=new T.MeshLambertMaterial({color:0x393f43});
  const materials={};
  for(const role of Object.keys(outfits))materials[role]=new T.MeshLambertMaterial({color:outfits[role]});
  const cargoMaterials=resourcesColors.map(color=>new T.MeshLambertMaterial({color}));
  let nextId=1,time=0,planningClock=0,viewer={x:0,z:0},camera=null,abstractCount=0,navReplans=0,separations=0;
  let navigationBudget=0,stuckRecoveries=0,routeFailures=0,lastDesiredSignature='';
  let lastStats={employees:0,visible:0,carrying:0,transports:0,delivered:0,sold:0,soldRaw:0,soldProcessed:0,processed:0};
  const num=n=>Number.isFinite(+n)?Math.max(0,+n):0;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const isPresent=b=>b&&byId.get(b.id)===b;
  const limited=(n,max=totalCapacity)=>Math.max(0,Math.min(max,n));
  function ensure(b){
    if(!b.id)b.id='b'+nextId++;
    if(b.id.startsWith('b'))nextId=Math.max(nextId,(Number(b.id.slice(1))||0)+1);
    b.type=Number.isInteger(b.type)?Math.max(0,Math.min(4,b.type)):Math.max(0,biome(b.x,b.z));
    b.rotation=normalizeRotation(b.rotation);
    b.workers=limited(Math.floor(num(b.workers)),employeeLimit);
    b.carryLevel=Math.min(5,Math.floor(num(b.carryLevel)));
    b.stockRaw=limited(num(b.stockRaw??(b.kind==='worker'?b.stock:0)));
    b.inputRaw=limited(num(b.inputRaw));
    b.stockProcessed=limited(num(b.stockProcessed));
    b.progress=limited(num(b.progress),999);
    b.stock=b.kind==='worker'?b.stockRaw:b.kind==='factory'?b.stockProcessed:0;
    if(!byId.has(b.id)){byId.set(b.id,b);const view=makeStructure(T,scene,b);models.set(b.id,view);b.mesh=view.group}
    return b;
  }
  function createView(agent){
    const key=agent.role+':'+agent.home.type;
    const pooled=viewPool.get(key);
    if(pooled?.length){
      const restored=pooled.pop();
      restored.group.visible=true;
      scene.add(restored.group);
      return restored;
    }
    const g=new T.Group(),parts={};
    function part(geometry,material,x,y,z,parent=g){
      const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=false;parent.add(mesh);return mesh;
    }
    part(bodyGeometry,materials[agent.role],0,1.10,0);
    part(headGeometry,skin,0,1.68,.03);
    part(loadGeometry,trousers,0,.64,0);
    for(let side of [-1,1]){
      const leg=new T.Group();leg.position.set(side*.14,.49,0);g.add(leg);
      part(legGeometry,trousers,0,-.29,0,leg);
      if(side===-1)parts.leftLeg=leg;else parts.rightLeg=leg;
      const arm=new T.Group();arm.position.set(side*.36,1.39,0);g.add(arm);
      part(armGeometry,materials[agent.role],0,-.35,0,arm);
      if(side===-1)parts.leftArm=arm;else parts.rightArm=arm;
    }
    const carried=new T.Group();carried.position.set(0,1.12,-.44);carried.visible=false;g.add(carried);
    const color=cargoMaterials[agent.home.type];
    if(agent.home.type===0){
      for(let i=-1;i<=1;i++){
        const log=part(new T.CylinderGeometry(.10,.1,.55,6),color,i*.18,0,0,carried);
        log.rotation.z=Math.PI/2;
      }
    }else if(agent.home.type===1||agent.home.type===2){
      part(new T.IcosahedronGeometry(.23,0),color,0,.05,0,carried);
      part(new T.IcosahedronGeometry(.15,0),color,.19,.07,0,carried);
    }else if(agent.home.type===3){
      part(new T.BoxGeometry(.56,.43,.38),color,0,0,0,carried);
    }else{
      for(let i=-1;i<=1;i++)part(new T.ConeGeometry(.11,.48,4),color,i*.16,.08,0,carried);
    }
    const handTool=new T.Group();handTool.position.set(0,-.6,.08);
    parts.rightArm.add(handTool);parts.tool=handTool;handTool.visible=agent.role==='worker';
    if(agent.role==='worker'){
      const shaft=part(new T.CylinderGeometry(.045,.055,.68,6),cargoMaterials[0],0,-.21,0,handTool);
      const type=agent.home.type;
      if(type===0)part(new T.BoxGeometry(.40,.23,.12),cargoMaterials[1],.16,-.51,0,handTool);
      else if(type===1)part(new T.BoxGeometry(.65,.16,.14),cargoMaterials[1],0,-.5,0,handTool);
      else if(type===2){shaft.material=cargoMaterials[2];part(new T.CylinderGeometry(.12,.15,.33,7),cargoMaterials[2],0,-.58,0,handTool)}
      else if(type===3)part(new T.BoxGeometry(.26,.33,.08),cargoMaterials[1],0,-.62,0,handTool);
      else part(new T.BoxGeometry(.47,.10,.10),cargoMaterials[1],.14,-.51,0,handTool);
    }
    const finished=new T.Group();
    finished.position.set(0,1.12,-.44);finished.visible=false;g.add(finished);
    const done=new T.MeshLambertMaterial({color:[0xc89a66,0xb3bfc0,0xa7c0c3,0xcfe6de,0xe4dac0][agent.home.type]});
    for(let i=0;i<3;i++){
      const t=agent.home.type;
      let geo;
      if(t===0)geo=new T.BoxGeometry(.15,.10,.42);
      else if(t===1)geo=new T.BoxGeometry(.20,.18,.32);
      else if(t===2)geo=new T.BoxGeometry(.19,.13,.35);
      else if(t===3)geo=new T.CylinderGeometry(.07,.11,.26,7);
      else geo=new T.CylinderGeometry(.11,.15,.29,7);
      const m=new T.Mesh(geo,done);
      m.position.set((i-1)*.18,(i%2)*.16,0);finished.add(m);
    }
    parts.load=carried;parts.finishedLoad=finished;parts.group=g;
    scene.add(g);return parts;
  }
  function removeView(a){
    if(!a.view)return;
    const view=a.view,key=a.role+':'+a.home.type;
    scene.remove(view.group);view.group.visible=false;
    if(!viewPool.has(key))viewPool.set(key,[]);
    const pool=viewPool.get(key);
    if(pool.length<14)pool.push(view);
    else view.group.traverse?.(obj=>{
      if(obj.geometry&&![bodyGeometry,headGeometry,legGeometry,armGeometry,loadGeometry].includes(obj.geometry))
        obj.geometry.dispose?.();
    });
    a.view=null;
  }
  function addAgent(b,i){
    const role=b.kind==='worker'?'worker':b.kind==='factory'?'factory':b.kind==='transport'?'transport':'seller';
    const port=homePort(b,i);
    const a={id:b.id+'-'+i,home:b,role,x:port.x,z:port.z,slot:i,
      state:'idle',target:null,targetBuilding:null,receiver:null,goal:null,carry:0,carryType:b.type,
      processed:false,timer:0,wait:0,walkPhase:i,angle:0,view:null,selectionCooldown:0,route:null,waypoint:0,goalKey:'',routeCooldown:0,abstract:false,workMotion:'inspect',workElapsed:0,
       blockedAge:0,noPathAge:0,stagnationAge:0,navWatch:0,navStartX:NaN,navStartZ:NaN,
       routeGoal:null,approachAttempts:0,routeEpoch:0};
    agents.push(a);agentById.set(a.id,a);
  }
  function reconcile(){
    for(const b of buildings)ensure(b);
    const signature=buildings.map(b=>b.id+':'+b.workers).join('|');
    if(signature===lastDesiredSignature)return;
    lastDesiredSignature=signature;
    const desired=new Set();
    for(const b of buildings)for(let i=0;i<b.workers;i++){
      const id=b.id+'-'+i;desired.add(id);
      if(!agentById.has(id))addAgent(b,i);
    }
    for(let i=agents.length-1;i>=0;i--){
      const a=agents[i];
      if(!desired.has(a.id)){
        if(a.carry>0)refundCargo(a);
        removeView(a);agents.splice(i,1);agentById.delete(a.id);
      }
    }
  }
  function homePort(b,i=0){return worldPoint(b,(i-2)*.80,b.kind==='factory'?4.5:3.7)}
  function stockAccess(b,processed=false,slot=2){
    const p=storagePoint(b,processed);
    const offset=rotateOffset((slot-2)*.73,Math.abs(slot-2)*.13,b.rotation);
    return {x:p.x+offset.x,z:p.z+offset.z};
  }
  function approachNode(agent,target,attempt=0){
    const distanceFromTarget=Math.hypot(agent.x-target.x,agent.z-target.z);
    const angle=Math.atan2(agent.z-target.z,agent.x-target.x);
    // Keep a real body-width corridor between the worker and the tree or rock.
    const radius=[1.52,1.72,1.65,1.42,1.24][target.type];
    const offsets=[0,Math.PI/3,-Math.PI/3,2*Math.PI/3,-2*Math.PI/3,
      Math.PI,Math.PI/6,-Math.PI/6,Math.PI/2,-Math.PI/2];
    const start=attempt%offsets.length;
    for(let j=0;j<offsets.length;j++){
      const offset=offsets[(start+j)%offsets.length];
      for(const expansion of [0,.55,1.15]){
        const x=target.x+Math.cos(angle+offset)*(radius+expansion);
        const z=target.z+Math.sin(angle+offset)*(radius+expansion);
        if(staticBlocked(x,z,.42))continue;
        if(distanceFromTarget<.01)continue;
        return {x,z};
      }
    }
    return null;
  }
  function clearStockAccess(agent,goal){
    if(!staticBlocked(goal.x,goal.z,.40))return goal;
    for(const r of [.65,1.0,1.5,2.15]){
      for(let i=0;i<16;i++){
        const a=(i/16)*Math.PI*2+agent.slot*.23;
        const p={x:goal.x+Math.cos(a)*r,z:goal.z+Math.sin(a)*r};
        if(!staticBlocked(p.x,p.z,.40))return p;
      }
    }
    return null;
  }

  const gridSize=12,sourceCells=new Map(),buildingCells=new Map();
  const workerBuildings=Array.from({length:5},()=>[]),
    factoryBuildings=Array.from({length:5},()=>[]);
  let indexedResources=-1,indexedBuildings=-1,indexedAt=-99;
  const gridKey=(x,z)=>Math.floor(x/gridSize)+','+Math.floor(z/gridSize);
  function rebuildSpatialIndex(){
    if(resources.length===indexedResources&&buildings.length===indexedBuildings&&time-indexedAt<1.0)return;
    indexedAt=time;indexedResources=resources.length;indexedBuildings=buildings.length;
    sourceCells.clear();buildingCells.clear();
    for(let t=0;t<5;t++){workerBuildings[t].length=0;factoryBuildings[t].length=0}
    for(const r of resources){
      if(r.dead)continue;
      const key=gridKey(r.x,r.z);
      if(!sourceCells.has(key))sourceCells.set(key,[]);
      sourceCells.get(key).push(r);
    }
    for(const b of buildings){
      if(b.kind==='worker')workerBuildings[b.type]?.push(b);
      if(b.kind==='factory')factoryBuildings[b.type]?.push(b);
      const key=gridKey(b.x,b.z);
      if(!buildingCells.has(key))buildingCells.set(key,[]);
      buildingCells.get(key).push(b);
    }
  }
  function staticBlocked(x,z,radius=.35,target=null){
    // Shared collision rules for A* and physical stepping. Low-height
    // scenery is already excluded by the supplied decoration probe.
    if(Math.abs(x)<2.5+radius&&Math.abs(z)<2+radius)return true;
    if(hooks.blocked?.(x,z,radius))return true;
    const bx=Math.floor(x/gridSize),bz=Math.floor(z/gridSize);
    for(let ix=bx-2;ix<=bx+2;ix++)for(let iz=bz-2;iz<=bz+2;iz++){
      const group=buildingCells.get(ix+','+iz);if(!group)continue;
      for(const b of group){
        if(Math.abs(x-b.x)>23||Math.abs(z-b.z)>23)continue;
        const view=models.get(b.id);
        if(view?.colliders?.length){
          for(const c of view.colliders)
            if(pointInOrientedRect(x,z,c,radius))return true;
        }else if(Math.abs(x-b.x)<2.45+radius&&Math.abs(z-b.z)<2.3+radius)return true;
      }
    }
    for(let ix=bx-1;ix<=bx+1;ix++)for(let iz=bz-1;iz<=bz+1;iz++){
      const group=sourceCells.get(ix+','+iz);if(!group)continue;
      for(const r of group){
        if(r.dead||r===target)continue;
        const d=[.75,1.05,1,.8,.48][r.type]+radius;
        const dx=r.x-x,dz=r.z-z;
        if(Math.abs(dx)<d&&Math.abs(dz)<d&&dx*dx+dz*dz<d*d)return true;
      }
    }
    return false;
  }
  const PERSON_CELL=4.0,agentCells=new Map();
  const personKey=(x,z)=>Math.floor(x/PERSON_CELL)+','+Math.floor(z/PERSON_CELL);
  function refreshAgentIndex(){
    agentCells.clear();
    for(const a of agents){
      // Outside the physical simulation radius, employees are data-only.
      const dx=a.x-viewer.x,dz=a.z-viewer.z;
      if(dx*dx+dz*dz>185*185){a.inAgentGrid=false;continue}
      a.inAgentGrid=true;
      const key=personKey(a.x,a.z);
      let list=agentCells.get(key);
      if(!list)agentCells.set(key,list=[]);
      list.push(a);
    }
  }
  function updateAgentCell(a,oldX,oldZ){
    if(!a.inAgentGrid)return;
    const original=personKey(oldX,oldZ),next=personKey(a.x,a.z);
    if(original===next)return;
    const list=agentCells.get(original);
    if(list){const index=list.indexOf(a);if(index>=0)list.splice(index,1)}
    let other=agentCells.get(next);
    if(!other)agentCells.set(next,other=[]);
    other.push(a);
  }
  function humanBlocked(x,z,self){
    const vx=x-self.x,vz=z-self.z,len2=Math.max(.0001,vx*vx+vz*vz);
    const cx=Math.floor(x/PERSON_CELL),cz=Math.floor(z/PERSON_CELL);
    for(let ix=cx-1;ix<=cx+1;ix++)for(let iz=cz-1;iz<=cz+1;iz++){
      const candidates=agentCells.get(ix+','+iz);if(!candidates)continue;
      for(const other of candidates){
        if(other===self)continue;
        const dx=other.x-self.x,dz=other.z-self.z;
        if(Math.abs(dx)>2||Math.abs(dz)>2)continue;
        const t=Math.max(0,Math.min(1,(dx*vx+dz*vz)/len2));
        const px=self.x+t*vx,pz=self.z+t*vz;
        if((px-other.x)**2+(pz-other.z)**2<.62*.62)return true;
      }
    }
    return false;
  }
  function moveAside(a,goal,dt,speed){
    const dx=goal.x-a.x,dz=goal.z-a.z,len=Math.max(.01,Math.hypot(dx,dz));
    const fx=dx/len,fz=dz/len,step=Math.min(.32,dt*speed);
    for(const [sx,sz] of [[-fz,fx],[fz,-fx],[-fx,-fz],
      [fx*.5-fz*.866,fz*.5+fx*.866],[fx*.5+fz*.866,fz*.5-fx*.866]]){
      const x=a.x+sx*step,z=a.z+sz*step;
      if(!staticBlocked(x,z,.35,a.target)&&!humanBlocked(x,z,a)){
        a.x=x;a.z=z;a.angle=Math.atan2(sx,sz);a.walkPhase+=dt*9;
        if(!a.abstract)hooks.onMove?.(a.id,a.x,a.z);
        a.wait=0;separations++;return true;
      }
    }
    return false;
  }
  function abandonBlockedTask(a){
    stuckRecoveries++;
    // An unreachable source must not be assigned back to the same worker next frame.
    if(a.target&&!a.target.dead){
      a.target.unreachableFailures=(a.target.unreachableFailures||0)+1;
      // An unreachable site is a topology problem rather than a transient
      // character collision. Cache the failure so other workers can keep
      // producing instead of repeatedly running the same expensive A*.
      const delay=Math.min(150,65*Math.pow(1.7,Math.min(3,a.target.unreachableFailures-1)));
      a.target.unreachableUntil=time+delay+a.slot*2;
    }
    if(a.carry)refundCargo(a);
    const sameSpot=a.rescueX!==undefined&&Math.hypot(a.x-a.rescueX,a.z-a.rescueZ)<1;
    a.rescueFailures=sameSpot?(a.rescueFailures||0)+1:1;
    a.rescueX=a.x;a.rescueZ=a.z;
    if(a.rescueFailures>=2||staticBlocked(a.x,a.z,.36)){
      // Emergency repair is only used after repeated failed routes. Choose a
      // clear position with a full body-width margin instead of an unsafe snap.
      const possible=[homePort(a.home,a.slot)];
      for(const radius of [1.3,2.2,3.6,5.0,7.0])
        for(let i=0;i<16;i++){
          const angle=i*Math.PI/8+(a.slot+.5)*.24;
          possible.push({x:a.x+Math.cos(angle)*radius,z:a.z+Math.sin(angle)*radius});
        }
      possible.sort((u,v)=>distance(u,a)-distance(v,a));
      const safe=possible.find(p=>!staticBlocked(p.x,p.z,.48)&&!humanBlocked(p.x,p.z,a));
      if(safe){
        a.x=safe.x;a.z=safe.z;
        a.route=null;a.routeGoal=null;a.rescueFailures=0;
      }
    }
    idle(a,2+a.slot*.32);
  }
  function walk(a,goal,dt,speed=2.65){
    if(!goal)return false;
    const key=goal.x.toFixed(2)+':'+goal.z.toFixed(2);
    if(a.goalKey!==key){
      a.route=null;a.goalKey=key;a.routeCooldown=0;a.routeGoal=null;
      a.blockedAge=0;a.noPathAge=0;a.stagnationAge=0;
      a.navWatch=0;a.navStartX=a.x;a.navStartZ=a.z;
    }
    const endpoint=a.routeGoal||goal;
    const remaining=distance(a,endpoint);
    if(remaining<.39){a.route=null;a.wait=0;a.blockedAge=0;return true}
    if(a.abstract){
      const step=Math.min(remaining,dt*speed);
      a.x+=(endpoint.x-a.x)/remaining*step;
      a.z+=(endpoint.z-a.z)/remaining*step;
      return remaining<=step+.38;
    }
    a.routeCooldown=Math.max(0,(a.routeCooldown||0)-dt);
    // Side-steps are not progress: detect repeated shuffling inside a tight gap.
    a.navWatch+=dt;
    if(a.navWatch>=1.40){
      const displacement=Math.hypot(a.x-a.navStartX,a.z-a.navStartZ);
      if(displacement<.29&&distance(a,goal)>.70)
        a.stagnationAge+=a.navWatch;
      else a.stagnationAge=Math.max(0,a.stagnationAge-a.navWatch*1.5);
      a.navWatch=0;a.navStartX=a.x;a.navStartZ=a.z;
    }
    if(a.blockedAge>6.5||a.noPathAge>7||a.stagnationAge>6.5){
      abandonBlockedTask(a);return false;
    }
    if(!a.route||a.waypoint>=a.route.length){
      if(a.routeCooldown>0)return false;
      if(navigationBudget<=0){a.routeCooldown=.045;return false}
      navigationBudget--;
      // Dynamic actors only enter the search once a physical encounter occurred.
      const avoidPeople=a.blockedAge>.30;
      const nearbyPeople=avoidPeople?agents.filter(other=>other!==a&&!other.abstract&&
        (distance(other,a)<9||distance(other,goal)<9)).map(other=>({x:other.x,z:other.z})):[];
      const blockedForPlan=(x,z)=>{
        if(staticBlocked(x,z,.39))return true;
        for(const other of nearbyPeople)
          if((x-other.x)**2+(z-other.z)**2<.77*.77)return true;
        return false;
      };
      const router=createRouter(blockedForPlan,{cell:1.15,maxVisits:1420});
      const path=router.route(a,goal,{allowNearby:true,arrivalRadius:.80});
      navReplans++;a.routeEpoch++;
      if(!path){
        routeFailures++;
        a.noPathAge+=Math.max(.35,dt);
        a.routeCooldown=.35+Math.min(.8,a.noPathAge*.09);
        // Rotate the approach around an unreachable node, not back into the gap.
        if(a.target&&a.state==='toResource'&&a.noPathAge>1.4){
          a.approachAttempts++;
          const alternative=a.approachAttempts<6?approachNode(a,a.target,a.approachAttempts):null;
          if(alternative){
            a.goal=alternative;a.route=null;a.goalKey='';
            a.routeCooldown=.19;a.noPathAge=0;
          }else abandonBlockedTask(a);
        }else if(!a.target&&a.noPathAge>2.2){
          const alternate=clearStockAccess(a,goal);
          if(alternate&&Math.hypot(alternate.x-goal.x,alternate.z-goal.z)>.12){
            a.goal=alternate;a.goalKey='';a.noPathAge=0;a.routeCooldown=.20;
          }
        }
        return false;
      }
      a.route=path;a.routeGoal=path[path.length-1];
      a.waypoint=0;a.routeCooldown=.30;
      a.noPathAge=0;
    }
    let wp=a.route[a.waypoint];
    if(Math.hypot(a.x-wp.x,a.z-wp.z)<.33&&a.waypoint<a.route.length-1)
      wp=a.route[++a.waypoint];
    const dx=wp.x-a.x,dz=wp.z-a.z,len=Math.hypot(dx,dz);
    if(len<.001){a.waypoint++;return false}
    const step=Math.min(len,dt*speed),nx=a.x+dx/len*step,nz=a.z+dz/len*step;
    const wall=staticBlocked(nx,nz,.36),person=!wall&&humanBlocked(nx,nz,a);
    if(wall||person){
      a.blockedAge+=dt;
      if(a.blockedAge>.75){
        a.route=null;a.routeCooldown=Math.max(.15,Math.min(.65,a.blockedAge*.10));
      }
      if(!moveAside(a,goal,dt,speed))a.wait+=dt;
      return false;
    }
    a.blockedAge=Math.max(0,a.blockedAge-dt*2.8);
    a.wait=0;a.x=nx;a.z=nz;a.angle=Math.atan2(dx,dz);a.walkPhase+=dt*10;
    hooks.onMove?.(a.id,a.x,a.z);
    return distance(a,a.routeGoal||goal)<.38;
  }
  function reserveResource(a){
    const b=a.home,cx=Math.floor(b.x/gridSize),cz=Math.floor(b.z/gridSize);
    let best=null,score=55*55;
    for(let ix=cx-5;ix<=cx+5;ix++)for(let iz=cz-5;iz<=cz+5;iz++){
      const candidates=sourceCells.get(ix+','+iz);
      if(!candidates)continue;
      for(const r of candidates){
        if(r.dead||r.type!==b.type||(r.unreachableUntil||0)>time||
          r.workerClaim&&r.workerClaim!==a.id)continue;
        const dx=r.x-b.x,dz=r.z-b.z,d2=dx*dx+dz*dz;
        if(d2<6.25||d2>=score)continue;
        best=r;score=d2;
      }
    }
    if(!best)return null;
    best.workerClaim=a.id;return best;
  }
  function release(a){if(a.target&&a.target.workerClaim===a.id)a.target.workerClaim=null;a.target=null}
  function refundCargo(a){
    if(!a.carry)return;
    let source=isPresent(a.targetBuilding)?a.targetBuilding:a.home;
    if(a.role==='seller'&&a.processed&&isPresent(source))
      source.stockProcessed=limited(source.stockProcessed+a.carry);
    else if(a.role==='transport'&&isPresent(source))
      source.stockRaw=limited(source.stockRaw+a.carry);
    else if(a.role==='worker')a.home.stockRaw=limited(a.home.stockRaw+a.carry);
    else if(a.role==='factory'&&a.carry){
      if(a.processed)a.home.stockProcessed=limited(a.home.stockProcessed+a.carry);
      else a.home.inputRaw=limited(a.home.inputRaw+a.carry);
    }
    else if(isPresent(source))source.stockRaw=limited(source.stockRaw+a.carry);
    a.carry=0;
  }
  function idle(a,delay=.5){
    release(a);a.state='idle';a.goal=null;a.targetBuilding=null;a.receiver=null;a.route=null;a.waypoint=0;a.routeGoal=null;
    a.timer=0;a.selectionCooldown=delay;a.wait=0;a.goalKey='';
    a.blockedAge=0;a.noPathAge=0;a.stagnationAge=0;a.navWatch=0;
  }
  function beginHarvester(a){
    if(a.home.stockRaw>=totalCapacity)return;
    const target=reserveResource(a);
    if(!target){if(distance(a.home,viewer)>80){a.state='remoteGather';a.timer=0}return}
    a.target=target;a.approachAttempts=0;
    a.goal=approachNode(a,target,0);
    if(!a.goal){
      target.unreachableUntil=time+25;release(a);a.selectionCooldown=1.5;return;
    }
    a.state='toResource';a.timer=0;
  }
  function findTransport(a){
    let best=null,score=Infinity;
    for(let type=0;type<5;type++){
      for(const origin of workerBuildings[type]){
        if(origin.stockRaw<1||distance(a.home,origin)>125)continue;
        for(const dest of factoryBuildings[type]){
          if(distance(origin,dest)>145||dest.inputRaw>=totalCapacity)continue;
          const cost=distance(a.home,origin)+distance(origin,dest)*.65;
          if(cost<score){score=cost;best={origin,dest}}
        }
      }
    }
    if(!best)return;
    a.targetBuilding=best.origin;a.receiver=best.dest;
    a.goal=stockAccess(best.origin,false,a.slot);
    a.state='toPickup';a.carryType=best.origin.type;a.processed=false;
  }
  function findSeller(a){
    let best=null,score=160*160,processed=false;
    // Finished products take priority over raw goods without allocating or sorting lists.
    for(const b of buildings){
      if(b.kind!=='factory'||b.stockProcessed<1)continue;
      const dx=a.home.x-b.x,dz=a.home.z-b.z,d2=dx*dx+dz*dz;
      if(d2<score){score=d2;best=b;processed=true}
    }
    if(!best){
      for(const b of buildings){
        if(b.kind!=='worker'||b.stockRaw<1)continue;
        const dx=a.home.x-b.x,dz=a.home.z-b.z,d2=dx*dx+dz*dz;
        if(d2<score){score=d2;best=b}
      }
    }
    if(!best)return;
    a.targetBuilding=best;a.processed=processed;a.carryType=best.type;
    a.goal=stockAccess(best,processed,a.slot);a.state='toPickup';
  }
  function gather(a,dt){
    if(!a.target||a.target.dead||!resources.includes(a.target)){idle(a,.8);return}
    const target=a.target;
    a.timer+=dt;
    if(a.timer<2.2)return;
    a.timer=0;
    const amount=Math.min(2+2*a.home.carryLevel,totalCapacity-a.home.stockRaw);
    if(amount<=0){idle(a,.8);return}
    a.carry=amount;a.carryType=a.home.type;
    target.unreachableFailures=0;target.unreachableUntil=0;
    target.hp=Math.max(0,target.hp-amount);
    hooks.onResourceHit?.(target,a);
    if(target.hp<=0){
      target.dead=true;target.mesh.visible=false;
      hooks.onResourceDepleted?.(target,a);
      release(a);
    }else release(a);
    a.goal=stockAccess(a.home,false,a.slot);a.state='toHome';
  }
  function updateAgent(a,dt){
    if(a.state==='remoteGather'){
      if(distance(a.home,viewer)<70){idle(a,.5);return}
      if(a.home.stockRaw>=totalCapacity){a.timer=0;return}
      a.timer+=dt;
      if(a.timer>=4.8){
        const n=Math.min(Math.floor(a.timer/4.8)*(1+a.home.carryLevel),totalCapacity-a.home.stockRaw);
        a.home.stockRaw+=n;a.timer%=4.8;
      }
      return;
    }
    a.selectionCooldown=Math.max(0,a.selectionCooldown-dt);
    if(a.state==='idle'){
      if(a.selectionCooldown>0)return;
      if(a.role==='worker')beginHarvester(a);
      else if(a.role==='transport')findTransport(a);
      else if(a.role==='seller')findSeller(a);
      else if(a.role==='factory'){
        const task=workstation(a.home.type,a.slot);
        a.workMotion=task.motion;
        if(a.home.inputRaw>0&&a.home.stockProcessed<totalCapacity){
          a.goal=stockAccess(a.home,false,a.slot);a.state='factoryPickup';
        }else {
          a.goal=yardPoint(a.home,task.point);
          a.state='factoryStandby';
        }
      }
      a.selectionCooldown=.7;return;
    }
    if(a.wait>10||a.blockedAge>7||a.stagnationAge>8){
      abandonBlockedTask(a);return;
    }
    if(a.state==='factoryStandby'){
      // Five assigned workstations prevent workers from queuing on a single spot.
      if(a.home.inputRaw>0&&a.home.stockProcessed<totalCapacity){
        a.state='factoryPickup';a.goal=stockAccess(a.home,false,a.slot);a.timer=0;return;
      }
      if(distance(a,a.goal)>.40)walk(a,a.goal,dt,2.3);
      return;
    }
    if(a.state==='factoryPickup'){
      if(a.home.inputRaw<=0||a.home.stockProcessed>=totalCapacity){idle(a,1);return}
      if(!walk(a,a.goal,dt,2.4))return;
      a.state='factoryCollect';a.timer=0;a.angle=normalizeRotation(a.home.rotation)+Math.PI;return;
    }
    if(a.state==='factoryCollect'){
      a.timer+=dt;if(a.timer<.55)return;
      if(a.home.inputRaw<1){idle(a,.6);return}
      a.home.inputRaw--;a.carry=1;a.processed=false;
      const task=workstation(a.home.type,a.slot);
      a.goal=yardPoint(a.home,task.point);
      a.state='factoryToWork';return;
    }
    if(a.state==='factoryToWork'){
      if(walk(a,a.goal,dt,2.35)){
        a.workMotion=workstation(a.home.type,a.slot).motion;
        a.state='factoryWork';a.timer=0;a.angle=normalizeRotation(a.home.rotation)+Math.PI;
      }
      return;
    }
    if(a.state==='factoryWork'){
      a.workElapsed+=dt;
      a.timer+=dt;
      if(a.timer<workstation(a.home.type,a.slot).duration)return;
      a.timer=0;a.processed=true;
      a.state='factoryToOutput';a.goal=stockAccess(a.home,true,a.slot);
      return;
    }
    if(a.state==='factoryToOutput'){
      if(!walk(a,a.goal,dt,2.35))return;
      a.state='factoryOutput';a.timer=0;a.angle=normalizeRotation(a.home.rotation)+Math.PI;return;
    }
    if(a.state==='factoryOutput'){
      a.timer+=dt;if(a.timer<.55)return;
      if(a.home.stockProcessed>=totalCapacity)return;
      a.home.stockProcessed++;a.carry=0;
      lastStats.processed++;hooks.onProcess?.(a.home,1);
      idle(a,.4);return;
    }
    if(a.state==='toResource'){
      if(!a.target||a.target.dead||!resources.includes(a.target)){idle(a,.6);return}
      if(walk(a,a.goal,dt)){a.state='gather';a.timer=0}return;
    }
    if(a.state==='gather'){gather(a,dt);return}
    if(a.state==='toHome'){
      if(walk(a,a.goal,dt)){a.state='dropHarvest';a.timer=0;a.angle=normalizeRotation(a.home.rotation)+Math.PI}return;
    }
    if(a.state==='dropHarvest'){
      a.timer+=dt;if(a.timer<.55)return;
      a.home.stockRaw=limited(a.home.stockRaw+a.carry);a.carry=0;idle(a,.4);
      return;
    }
    if(a.state==='toPickup'){
      if(!isPresent(a.targetBuilding)||a.role==='transport'&&!isPresent(a.receiver)){idle(a,1);return}
      if(!walk(a,a.goal,dt))return;
      a.state='pickupStock';a.timer=0;a.angle=Math.PI;return;
    }
    if(a.state==='pickupStock'){
      a.timer+=dt;if(a.timer<.52)return;
      const b=a.targetBuilding;
      if(a.role==='transport'){
        const n=Math.min(6+3*a.home.carryLevel,b.stockRaw,totalCapacity-a.receiver.inputRaw);
        if(n<=0){idle(a,.7);return}
        b.stockRaw-=n;a.carry=n;a.carryType=b.type;a.goal=stockAccess(a.receiver,false,a.slot);
        a.state='toFactory';return;
      }
      const available=a.processed?b.stockProcessed:b.stockRaw;
      const n=Math.min(6+3*a.home.carryLevel,available);
      if(n<=0){idle(a,.8);return}
      if(a.processed)b.stockProcessed-=n;else b.stockRaw-=n;
      a.carry=n;a.carryType=b.type;a.goal={x:sale.x,z:sale.z+sale.d*.32};
      a.state='toMarket';return;
    }
    if(a.state==='toFactory'){
      if(!isPresent(a.receiver)){refundCargo(a);idle(a,1);return}
      if(!walk(a,a.goal,dt))return;
      a.state='dropTransport';a.timer=0;a.angle=Math.PI;return;
    }
    if(a.state==='dropTransport'){
      a.timer+=dt;if(a.timer<.55)return;
      const n=Math.min(a.carry,totalCapacity-a.receiver.inputRaw);
      a.receiver.inputRaw+=n;a.carry-=n;
      lastStats.delivered+=n;
      if(a.carry>0){refundCargo(a)}
      a.state='returnHome';a.goal=homePort(a.home,a.slot);return;
    }
    if(a.state==='toMarket'){
      if(!walk(a,a.goal,dt,2.9))return;
      a.state='selling';a.timer=.35;return;
    }
    if(a.state==='selling'){
      a.timer-=dt;if(a.timer>0)return;
      const amount=Math.round(a.carry*values[a.carryType]*(a.processed?3:1)*(hooks.priceMultiplier?.(a.carryType)||1));
      if(amount>0){st.gold+=amount;lastStats.sold+=amount;
        if(a.processed)lastStats.soldProcessed+=amount;else lastStats.soldRaw+=amount;
        hooks.onSale?.(amount,a)}
      a.carry=0;a.state='returnHome';a.goal=homePort(a.home,a.slot);return;
    }
    if(a.state==='returnHome'&&walk(a,a.goal,dt))idle(a,.5);
  }
  const forward={x:0,z:1},cullOrigin={x:0,z:0};
  const frustum=T.Frustum&&T.Matrix4&&T.Sphere&&T.Vector3?new T.Frustum():null;
  const projection=frustum?new T.Matrix4():null;
  const cameraDirection=T.Vector3?new T.Vector3():null;
  const visibilitySphere=frustum?new T.Sphere(new T.Vector3(),2.4):null;
  function inView(x,z,range=165,radius=2.4){
    const dx=x-viewer.x,dz=z-viewer.z;
    if(dx*dx+dz*dz>range*range)return false;
    if(!camera||!Number.isFinite(cullOrigin.x))return true;
    if(frustum){
      visibilitySphere.center.set(x,1.35,z);visibilitySphere.radius=radius;
      return frustum.intersectsSphere(visibilitySphere);
    }
    const ux=x-cullOrigin.x,uz=z-cullOrigin.z,len=Math.hypot(ux,uz);
    // Grace margin prevents popping close to the edges of the screen.
    if(len<18)return true;
    return (ux*forward.x+uz*forward.z)/Math.max(.01,len)>-.24;
  }
  const motionStyles={
    inspect:[-.49,-.72,.12,.13,.045],
    feed:[-1.17,-1.22,.53,.34,.11],
    plane:[-1.12,-1.52,.78,.51,.09],
    lift:[-.81,-1.09,.64,.42,.22],
    stack:[-.94,-1.38,.80,.53,.14],
    cut:[-.72,-1.62,.94,.42,.11],
    hammer:[-.64,-1.48,.87,.52,.17],
    polish:[-.96,-1.14,.63,.72,.09],
    shovel:[-1.00,-1.34,.69,.33,.16],
    pump:[-.72,-1.28,.71,.65,.12],
    pour:[-1.18,-1.02,.60,.57,.10],
    sift:[-1.06,-1.17,.44,.73,.13],
    rotate:[-1.29,-1.26,.53,.46,.08],
    pack:[-.90,-1.41,.75,.39,.19],
    crank:[-1.24,-1.17,.46,.78,.08]
  };
  function animate(a,dt){
    if(!inView(a.x,a.z,145)){removeView(a);return false}
    if(!a.view)a.view=createView(a);
    const v=a.view,g=v.group;
    const walking=a.state.startsWith('to')||a.state.startsWith('factoryTo')||a.state==='factoryPickup'||a.state==='returnHome';
    g.position.set(a.x,Math.sin(a.walkPhase*2)*.022*(walking?1:0),a.z);
    const diff=Math.atan2(Math.sin(a.angle-g.rotation.y),Math.cos(a.angle-g.rotation.y));
    g.rotation.y+=diff*Math.min(1,dt*12);
    const stride=walking?Math.sin(a.walkPhase)*.56:0;
    v.leftLeg.rotation.x=stride;v.rightLeg.rotation.x=-stride;
    const work=a.state==='factoryWork',gather=a.state==='gather';
    const transfer=['factoryCollect','factoryOutput','pickupStock','dropTransport','dropHarvest'].includes(a.state);
    const beat=Math.sin(time*(work?4.5:gather?5.5:3.0)+a.slot*.6);
    v.leftArm.rotation.y=0;v.rightArm.rotation.y=0;
    v.tool.rotation.z=0;v.tool.rotation.y=0;g.rotation.z=0;
    if(transfer){
      const dip=Math.sin(Math.min(1,a.timer/.55)*Math.PI);
      v.leftArm.rotation.x=-.85-dip*.6;
      v.rightArm.rotation.x=-1.01-dip*.75;
      v.rightArm.rotation.y=.2*dip;
      v.leftArm.rotation.z=.11*dip;
      g.position.y=-.20*dip;
      a.angle=Math.PI;
    }else if(work){
      const [left,right,power,side,lean]=motionStyles[a.workMotion]||motionStyles.inspect;
      const sweep=beat*power;
      v.leftArm.rotation.x=left+sweep*.45;
      v.rightArm.rotation.x=right+sweep*.72;
      v.rightArm.rotation.y=Math.cos(time*3+a.slot)*side;
      v.leftArm.rotation.z=-.11+beat*.14;
      v.rightArm.rotation.z=.14-beat*.16;
      g.rotation.z=beat*.045;
      g.position.y=-(1+beat)*lean*.12;
      if(a.workMotion==='hammer')v.rightArm.rotation.x=right-Math.max(0,beat)*1.0;
      if(a.workMotion==='sift')v.leftArm.rotation.y=beat*.38;
      if(a.workMotion==='crank')v.rightArm.rotation.y=Math.sin(time*5)*.86;
      // Workstations are behind their operator in each facility's local -Z.
      a.angle=normalizeRotation(a.home.rotation)+Math.PI;
    }else if(gather){
      const type=a.home.type;
      if(a.target)a.angle=Math.atan2(a.target.x-a.x,a.target.z-a.z);
      v.leftArm.rotation.x=type===2?-1.05:-.55+beat*.23;
      v.rightArm.rotation.x=type===0?(a.targetLog?-.95+beat*.89:-1.27+beat*.38):
        type===1?-1.73+beat*.91:type===2?-1.33+beat*.11:type===3?-.94+beat*.61:-.71;
      v.rightArm.rotation.y=type===4?beat*.8:0;
      // Tree axes must strike sideways, with the axe edge facing local +Z.
      v.tool.rotation.y=type===0?(-Math.PI/2+beat*.14):0;
      v.rightArm.rotation.y=type===0?-.45+beat*.66:v.rightArm.rotation.y;
      v.tool.rotation.z=type===4?beat*.45:0;
      g.rotation.z=type===1?beat*.032:0;
    }else{
      v.leftArm.rotation.x=walking?-stride*.48:-.14;
      v.rightArm.rotation.x=walking?stride*.48:-.17;
    }
    v.load.visible=a.carry>0&&!a.processed&&!work;
    v.finishedLoad.visible=a.carry>0&&a.processed&&!work;
    if(a.carry>0)for(const mesh of v.load.children)mesh.material=cargoMaterials[a.carryType];
    return true;
  }
  function register(b){ensure(b);reconcile();return b.mesh}
  function update(dt,px,pz,cam=null){
    time+=dt;planningClock+=dt;viewer.x=px;viewer.z=pz;camera=cam;
    navigationBudget=agents.length>70?1:2;
    rebuildSpatialIndex();
    if(camera&&typeof camera.getWorldDirection==='function'&&T.Vector3){
      if(frustum){
        camera.updateMatrixWorld();
        projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projection);
      }
      camera.getWorldDirection(cameraDirection);
      const length=Math.hypot(cameraDirection.x,cameraDirection.z)||1;
      forward.x=cameraDirection.x/length;forward.z=cameraDirection.z/length;
      cullOrigin.x=camera.position.x;cullOrigin.z=camera.position.z;
    }else camera=null;
    if(planningClock>=.33){reconcile();planningClock=0}
    refreshAgentIndex();

    let shown=0,transporting=0,carrying=0;abstractCount=0;
    for(const a of agents){
      const previousX=a.x,previousZ=a.z;
      const previous=a.abstract;
      a.abstract=!inView(a.x,a.z,155)&&distance(a,viewer)>32;
      if(a.abstract)abstractCount++;
      if(previous&&!a.abstract&&
         (staticBlocked(a.x,a.z,.38)||humanBlocked(a.x,a.z,a))){
        // Data-only workers can share a theoretical pickup point. When they
        // enter view, resolve each into a distinct physically valid spot.
        const locations=[homePort(a.home,a.slot)];
        for(const radius of [.85,1.55,2.35,3.4,4.8])
          for(let i=0;i<12;i++){
            const theta=i*Math.PI/6+a.slot*.28;
            locations.push({x:a.x+Math.cos(theta)*radius,z:a.z+Math.sin(theta)*radius});
          }
        locations.sort((u,v)=>distance(u,a)-distance(v,a));
        const safe=locations.find(p=>!staticBlocked(p.x,p.z,.41)&&!humanBlocked(p.x,p.z,a));
        if(safe){
          a.x=safe.x;a.z=safe.z;a.route=null;a.routeGoal=null;a.goalKey='';
        }else a.abstract=true;
      }
      if(a.abstract){
        a.abstractElapsed=(a.abstractElapsed||0)+dt;
        if(a.abstractElapsed>=.55){
          updateAgent(a,a.abstractElapsed);a.abstractElapsed=0;
        }
      }else {
        if(a.abstractElapsed){updateAgent(a,a.abstractElapsed);a.abstractElapsed=0}
        updateAgent(a,dt);
      }
      updateAgentCell(a,previousX,previousZ);
      if(!a.abstract&&animate(a,dt))shown++;
      else removeView(a);
      if(a.carry>0)carrying++;
      if(a.role==='transport'&&a.carry>0)transporting++;
    }
    for(const b of buildings){
      b.stock=b.kind==='worker'?b.stockRaw:b.kind==='factory'?b.stockProcessed:0;
      const model=models.get(b.id);
      if(!model)continue;
      const visible=inView(b.x,b.z,170,13);
      model.group.visible=visible;
      if(visible)model.update(time,true);
    }
    Object.assign(lastStats,{employees:agents.length,visible:shown,carrying,transports:transporting,
      abstract:abstractCount,replans:navReplans,separations,stuckRecoveries,routeFailures});
    return lastStats;
  }
  function sync(){for(const b of buildings)ensure(b);reconcile()}
  function setLanguage(lang){for(const model of models.values())model.setLanguage?.(lang)}
  function getLabels(){return Array.from(models,([id,view])=>({id,label:view.labelText}))}
  function readStats(){return {...lastStats}}
  function dispose(){for(const a of agents)removeView(a)}
  function blocked(x,z,radius=.43){rebuildSpatialIndex();return staticBlocked(x,z,radius)}
  function snapshot(){
    return agents.map(a=>({id:a.id,role:a.role,slot:a.slot,state:a.state,workMotion:a.workMotion,
      x:a.x,z:a.z,abstract:a.abstract,carry:a.carry,home:a.home.id,blockedAge:a.blockedAge,routeEpoch:a.routeEpoch}));
  }
  function buildingGeometry(id){const model=models.get(id);return model?{
    colliders:model.colliders.length,workstations:model.workstations.length,
    stockPoints:model.stockPoints
  }:null}
  return {register,update,sync,setLanguage,getLabels,readStats,snapshot,buildingGeometry,dispose,blocked,capacity:totalCapacity,limit:employeeLimit};
}
