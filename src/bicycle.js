// Lightweight articulated city/utility bicycle, parented to the player.
// Reusable cylinders and instanced spokes minimize GPU draw calls.
export function createBicycle(T,parent){
 const group=new T.Group();
 parent.add(group);
 group.visible=false;
 const metal=new T.MeshStandardMaterial({color:0x2d7273,metalness:.55,roughness:.42});
 const chrome=new T.MeshStandardMaterial({color:0xb2bec0,metalness:.82,roughness:.29});
 const rubber=new T.MeshStandardMaterial({color:0x242b2d,roughness:.94});
 const leather=new T.MeshStandardMaterial({color:0x423a33,roughness:.95});
 const reflector=new T.MeshStandardMaterial({color:0xffe0a0,emissive:0xb67c25,emissiveIntensity:.2});
 const spokeMaterial=new T.MeshBasicMaterial({color:0xbfc8ca});
 const frameGeometry=new T.CylinderGeometry(.043,.043,1,8);
 const thinGeometry=new T.CylinderGeometry(.025,.025,1,7);
 const wheelR=.49;
 function tube(from,to,material=metal,radius='frame',host=group){
  const direction=new T.Vector3().subVectors(new T.Vector3(...to),new T.Vector3(...from));
  const length=direction.length();
  const mesh=new T.Mesh(radius==='thin'?thinGeometry:frameGeometry,material);
  mesh.position.set((from[0]+to[0])*.5,(from[1]+to[1])*.5,(from[2]+to[2])*.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
  mesh.scale.set(1,length,1);
  host.add(mesh);
  return mesh;
 }
 const wheels=[];
 for(const z of [-.96,.96]){
  const wheel=new T.Group();wheel.position.set(0,wheelR,z);group.add(wheel);
  const tire=new T.Mesh(new T.TorusGeometry(wheelR,.066,7,32),rubber);
  tire.rotation.y=Math.PI/2;wheel.add(tire);
  const rim=new T.Mesh(new T.TorusGeometry(wheelR-.055,.016,5,32),chrome);
  rim.rotation.y=Math.PI/2;wheel.add(rim);
  const axle=new T.Mesh(new T.CylinderGeometry(.08,.08,.15,10),chrome);
  axle.rotation.z=Math.PI/2;wheel.add(axle);
  const spokes=new T.InstancedMesh(thinGeometry,spokeMaterial,24);
  spokes.instanceMatrix.setUsage(T.StaticDrawUsage);
  const dummy=new T.Object3D();
  for(let i=0;i<24;i++){
   const angle=i*Math.PI/12;
   dummy.position.set(i%2?.035:-.035,Math.cos(angle)*wheelR*.49,Math.sin(angle)*wheelR*.49);
   const dir=new T.Vector3(0,Math.cos(angle),Math.sin(angle));
   dummy.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);
   dummy.scale.set(.42,wheelR-.075,.42);
   dummy.updateMatrix();spokes.setMatrixAt(i,dummy.matrix);
  }
  spokes.instanceMatrix.needsUpdate=true;
  wheel.add(spokes);
  wheels.push(wheel);
 }
 const rear=[0,wheelR,-.96],front=[0,wheelR,.96],
  crank=[0,.53,-.08],seat=[0,1.20,-.46],head=[0,1.14,.59];
 for(const [a,b] of [
   [rear,crank],[rear,seat],[seat,crank],[seat,head],[crank,head],
   [head,front],[[0,1.12,.57],front]
 ])tube(a,b);
 // Reusable handle grips and brake levers.
 tube([-.38,1.42,.65],[.38,1.42,.65],chrome);
 tube([0,1.42,.65],[0,1.12,.61],metal);
 for(const side of [-1,1]){
  tube([side*.30,1.41,.64],[side*.47,1.41,.66],rubber,'thin');
  tube([side*.37,1.41,.66],[side*.40,1.30,.74],chrome,'thin');
 }
 const saddle=new T.Mesh(new T.BoxGeometry(.51,.095,.33),leather);
 saddle.position.set(0,1.24,-.48);group.add(saddle);
 tube([0,1.26,-.48],[0,.73,-.33],chrome);
 // Chainring and chain line are visible from both sides.
 const crankRing=new T.Mesh(new T.TorusGeometry(.18,.031,6,20),chrome);
 crankRing.position.set(.17,.53,-.08);crankRing.rotation.y=Math.PI/2;group.add(crankRing);
 const backRing=new T.Mesh(new T.TorusGeometry(.10,.024,6,16),chrome);
 backRing.position.set(.16,.53,-.96);backRing.rotation.y=Math.PI/2;group.add(backRing);
 for(const height of [.14,-.14])
  tube([.175,.53+height,-.92],[.175,.53+height,-.10],rubber,'thin');
 const pedals=new T.Group();pedals.position.set(0,.53,-.08);group.add(pedals);
 for(const sign of [-1,1]){
  tube([0,0,0],[sign*.26,sign*.20,0],chrome,'thin',pedals);
  const foot=new T.Mesh(new T.BoxGeometry(.28,.065,.23),rubber);
  foot.position.set(sign*.26,sign*.20,0);pedals.add(foot);
 }
 const fenderMat=new T.MeshStandardMaterial({color:0x485f63,metalness:.5,roughness:.5});
 for(const wheel of wheels){
  const arch=new T.Mesh(new T.TorusGeometry(.59,.022,6,24,Math.PI*.83),fenderMat);
  arch.rotation.y=Math.PI/2;
  arch.rotation.x=-Math.PI*.415;
  arch.position.set(0,.03,0);wheel.add(arch);
 }
 const light=new T.Mesh(new T.SphereGeometry(.085,9,7),reflector);
 light.position.set(0,1.16,.94);group.add(light);
 const tail=new T.Mesh(new T.BoxGeometry(.18,.09,.07),
  new T.MeshBasicMaterial({color:0xc8463c}));
 tail.position.set(0,.80,-1.02);group.add(tail);
 let rolling=0;
 function update(dt,speed=0,sprinting=false){
  if(!group.visible)return;
  const step=Math.max(0,Math.min(.065,dt));
  rolling+=Math.max(0,speed)*step;
  for(const wheel of wheels)wheel.rotation.x=-rolling/wheelR;
  pedals.rotation.x=-rolling/1.07;
  group.rotation.z=T.MathUtils.damp(group.rotation.z,
    sprinting?Math.sin(rolling*.9)*.016:0,6,step);
 }
 return {group,update,get distance(){return rolling}};
}
