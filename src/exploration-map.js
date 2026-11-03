// Persistent exploration at 12m resolution: cheap to save and independent of loaded chunks.
export function createExplorationMap({canvas,overlay,player,biome,buildings,agents=()=>[],settings,onDiscover}){
  const ctx=canvas.getContext('2d',{alpha:false});
  const cell=12,discovered=new Set();
  let viewX=player.position.x,viewZ=player.position.z,scale=2.0,visible=false;
  let pressed=false,pointerX=0,pointerY=0,lastVisitX=Infinity,lastVisitZ=Infinity,refreshClock=0;
  const colors=['#488756','#87938b','#b88f6b','#e3c67c','#c8b64e'];
  const key=(x,z)=>x+','+z;
  function load(saved){
    discovered.clear();
    if(Array.isArray(saved))for(const k of saved){
      if(typeof k==='string'&&/^-?\d+,-?\d+$/.test(k))discovered.add(k);
    }
  }
  function visit(x,z){
    if(Math.hypot(x-lastVisitX,z-lastVisitZ)<cell*.35)return;
    lastVisitX=x;lastVisitZ=z;let fresh=false;
    const ix=Math.floor(x/cell),iz=Math.floor(z/cell);
    for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++){
      if(a*a+b*b>10)continue;
      const k=key(ix+a,iz+b);
      if(!discovered.has(k)){discovered.add(k);fresh=true}
    }
    if(fresh)onDiscover?.([...discovered]);
  }
  function paint(){
    if(!visible)return;
    const w=canvas.width,h=canvas.height;
    ctx.fillStyle='#0b171b';ctx.fillRect(0,0,w,h);
    const left=viewX-w/(2*scale),top=viewZ-h/(2*scale);
    const minX=Math.floor(left/cell),maxX=Math.ceil((viewX+w/(2*scale))/cell);
    const minZ=Math.floor(top/cell),maxZ=Math.ceil((viewZ+h/(2*scale))/cell);
    for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){
      if(!discovered.has(key(x,z)))continue;
      const bx=x*cell,bz=z*cell,b=biome(bx+cell/2,bz+cell/2);
      const px=(bx-left)*scale,py=(bz-top)*scale;
      ctx.fillStyle=b<0?'#598654':colors[b]||colors[0];
      ctx.fillRect(Math.floor(px),Math.floor(py),Math.ceil(cell*scale)+1,Math.ceil(cell*scale)+1);
    }
    // Mark only explored, visible places; live agents update without revealing fog.
    const dot=(item,color,radius)=>{
      if(!Number.isFinite(item.x)||!Number.isFinite(item.z))return;
      if(!discovered.has(key(Math.floor(item.x/cell),Math.floor(item.z/cell))))return;
      const x=(item.x-left)*scale,y=(item.z-top)*scale;
      if(x<0||y<0||x>w||y>h)return;
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#11282a';ctx.lineWidth=1;ctx.stroke();
    };
    for(const b of buildings())dot(b,'#ffe08e',3.7);
    for(const agent of agents())dot(agent,'#77e8ed',2.4);
    function marker(x,z,color,radius){
      const px=(x-left)*scale,py=(z-top)*scale;
      if(px<0||py<0||px>w||py>h)return;
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,py,radius,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#071317';ctx.lineWidth=2;ctx.stroke();
    }
    marker(0,0,'#f7c866',7);
    marker(player.position.x,player.position.z,'#ffffff',5);
    ctx.textAlign='left';ctx.textBaseline='top';ctx.font='bold 12px sans-serif';
    ctx.fillStyle='#fff1cf';const sx=(0-left)*scale,sz=(0-top)*scale;
    if(sx>=0&&sz>=0&&sx<w&&sz<h)ctx.fillText('SPAWN',sx+10,sz-10);
    document.getElementById('worldMapCoords').textContent=
      'X '+Math.round(viewX)+' · Z '+Math.round(viewZ)+' · '+Math.round(scale*100)+'%';
  }
  function update(dt){
    if(!visible)return;
    refreshClock+=Math.max(0,dt||0);
    if(refreshClock>=.20){refreshClock=0;paint()}
  }
  function setVisible(value){
    visible=!!value;overlay.classList.toggle('hidden',!visible);
    if(visible){refreshClock=0;viewX=player.position.x;viewZ=player.position.z;paint()}
  }
  function zoom(delta){
    scale=Math.min(8,Math.max(.35,scale*(delta>0?1.25:.8)));paint();
  }
  canvas.addEventListener('pointerdown',e=>{
    pressed=true;pointerX=e.clientX;pointerY=e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pressed)return;
    const rect=canvas.getBoundingClientRect(),factorX=canvas.width/rect.width,factorY=canvas.height/rect.height;
    viewX-=(e.clientX-pointerX)*factorX/scale;
    viewZ-=(e.clientY-pointerY)*factorY/scale;
    pointerX=e.clientX;pointerY=e.clientY;paint();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])
    canvas.addEventListener(name,()=>{pressed=false});
  canvas.addEventListener('wheel',e=>{if(!visible)return;e.preventDefault();zoom(e.deltaY<0?1:-1)},{passive:false});
  document.getElementById('worldMapClose').onclick=()=>setVisible(false);
  document.getElementById('worldMapZoomIn').onclick=()=>zoom(1);
  document.getElementById('worldMapZoomOut').onclick=()=>zoom(-1);
  document.getElementById('worldMapCenter').onclick=()=>{viewX=player.position.x;viewZ=player.position.z;paint()};
  return {load,visit,paint,update,setVisible,get visible(){return visible},get count(){return discovered.size}};
}
