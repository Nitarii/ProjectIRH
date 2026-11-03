// node tests/ai-cargo-factory-paths.mjs
// Cargo-preserving anti-stuck relocation and geometry-accurate refinery lanes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const clean=s=>s.replace(/^import[^\n]*\n/gm,'').replace(/^export\s+/gm,'');
let passed=0;
const test=(label,value)=>{assert.ok(value,label);passed++;console.log('✓ '+label)};
const industry=read('src/industry.js');
const begin=industry.indexOf('  function abandonBlockedTask(a){');
const end=industry.indexOf('  function walk(a,goal,dt,speed=2.65){',begin);
assert.ok(begin>=0&&end>begin,'recovery source exists');
let idleCalls=0,moveCalls=0;
const rescue=new Function('staticBlocked','hooks','idle',
  'let stuckRecoveries=0,time=70;const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);'+
  'const homePort=(b)=>({x:b.x,z:b.z});'+
  industry.slice(begin,end)+';return abandonBlockedTask;')(
  (x,z)=>Math.hypot(x,z)<1.12,{onMove(){moveCalls++}},
  ()=>{idleCalls++}
);
const home={x:11,z:12,id:'factory'},receiver={id:'seller',x:22,z:18};
const load={id:'hauler-1',x:0,z:0,home,slot:0,
  carry:9,carryType:3,processed:true,state:'toDelivery',
  targetBuilding:home,receiver,goal:{x:22,z:18},
  route:[{x:5,z:7}],routeGoal:{x:5,z:7},
  wait:8,blockedAge:10,stagnationAge:8};
const original={type:load.carryType,count:load.carry,processed:load.processed,goal:load.goal,
  receiver:load.receiver,source:load.targetBuilding};
rescue(load);
test('repositioned hauler retains the complete cargo',
  load.carry===original.count&&load.carryType===original.type&&
  load.processed===original.processed);
test('repositioning retains target building and delivery destination',
  load.receiver===original.receiver&&load.targetBuilding===original.source&&
  load.goal===original.goal&&load.state==='toDelivery');
test('repositioning repairs coordinates and invalidates only navigation',
  Math.hypot(load.x,load.z)>1.12&&load.route===null&&load.routeGoal===null);
test('loaded agents never enter idle/refund during recovery',
  idleCalls===0&&moveCalls===1);
const empty={x:0,z:0,home,slot:1,carry:0,state:'toResource',
  route:[],goal:{x:10,z:10}};
rescue(empty);
test('idle recovery still handles empty-handed workers',idleCalls===1);
const layout=new Function(clean(read('src/facility-layout.js'))+
  ';return {worldPoint,rotateOffset,normalizeRotation,pointInOrientedRect};')();
const tasks=new Function('worldPoint',clean(read('src/factory-tasks.js'))+
  ';return {FACTORY_TASKS,YARD,yardPoint,storagePoint,factoryWorkPath,factoryOutputPath};')(
  layout.worldPoint);
const decorate=new Function('worldPoint','normalizeRotation','FACTORY_TASKS',
  'YARD','yardPoint','storagePoint',clean(read('src/factory-scene.js'))+
  ';return decorateFacility;')(
  layout.worldPoint,layout.normalizeRotation,tasks.FACTORY_TASKS,
  tasks.YARD,tasks.yardPoint,tasks.storagePoint);
class Position{constructor(){this.x=0;this.y=0;this.z=0}
  set(x,y,z){this.x=x;this.y=y;this.z=z}}
class Geometry{}
class Mesh{constructor(){this.position=new Position();this.rotation=new Position();this.visible=true;}}
class Group{constructor(){this.children=[]}add(item){this.children.push(item)}}
const T={Mesh,BoxGeometry:Geometry,CylinderGeometry:Geometry,
  IcosahedronGeometry:Geometry,Group};
const routerMaker=new Function(clean(read('src/navigation.js'))+';return createRouter;')();
let combinations=0,segments=0,detours=0;
for(let type=0;type<5;type++)for(let quarter=0;quarter<4;quarter++){
  const b={kind:'factory',type,rotation:quarter*Math.PI/2,x:60,z:90};
  const scene=decorate(T,new Group(),b,Array.from({length:6},()=>({})));
  const blocked=(x,z)=>scene.colliders.some(c=>layout.pointInOrientedRect(x,z,c,.59));
  const router=routerMaker(blocked,{cell:1.15,maxVisits:1900});
  for(let slot=0;slot<5;slot++){
    const offset=layout.rotateOffset((slot-2)*.73,Math.abs(slot-2)*.13,b.rotation);
    const raw=tasks.storagePoint(b,false),out=tasks.storagePoint(b,true);
    raw.x+=offset.x;raw.z+=offset.z;out.x+=offset.x;out.z+=offset.z;
    const work=tasks.factoryWorkPath(b,slot);
    const output=tasks.factoryOutputPath(b,slot);
    output[output.length-1]=out;
    const legs=[raw,...work,...output];
    for(let i=0;i<legs.length;i++){
      const p=legs[i];
      assert.equal(blocked(p.x,p.z),false,
        'Blocked factory endpoint '+JSON.stringify({type,quarter,slot,i}));
      if(i===0)continue;
      const prev=legs[i-1],length=Math.hypot(p.x-prev.x,p.z-prev.z);
      for(let j=1,n=Math.ceil(length/.12);j<=n;j++){
        const t=j/n;
        assert.equal(blocked(prev.x+(p.x-prev.x)*t,prev.z+(p.z-prev.z)*t),false,
          'Machine overlaps refinery corridor '+JSON.stringify({type,quarter,slot,i}));
      }
      segments++;
    }
    combinations++;
    // Validate real A* on the machine-heavy center station for every rotation.
    if(slot===2){
      const route=router.route(raw,work[0]);
      assert.ok(route?.length,'Factory left aisle inaccessible '+JSON.stringify({type,quarter}));
      detours++;
    }
  }
}
test('all 100 factory jobs have clear work and output paths',combinations===100);
test('every planned refinery segment is checked at capsule clearance',segments===800);
test('twenty physical factory approach routes are navigable',detours===20);
test('factory lane path survives cargo-safe replan',
  industry.includes('a.factoryPath=null;a.factoryPathIndex=0;')&&
  industry.includes('if(hadCargo){')&&industry.includes('factoryWorkPath(a.home,a.slot)'));
console.log('\nPassed '+passed+' AI recovery and refinery geometry checks.');
