export function createFieldBuilder(T,biome,hash){
  // One shared draw call for stems and one for wheat ears per loaded field chunk.
  const stemGeometry=new T.CylinderGeometry(.025,.037,.90,4,1);
  const earGeometry=new T.ConeGeometry(.103,.40,5);
  const stemMaterial=new T.MeshLambertMaterial({color:0x8d9654,side:T.DoubleSide});
  const earMaterial=new T.MeshLambertMaterial({color:0xf1ce79,side:T.DoubleSide});
  const dummy=new T.Object3D();
  const colors=[new T.Color(0xd8b45a),new T.Color(0xe7c76d),new T.Color(0xf5db8a),new T.Color(0xb7ad62)];
  const quarter=4;
  return function populateField(cx,cz,root){
    const plants=[],x0=cx*32,z0=cz*32;
    for(let i=0;i<8;i++)for(let j=0;j<8;j++){
      const tileX=x0+i*4+2,tileZ=z0+j*4+2;
      if(biome(tileX,tileZ)!==4||Math.hypot(tileX,tileZ)<23)continue;
      const row=(j+cx*4)%12;
      for(let k=0;k<quarter;k++)for(let l=0;l<quarter;l++){
        if(row===0&&k===0)continue; // narrow traversable crop lines
        const seed=i*771+j*921+k*19+l*29+cx*331+cz*171;
        const x=x0+i*4+.24+(k+.4+hash(seed,j,30)*.25)*.91;
        const z=z0+j*4+.24+(l+.4+hash(seed,i,31)*.25)*.91;
        const h=.91+hash(seed,cz,32)*.46;
        plants.push({x,z,h,lean:(hash(seed,1,35)-.5)*.13,color:colors[Math.floor(hash(seed,2,36)*colors.length)]})
      }
    }
    if(!plants.length)return;
    const stems=new T.InstancedMesh(stemGeometry,stemMaterial,plants.length);
    const ears=new T.InstancedMesh(earGeometry,earMaterial,plants.length);
    stems.castShadow=false;stems.receiveShadow=false;ears.castShadow=false;ears.receiveShadow=false;
    plants.forEach((p,i)=>{
      dummy.position.set(p.x,p.h*.49,p.z);dummy.rotation.set(0,0,p.lean);
      dummy.scale.set(1,p.h/.90,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
      dummy.position.set(p.x+p.lean*.3,p.h+.06,p.z);
      dummy.rotation.set(p.lean*.35,hash(i,cx,44)*Math.PI*2,p.lean);
      dummy.scale.set(.85,1,1);dummy.updateMatrix();ears.setMatrixAt(i,dummy.matrix);
      ears.setColorAt(i,p.color);
    });
    stems.instanceMatrix.needsUpdate=true;ears.instanceMatrix.needsUpdate=true;
    if(ears.instanceColor)ears.instanceColor.needsUpdate=true;
    root.add(stems,ears);
  }
}
