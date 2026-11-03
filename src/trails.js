// Foot-traffic aging is data-only: no extra road meshes, colliders, or draw calls.
// Every loaded terrain tile blends its existing vertex colors toward earth and stone.
export function createTrails(T,state,world,{cell=2.25,maxRecords=11000,roadLevel=()=>0}={}){
  const entries=state.trails&&typeof state.trails==='object'&&!Array.isArray(state.trails)?state.trails:{};
  state.trails=entries;
  const previous=new Map(),dirty=new Set(),earth=new T.Color('#87785d'),road=new T.Color('#807d72');
  let elapsed=0,changed=false,recordCount=Object.keys(entries).length;
  const key=(x,z)=>Math.floor(x/cell)+','+Math.floor(z/cell);
  const chunkKey=(x,z)=>Math.floor(x/32)+','+Math.floor(z/32);
  const step=(n,a,b)=>Math.max(0,Math.min(1,(n-a)/(b-a)));
  const smooth=n=>n*n*(3-2*n);
  const mark=(x,z)=>{
    for(let dx=-3;dx<=3;dx+=3)for(let dz=-3;dz<=3;dz+=3)
      dirty.add(chunkKey(x+dx,z+dz));
  };
  function recordMovement(id,x,z){
    const last=previous.get(id);
    if(!last){previous.set(id,{x,z});return}
    const distance=Math.hypot(x-last.x,z-last.z);
    if(distance<1.85)return;
    previous.set(id,{x,z});
    const k=key(x,z);
    if(!(k in entries)&&recordCount>=maxRecords)return;
    if(!(k in entries))recordCount++;
    const n=entries[k]||0;
    if(n>=240)return;
    entries[k]=Math.min(240,n+1);
    changed=true;mark(x,z);
  }
  function traffic(x,z){
    const ix=Math.floor(x/cell),iz=Math.floor(z/cell);
    let sum=0,weight=0;
    for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){
      const px=(ix+a+.5)*cell,pz=(iz+b+.5)*cell;
      const dx=x-px,dz=z-pz,dist=Math.hypot(dx,dz);
      const w=Math.max(0,1-dist/(cell*1.9));
      if(!w)continue;
      sum+=(entries[(ix+a)+','+(iz+b)]||0)*w;
      weight+=w;
    }
    return weight?sum/weight:0;
  }
  function paintChunk(c,cx,cz){
    const mesh=c?.root?.children?.[0],geom=mesh?.geometry;
    if(!geom?.attributes?.position||!geom?.attributes?.color)return;
    const pos=geom.attributes.position,colors=geom.attributes.color;
    if(!c.trailColors)c.trailColors=new Float32Array(colors.array);
    const original=c.trailColors;
    const cx0=cx*32+16,cz0=cz*32+16;
    for(let i=0;i<pos.count;i++){
      const x=cx0+pos.getX(i),z=cz0+pos.getZ(i);
      const value=traffic(x,z);
      // Almost invisible initially; dirt after many crossings, paved route much later.
      const worn=smooth(step(value,9,84));
      const paved=smooth(step(value,115,225));
      const constructed=roadLevel(x,z);
      const texture=((Math.sin(x*2.41+z*.8)+Math.cos(z*1.7-x*.6))*.035);
      const base=i*3;
      const dust=Math.max(0,Math.min(.94,worn*(.84+texture)));
      colors.array[base]=original[base]*(1-dust)+earth.r*dust;
      colors.array[base+1]=original[base+1]*(1-dust)+earth.g*dust;
      colors.array[base+2]=original[base+2]*(1-dust)+earth.b*dust;
      colors.array[base]=colors.array[base]*(1-paved*.70)+road.r*paved*.70;
      colors.array[base+1]=colors.array[base+1]*(1-paved*.70)+road.g*paved*.70;
      colors.array[base+2]=colors.array[base+2]*(1-paved*.70)+road.b*paved*.70;
      if(constructed){
        const surf=constructed===2?road:earth,weight=constructed===2?.91:.77;
        const variance=((Math.sin(x*.94+z*.43)+Math.cos(z*1.11-x*.21))*.027);
        colors.array[base]=colors.array[base]*(1-weight)+Math.max(0,surf.r+variance)*weight;
        colors.array[base+1]=colors.array[base+1]*(1-weight)+Math.max(0,surf.g+variance)*weight;
        colors.array[base+2]=colors.array[base+2]*(1-weight)+Math.max(0,surf.b+variance)*weight;
      }
    }
    colors.needsUpdate=true;
  }
  function initChunk(c,cx,cz){paintChunk(c,cx,cz)}
  function update(dt){
    elapsed+=dt;if(elapsed<1.7)return;
    elapsed=0;
    // Rate limited repaint; meshes outside loaded chunks cost nothing.
    let refreshed=0;
    for(const k of dirty){
      dirty.delete(k);
      const c=world.get(k);if(!c)continue;
      const [cx,cz]=k.split(',').map(Number);
      paintChunk(c,cx,cz);
      if(++refreshed>=2)break;
    }
  }
  function invalidate(x,z){mark(x,z);changed=true}
  function clear(){for(const k in entries)delete entries[k];previous.clear();dirty.clear();recordCount=0;changed=true}
  return {recordMovement,initChunk,update,invalidate,traffic,clear,get count(){return recordCount},get changed(){return changed}};
}
