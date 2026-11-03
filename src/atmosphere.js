export function createAtmosphere(T,scene,player,biomeAt,nearbyResources=null){
const leafColors=[0x81b35a,0xd5b55a,0x82a99b,0xd7c087,0xe8bb67];
const materials=leafColors.map(color=>new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:true,opacity:.72,depthWrite:false}));
const leafGeo=new T.PlaneGeometry(.28,.18),leaves=[],birds=[],clouds=[];
const random=(n,s=0)=>{const v=Math.sin(n*127.13+s*28.93)*43758.545;return v-Math.floor(v)};
for(let i=0;i<34;i++){
const mesh=new T.Mesh(leafGeo,materials[i%materials.length]);mesh.frustumCulled=false;scene.add(mesh);
const a=i*2.3999,r=3+random(i,1)*35;
leaves.push({mesh,angle:a,range:r,height:.55+random(i,2)*6,speed:.25+random(i,4)*.45,seed:i*17.1});
}
const bodyMat=new T.MeshLambertMaterial({color:0x354c4d,side:T.DoubleSide});
const wingGeo=new T.PlaneGeometry(.9,.28);
for(let i=0;i<6;i++){
const group=new T.Group(),left=new T.Mesh(wingGeo,bodyMat),right=new T.Mesh(wingGeo,bodyMat);
const body=new T.Mesh(new T.ConeGeometry(.12,.57,5),bodyMat);
body.rotation.x=Math.PI/2;
left.position.x=-.5;right.position.x=.5;group.add(body,left,right);
scene.add(group);birds.push({group,left,right,phase:i*1.8,orbit:18+i*6,altitude:12+i*2.7,speed:.22+i*.07})
}
const cloudMat=new T.MeshLambertMaterial({color:0xf0f2e6,transparent:true,opacity:.43,depthWrite:false});
for(let i=0;i<6;i++){
const g=new T.Group();
for(let k=0;k<4;k++){
const o=new T.Mesh(new T.IcosahedronGeometry(4+random(i*4+k)*4,1),cloudMat);
o.position.set((k-1.5)*4,random(i*12+k)*2,0);g.add(o)
}scene.add(g);clouds.push({g,seed:i});
}
let wave=0,enabled=true;
function setEnabled(on){enabled=!!on;for(const l of leaves)l.mesh.visible=enabled;for(const b of birds)b.group.visible=enabled;for(const c of clouds)c.g.visible=enabled;}
function update(dt,t,resources){
if(!enabled)return;
wave+=dt;
const px=player.position.x,pz=player.position.z;
const current=biomeAt(px,pz);
for(let i=0;i<leaves.length;i++){
const o=leaves[i],a=o.angle+wave*.04*o.speed,x=px+Math.cos(a)*o.range+Math.sin(wave*.8+o.seed)*3,z=pz+Math.sin(a)*o.range+Math.cos(wave*.5+o.seed)*2;
o.mesh.position.set(x,o.height+Math.sin(wave*1.4+o.seed)*.8,z);
o.mesh.rotation.set(wave*o.speed+o.seed,wave*.35+o.seed,Math.sin(wave+o.seed));
const b=biomeAt(x,z);o.mesh.material=materials[i%3===0?1:0];
o.mesh.visible=current===0&&b===0;
}
for(const b of birds){
const a=wave*b.speed+b.phase;
b.group.position.set(px+Math.cos(a)*b.orbit,b.altitude+Math.sin(a*2)*.8,pz+Math.sin(a)*b.orbit);
b.group.rotation.y=-a;
b.left.rotation.z=Math.sin(wave*9+b.phase)*.48;
b.right.rotation.z=-b.left.rotation.z;
}
for(const c of clouds){
const a=c.seed*2.7;
c.g.position.set(px+Math.sin(a)*75+Math.sin(wave*.018+c.seed)*11,40+c.seed*.6,pz+Math.cos(a)*75)
}
const wind=Math.sin(wave*1.4)*.016;
for(const o of (nearbyResources?nearbyResources():resources)){if(o.dead||Math.abs(o.x-px)>42||Math.abs(o.z-pz)>42)continue;
o.mesh.rotation.z=o.type===0||o.type===4?wind*Math.sin(o.x*.3+o.z*.2+wave):0;
}
}
return {update,setEnabled};
}
