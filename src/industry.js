import {makeStructure} from './structures.js';

export function createIndustry(T, scene, st, resources, biome, sale, values, hooks={}) {
  const agents=[], buildings=st.buildings;
  const byId=new Map(), models=new Map(), totalCapacity=100, employeeLimit=8;
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
  let nextId=1,time=0,planningClock=0,viewer={x:0,z:0};
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
    const carried=part(loadGeometry,cargoMaterials[agent.home.type],0,1.09,.4);
    carried.visible=false;parts.load=carried;parts.group=g;
    scene.add(g);return parts;
  }
  function removeView(a){
    if(!a.view)return;
    scene.remove(a.view.group);
    a.view=null;
  }
  function addAgent(b,i){
    const role=b.kind==='worker'?'worker':b.kind==='factory'?'factory':b.kind==='transport'?'transport':'seller';
    agents.push({id:b.id+'-'+i,home:b,role,x:b.x+(i%3-1)*.32,z:b.z+2.35+(i%2)*.22,
      state:'idle',target:null,targetBuilding:null,receiver:null,goal:null,carry:0,carryType:b.type,
      processed:false,timer:0,wait:0,walkPhase:i,angle:0,view:null,selectionCooldown:0});
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
  function homePort(b,i=0){return {x:b.x+(i%3-1)*.28,z:b.z+2.45}}
  function nearPoint(target,approach=1.25,from=null){
    const fx=from?.x??0,fz=from?.z??0;
    const dx=fx-target.x,dz=fz-target.z,len=Math.max(.001,Math.hypot(dx,dz));
    return {x:target.x+dx/len*approach,z:target.z+dz/len*approach};
  }
  function blockers(x,z,agent,goal){
    for(const b of buildings) {
      if(Math.abs(x-b.x)<2.1&&Math.abs(z-b.z)<2.05){
        // Doors face local +Z; agents do not walk through walls.
        if(Math.abs(goal?.x-b.x)<2.7&&Math.abs(goal?.z-b.z)<2.8&&z>b.z+1.7)continue;
        return true;
      }
    }
    for(const r of resources){
      if(r.dead||r===agent.target)continue;
      const d=[.76,1.05,1,.8,.6][r.type]+.33;
      if((x-r.x)**2+(z-r.z)**2<d*d)return true;
    }
    return false;
  }
  function walk(a,goal,dt,speed=2.65){
    if(!goal)return false;
    const dx=goal.x-a.x,dz=goal.z-a.z,dist=Math.hypot(dx,dz);
    if(dist<.32)return true;
    const vx=dx/dist,vz=dz/dist,step=Math.min(dist,dt*speed);
    const turns=[0,.52,-.52,1.1,-1.1,1.58,-1.58,3.14];
    let next=null;
    for(const angle of turns){
      const rx=vx*Math.cos(angle)-vz*Math.sin(angle),rz=vx*Math.sin(angle)+vz*Math.cos(angle);
      const nx=a.x+rx*step,nz=a.z+rz*step;
      if(!blockers(nx,nz,a,goal)){next={x:nx,z:nz,rx,rz};break}
    }
    if(!next){a.wait+=dt;return false}
    a.wait=0;a.x=next.x;a.z=next.z;
    a.angle=Math.atan2(next.rx,next.rz);a.walkPhase+=dt*11;
    return dist<.32+step;
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
    release(a);a.state='idle';a.goal=null;a.targetBuilding=null;a.receiver=null;
    a.timer=0;a.selectionCooldown=delay;
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
    a.targetBuilding=best.origin;a.receiver=best.dest;a.goal=homePort(best.origin);
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
    a.goal=homePort(b);a.state='toPickup';
  }
  function gather(a,dt){
    if(!a.target||a.target.dead||!resources.includes(a.target)){idle(a,.8);return}
    const target=a.target;
    a.timer+=dt;
    if(a.timer<2.2)return;
    a.timer=0;
    const amount=Math.min(2,totalCapacity-a.home.stockRaw);
    if(amount<=0){idle(a,.8);return}
    a.carry=amount;a.carryType=a.home.type;
    target.hp=Math.max(0,target.hp-amount);
    if(target.hp<=0){
      target.dead=true;target.mesh.visible=false;
      target.recoverAt=time+45;release(a);
    }else release(a);
    a.goal=homePort(a.home);a.state='toHome';
  }
  function updateAgent(a,dt){
    if(a.state==='remoteGather'){
      if(distance(a.home,viewer)<70){idle(a,.5);return}
      if(a.home.stockRaw>=totalCapacity){a.timer=0;return}
      a.timer+=dt;
      if(a.timer>=4.8){
        const n=Math.min(Math.floor(a.timer/4.8),totalCapacity-a.home.stockRaw);
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
        const n=Math.min(6,b.stockRaw,totalCapacity-a.receiver.inputRaw);
        if(n<=0){idle(a,.7);return}
        b.stockRaw-=n;a.carry=n;a.carryType=b.type;a.goal=homePort(a.receiver);
        a.state='toFactory';return;
      }
      const available=a.processed?b.stockProcessed:b.stockRaw;
      const n=Math.min(6,available);
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
      a.state='returnHome';a.goal=homePort(a.home);return;
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
      a.carry=0;a.state='returnHome';a.goal=homePort(a.home);return;
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
    v.leftArm.rotation.x=working?-.8+beat*.62:walking?-stride*.5:-.13;
    v.rightArm.rotation.x=working?-1.4+beat*.8:walking?stride*.5:-.16;
    v.load.visible=a.carry>0;
    if(a.carry>0)v.load.material=cargoMaterials[a.carryType];
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
