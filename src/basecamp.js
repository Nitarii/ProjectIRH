export function createBaseCamp(T,scene){
  const group=new T.Group();
  const material=(color,emit=0)=>new T.MeshLambertMaterial({color,emissive:emit,emissiveIntensity:emit?.36:0});
  const stone=material(0xa0a394),stoneDark=material(0x656e63),wood=material(0x895a37),metal=material(0x394d4e),
    canvas=material(0xd5c2a1),gold=material(0xf7c277,0xf3ac34),green=material(0x668369);
  function box(w,h,d,m,x,y,z){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z);mesh.castShadow=h>.6;mesh.receiveShadow=true;group.add(mesh);return mesh}
  function cylinder(r1,r2,h,m,x,y,z){const mesh=new T.Mesh(new T.CylinderGeometry(r1,r2,h,8),m);
    mesh.position.set(x,y,z);mesh.castShadow=h>.6;group.add(mesh);return mesh}
  // Landmark plaza and paths use flat materials rather than tile patterns.
  box(18,.10,17,stoneDark,0,-.03,0);
  box(16,.10,15,stone,0,.03,0);
  box(5,.06,30,stoneDark,0,.035,13);
  box(13,.07,4,stoneDark,9,.038,0);
  for(let z of [-7,7]){
    for(let i=-6;i<=6;i+=2){box(1.2,.25,.28,wood,i,.28,z)}
  }
  // An elaborate trading pavilion with hanging awning.
  box(5.1,1.85,2.8,wood,0,1.01,-2.6);
  const roof=box(6.5,.27,4.8,canvas,0,2.20,-2.7);
  roof.rotation.z=.08;
  box(4.9,.78,.7,stoneDark,0,.74,-.81);
  for(let x of [-2.3,2.3])cylinder(.13,.13,2.65,wood,x,1.38,-.45);
  for(let x of [-1.5,0,1.5])box(1,.4,.65,green,x,1.35,-.44);
  for(let i=0;i<5;i++){
    const boxMesh=box(.55,.55,.54,wood,-1.8+i*.95,.41,1.55);
    boxMesh.rotation.y=i*.25;
  }
  // Compass marker, lanterns and ramps make spawn immediately recognizable.
  cylinder(1.10,1.24,.33,stoneDark,-5,.22,3.8);
  cylinder(.43,.60,2.45,stone,-5,1.48,3.8);
  const crystal=new T.Mesh(new T.OctahedronGeometry(.73),gold);
  crystal.position.set(-5,3.04,3.8);crystal.castShadow=true;group.add(crystal);
  const lanterns=[];
  for(const [x,z] of [[-7,-4],[-7,6],[7,-4],[7,6],[3,7],[-3,7]]){
    cylinder(.095,.12,3.0,metal,x,1.5,z);
    box(.48,.57,.48,stoneDark,x,3.1,z);
    const lamp=box(.33,.38,.33,gold,x,3.1,z);
    lanterns.push(lamp);
  }
  for(let x of [-7.8,7.8]){
    for(let z of [-6,-3,0,3,6])if(Math.abs(z)>2){
      cylinder(.1,.13,1.08,wood,x,.59,z);
      box(.18,.17,2,wood,x,.92,z);
    }
  }
  // The sale area is purposefully kept clear.
  for(let i=0;i<4;i++){
    const x=-8+i*1.0;
    cylinder(.4,.46,.76,wood,x,.40,-8);
    box(.67,.13,.67,metal,x,.77,-8);
  }
  scene.add(group);
  return {update(t){
    crystal.rotation.y=t*.36;
    for(let i=0;i<lanterns.length;i++)lanterns[i].scale.y=1+Math.sin(t*4+i)*.035;
  }};
}
