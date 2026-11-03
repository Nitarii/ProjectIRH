import {makeStructure} from './structures.js?v=20261103v';
import {createRouter} from './navigation.js';
import {workstation,storagePoint} from './factory-tasks.js?v=20261103v';

export function createIndustry(T, scene, st, resources, biome, sale, values, hooks={}) {
  const agents=[], buildings=st.buildings;
  const byId=new Map(), models=new Map(), totalCapacity=100, employeeLimit=5;
  const colors=[0x438258,0x8c9a9d,0x7d889e,0xd4a772,0xaaa36c];
  const outfits={
    worker:0x477365, factory:0x486f8c, transport:0xb58748, seller:0x7964a3
  };
  const resourcesColors=[0xa87849,0x8b9398,0x6496b4,0xdcc58b,0xcdb451];
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
  let lastStats={employees:0,visible:0,carrying:0,transports:0,delivered:0,sold:0,soldRaw:0,soldProcessed:0,processed:0};
  const num=n=>Number.isFinite(+n)?Math.max(0,+n):0;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const isPresent=b=>b&&byId.get(b.id)===b;
  const limited=(n,max=totalCapacity)=>Math.max(0,Math.min(max,n));
  function ensure(b){
    if(!b.id)b.id='b'+nextId++;
    if(b.id.startsWith('b'))nextId=Math.max(nextId,(Number(b.id.slice(1))||0)+1);
    b.type=Number.isInteger(b.type)?Math.max(0,Math.min(4,b.type)):Math.max(0,biome(b.x,b.z));
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
    parts.load=carried;parts.group=g;
    scene.add(g);return parts;
  }
  function removeView(a){
    if(!a.view)return;
    scene.remove(a.view.group);
    a.view=null;
  }
  function addAgent(b,i){
    const role=b.kind==='worker'?'worker':b.kind==='factory'?'factory':b.kind==='transport'?'transport':'seller';
    agents.push({id:b.id+'-'+i,home:b,role,x:b.x+(i-2)*.82,z:b.z+3.65,slot:i,
      state:'idle',target:null,targetBuilding:null,receiver:null,goal:null,carry:0,carryType:b.type,
      processed:false,timer:0,wait:0,walkPhase:i,angle:0,view:null,selectionCooldown:0,route:null,waypoint:0,goalKey:'',routeCooldown:0,abstract:false,workMotion:'inspect',workElapsed:0});
  }
  function reconcile(){
    for(const b of buildings)ensure(b);
    const desired=new Set();
    for(const b of buildings)for(let i=0;i<b.workers;i++){
      const id=b.id+'-'+i;desired.add(id);
      if(!agents.some(a=>a.id===id))addAgent(b,i);
    }
    for(let i=agents.length-1;i>=0;i--){
      const a=agents[i];
      if(!desired.has(a.id)){
        if(a.carry>0)refundCargo(a);
        removeView(a);agents.splice(i,1);
      }
    }
  }
  function homePort(b,i=0){return {x:b.x+(i-2)*.80,z:b.z+3.7}}
  function nearPoint(target,approach=1.25,from=null){
    const fx=from?.x??0,fz=from?.z??0;
    const dx=fx-target.x,dz=fz-target.z,len=Math.max(.001,Math.hypot(dx,dz));
    return {x:target.x+dx/len*approach,z:target.z+dz/len*approach};
  }

  function blockers(x,z,agent,goal){
    const radius=.33;
    for(const b of buildings){
      const dx=Math.abs(x-b.x),dz=Math.abs(z-b.z);
      if(dx<2.04+radius&&dz<1.95+radius)return true;
    }
    for(const r of resources){
      if(r.dead||r===agent.target)continue;
      const rad=[.7,1.05,1,.78,.5][r.type]+radius;
      if((x-r.x)**2+(z-r.z)**2<rad*rad)return true;
    }
    return false;
  }
  function walk(a,goal,dt,speed=2.65){
    if(!goal)return false;
    a.routeCooldown=Math.max(0,(a.routeCooldown||0)-dt);
    const distanceToGoal=distance(a,goal);
    if(distanceToGoal<.37){a.route=null;a.wait=0;return true}
    const key=goal.x.toFixed(1)+':'+goal.z.toFixed(1);
    if(!a.route||a.goalKey!==key||a.waypoint>=a.route.length){
      if(a.routeCooldown>0)return false;
      const router=createRouter((x,z)=>blockers(x,z,a,goal),{cell:1.2,maxVisits:1600});
      a.route=router.route(a,goal);
      a.waypoint=0;a.goalKey=key;a.routeCooldown=1.1;
      if(!a.route){a.wait+=dt;return false}
    }
    let waypoint=a.route[a.waypoint];
    if(!waypoint){a.route=null;return false}
    if(distance(a,waypoint)<.30&&a.waypoint<a.route.length-1){
      a.waypoint++;waypoint=a.route[a.waypoint];
    }
    const dx=waypoint.x-a.x,dz=waypoint.z-a.z,len=Math.hypot(dx,dz);
    if(len<.001){a.waypoint++;return false}
    const step=Math.min(len,dt*speed);
    const nx=a.x+dx/len*step,nz=a.z+dz/len*step;
    if(blockers(nx,nz,a,goal)){
      a.route=null;a.routeCooldown=.4;a.wait+=dt;
      return false;
    }
    a.wait=0;a.x=nx;a.z=nz;
    a.angle=Math.atan2(dx,dz);a.walkPhase+=dt*11;
    return distance(a,goal)<.38;
  }
  function reserveResource(a){
    const b=a.home;
    let best=null,score=Infinity;
    for(const r of resources){
      if(r.dead||r.type!==b.type||r.workerClaim&&r.workerClaim!==a.id)continue;
      const d=distance(r,b);
      if(d>55||d<2.5)continue;
      if(d<score){best=r;score=d}
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
    else if(isPresent(source))source.stockRaw=limited(source.stockRaw+a.carry);
    a.carry=0;
  }
  function idle(a,delay=.5){
    release(a);a.state='idle';a.goal=null;a.targetBuilding=null;a.receiver=null;a.route=null;a.waypoint=0;
    a.timer=0;a.selectionCooldown=delay;a.wait=0;
  }
  function beginHarvester(a){
    if(a.home.stockRaw>=totalCapacity)return;
    const target=reserveResource(a);
    if(!target){if(distance(a.home,viewer)>80){a.state='remoteGather';a.timer=0}return}
    a.target=target;a.goal=nearPoint(target,[.95,1.3,1.2,1.1,.85][a.home.type],a);
    a.state='toResource';a.timer=0;
  }
  function findTransport(a){
    let best=null,score=Infinity;
    for(const origin of buildings){
      if(origin.kind!=='worker'||origin.stockRaw<1||distance(a.home,origin)>125)continue;
      for(const dest of buildings){
        if(dest.kind!=='factory'||dest.type!==origin.type||distance(origin,dest)>145)continue;
        const free=totalCapacity-dest.inputRaw;
        if(free<=0)continue;
        const cost=distance(a.home,origin)+distance(origin,dest)*.65;
        if(cost<score){score=cost;best={origin,dest}}
      }
    }
    if(!best)return;
    a.targetBuilding=best.origin;a.receiver=best.dest;a.goal=storagePoint(best.origin,false);
    a.state='toPickup';a.carryType=best.origin.type;a.processed=false;
  }
  function findSeller(a){
    const choices=buildings.filter(b=>distance(a.home,b)<=160);
    const processed=choices.filter(b=>b.kind==='factory'&&b.stockProcessed>0);
    const raw=choices.filter(b=>b.kind==='worker'&&b.stockRaw>0);
    // Always choose any available processed goods before raw materials.
    const pool=processed.length?processed:raw;
    if(!pool.length)return;
    pool.sort((x,y)=>distance(a.home,x)-distance(a.home,y));
    const b=pool[0];
    a.targetBuilding=b;a.processed=processed.length>0;a.carryType=b.type;
    a.goal=storagePoint(b,a.processed);a.state='toPickup';
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
    target.hp=Math.max(0,target.hp-amount);
    if(target.hp<=0){
      target.dead=true;target.mesh.visible=false;
      target.recoverAt=time+210;release(a);
    }else release(a);
    a.goal=storagePoint(a.home,false);a.state='toHome';
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
      else if(a.role==='factory'){a.state='operate';a.goal={x:a.home.x+1.1,z:a.home.z+2.5}}
      a.selectionCooldown=.7;return;
    }
    if(a.wait>9){if(a.carry)refundCargo(a);idle(a,1.8);a.wait=0;return}
    if(a.state==='operate'){
      if(!walk(a,a.goal,dt,2.1))return;
      if(a.home.inputRaw>0&&a.home.stockProcessed<totalCapacity){
        a.timer+=dt;
        if(a.timer>=2.8){
          const n=Math.min(Math.floor(a.timer/2.8),a.home.inputRaw,totalCapacity-a.home.stockProcessed);
          a.home.inputRaw-=n;a.home.stockProcessed+=n;a.timer%=2.8;
          lastStats.processed+=n;hooks.onProcess?.(a.home,n);
        }
      }else a.timer=0;
      return;
    }
    if(a.state==='toResource'){
      if(!a.target||a.target.dead||!resources.includes(a.target)){idle(a,.6);return}
      if(walk(a,a.goal,dt)){a.state='gather';a.timer=0}return;
    }
    if(a.state==='gather'){gather(a,dt);return}
    if(a.state==='toHome'){
      if(walk(a,a.goal,dt)){a.home.stockRaw=limited(a.home.stockRaw+a.carry);a.carry=0;idle(a,.4)}
      return;
    }
    if(a.state==='toPickup'){
      if(!isPresent(a.targetBuilding)||a.role==='transport'&&!isPresent(a.receiver)){idle(a,1);return}
      if(!walk(a,a.goal,dt))return;
      const b=a.targetBuilding;
      if(a.role==='transport'){
        const n=Math.min(6+3*a.home.carryLevel,b.stockRaw,totalCapacity-a.receiver.inputRaw);
        if(n<=0){idle(a,.7);return}
        b.stockRaw-=n;a.carry=n;a.carryType=b.type;a.goal=storagePoint(a.receiver,false);
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
      const amount=a.carry*values[a.carryType]*(a.processed?3:1);
      if(amount>0){st.gold+=amount;lastStats.sold+=amount;
        if(a.processed)lastStats.soldProcessed+=amount;else lastStats.soldRaw+=amount;
        hooks.onSale?.(amount,a)}
      a.carry=0;a.state='returnHome';a.goal=homePort(a.home,a.slot);return;
    }
    if(a.state==='returnHome'&&walk(a,a.goal,dt))idle(a,.5);
  }
  function visibleDistance(a,px,pz){return (a.x-px)**2+(a.z-pz)**2}
  function animate(a,dt,px,pz){
    const nearby=visibleDistance(a,px,pz)<65*65;
    if(!nearby){removeView(a);return false}
    if(!a.view)a.view=createView(a);
    const v=a.view,g=v.group;
    const walking=/^to|returnHome/.test(a.state);
    g.position.set(a.x,Math.sin(a.walkPhase*2)*.025*(walking?1:0),a.z);
    const diff=Math.atan2(Math.sin(a.angle-g.rotation.y),Math.cos(a.angle-g.rotation.y));
    g.rotation.y+=diff*Math.min(1,dt*11);
    const stride=walking?Math.sin(a.walkPhase)*.53:0;
    v.leftLeg.rotation.x=stride;v.rightLeg.rotation.x=-stride;
    const working=a.state==='gather'||a.state==='operate';
    const beat=Math.sin(time*(a.role==='factory'?7:5)+a.id.length);
    if(a.state==='gather'){
      const type=a.home.type;
      v.leftArm.rotation.x=type===2?-1.05:-.54+beat*.24;
      v.rightArm.rotation.x=type===0?-1.25+beat*.85:
          type===1?-1.75+beat*.9:type===2?-1.33+beat*.1:
          type===3?-.9+beat*.6:-.7;
      v.rightArm.rotation.y=type===4?beat*.8:0;
      v.tool.rotation.z=type===4?beat*.45:0;
      g.rotation.z=type===1?beat*.035:0;
    }else{
      v.leftArm.rotation.x=working?-.76+beat*.4:walking?-stride*.5:-.13;
      v.rightArm.rotation.x=working?-1.08+beat*.62:walking?stride*.5:-.16;
      v.rightArm.rotation.y=0;v.tool.rotation.z=0;g.rotation.z=0;
    }
    v.load.visible=a.carry>0;
    if(a.carry>0){
      for(const mesh of v.load.children)mesh.material=cargoMaterials[a.carryType];
    }
    return true;
  }
  function register(b){ensure(b);reconcile();return b.mesh}
  function update(dt,px,pz){
    time+=dt;planningClock+=dt;viewer={x:px,z:pz};
    if(planningClock>=.30){reconcile();planningClock=0}
    for(const r of resources)if(r.dead&&r.recoverAt&&time>=r.recoverAt){
      r.dead=false;r.hp=r.max;r.recoverAt=0;r.workerClaim=null;r.mesh.visible=true;
    }
    let shown=0,transporting=0,carrying=0;
    for(const a of agents){
      updateAgent(a,dt);
      if(animate(a,dt,px,pz))shown++;
      if(a.carry>0)carrying++;
      if(a.role==='transport'&&a.carry>0)transporting++;
    }
    for(const b of buildings){
      b.stock=b.kind==='worker'?b.stockRaw:b.kind==='factory'?b.stockProcessed:0;
      const model=models.get(b.id);
      if(model&&distance(b,{x:px,z:pz})<95*1.5){
        model.group.visible=true;model.update(time,true);
      }else if(model)model.group.visible=false;
    }
    lastStats.employees=agents.length;lastStats.visible=shown;lastStats.carrying=carrying;lastStats.transports=transporting;
    return lastStats;
  }
  function sync(){for(const b of buildings)ensure(b);reconcile()}
  function readStats(){return {...lastStats}}
  function dispose(){for(const a of agents)removeView(a)}
  return {register,update,sync,readStats,dispose,capacity:totalCapacity,limit:employeeLimit};
}
