// Soft procedural sky, bounded pseudo-volumetric cloud raymarching and
// continuous day/night lighting. One sky draw + at most 12 cloud draws;
// no per-frame geometries, shadow maps or fullscreen post-processing passes.
const DAY=1440;
const fract=x=>x-Math.floor(x);
const rand=(x,z,seed)=>fract(Math.sin(x*127.1+z*311.7+seed*57.1)*43758.5453);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function solarState(gameMinutes=0){
  const phase=fract(((Number(gameMinutes)||0)+480)/DAY);
  const altitude=Math.sin(phase*6.28318530718-Math.PI*.5);
  const daylight=clamp((altitude+.115)*3.1,0,1);
  const twilight=clamp(1-Math.abs(altitude)*3.5,0,1);
  return {phase,altitude,daylight,twilight};
}
export function createSkyWeather(T,scene,player,camera,sun,ambient,{
  viewDistance=()=>128,quality=()=> 'balanced',seed=1
}={}){
  const skyUniforms={
    uTime:{value:0},uSun:{value:new T.Vector3(.7,.38,.2)},
    uDay:{value:1},uTwilight:{value:0},uNight:{value:0},
    uHorizon:{value:new T.Color(0x9fc6cf)},uDetail:{value:1}
  };
  const skyMaterial=new T.ShaderMaterial({
    uniforms:skyUniforms,side:T.BackSide,depthWrite:false,depthTest:false,
    fog:false,transparent:false,
    vertexShader:`
      varying vec3 vDirection;
      void main(){
        vDirection=normalize(position);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader:`
      uniform float uTime,uDay,uTwilight,uNight,uDetail;
      uniform vec3 uSun,uHorizon;
      varying vec3 vDirection;
      float hash(vec3 p){
        p=fract(p*.1031);p+=dot(p,p.yzx+33.33);
        return fract((p.x+p.y)*p.z);
      }
      float noise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                       mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                       mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      void main(){
        vec3 d=normalize(vDirection);
        float h=clamp(d.y*.85+.20,0.0,1.0);
        vec3 zenith=mix(vec3(.007,.019,.051),vec3(.19,.39,.58),uDay);
        vec3 horizon=mix(vec3(.035,.063,.105),uHorizon,uDay);
        vec3 color=mix(horizon,zenith,smoothstep(0.0,.85,h));
        float towardSun=max(dot(d,normalize(uSun)),0.0);
        float halo=pow(towardSun,14.0)*(.09+.19*uDay);
        color+=vec3(1.0,.60,.32)*halo;
        color+=vec3(.38,.15,.08)*uTwilight*pow(towardSun,4.0)*
               (1.0-smoothstep(.10,.56,max(0.0,d.y)));
        float disk=smoothstep(.9966,.99955,towardSun);
        color=mix(color,vec3(1.0,.88,.68),disk*uDay*.94);
        float moon=smoothstep(.9980,.99970,max(dot(d,-normalize(uSun)),0.0));
        color+=moon*vec3(.50,.59,.72)*uNight;
        color+=pow(max(dot(d,-normalize(uSun)),0.0),38.0)*vec3(.018,.031,.052)*uNight;
        float starCell=hash(floor(d*590.0));
        float stars=step(.9988,starCell)*pow(max(0.0,hash(d*134.0)),3.0);
        color+=vec3(.65,.75,.93)*stars*uNight*clamp(d.y*4.0,0.0,1.0);
        // Subtle upper atmosphere wisps, no pixel-space grain or bloom pass.
        if(uDetail>.5&&d.y>.02){
          float wisps=noise(d*13.0+vec3(uTime*.004,0.0,0.0));
          color+=vec3(.07,.085,.09)*pow(smoothstep(.52,.83,wisps),2.0)*
            uDay*clamp(d.y*2.0,0.0,1.0);
        }
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const sky=new T.Mesh(new T.SphereGeometry(410,28,18),skyMaterial);
  sky.renderOrder=-1000;sky.frustumCulled=false;scene.add(sky);
  const cloudUniforms={
    time:{value:0},light:{value:1},warm:{value:0},
    fogStart:{value:90},fogEnd:{value:128}
  };
  // Fragment-level depth integration through a soft ellipsoid. The shaders
  // evaluate 6 bounded samples only in the small cloud impostor silhouettes.
  const cloudMaterial=new T.ShaderMaterial({
    uniforms:cloudUniforms,transparent:true,depthWrite:false,depthTest:true,
    side:T.DoubleSide,fog:false,
    vertexShader:`
      varying vec2 vUv;
      varying vec3 vAnchor;
      varying float vDistance;
      void main(){
        vUv=uv;
        vec4 world=modelMatrix*vec4(position,1.0);
        vAnchor=(modelMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
        vDistance=length(world.xyz-cameraPosition);
        gl_Position=projectionMatrix*viewMatrix*world;
      }
    `,
    fragmentShader:`
      uniform float time,light,warm,fogStart,fogEnd;
      varying vec2 vUv;
      varying vec3 vAnchor;
      varying float vDistance;
      float hash(vec3 p){
        p=fract(p*.1031);p+=dot(p,p.yzx+31.32);
        return fract((p.x+p.y)*p.z);
      }
      float noise(vec3 p){
        vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1.,0.,0.)),f.x),
                       mix(hash(i+vec3(0.,1.,0.)),hash(i+vec3(1.,1.,0.)),f.x),f.y),
                   mix(mix(hash(i+vec3(0.,0.,1.)),hash(i+vec3(1.,0.,1.)),f.x),
                       mix(hash(i+vec3(0.,1.,1.)),hash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);
      }
      void main(){
        vec2 uv=(vUv-.5)*vec2(2.0,2.2);
        float shape=length(uv);
        if(shape>1.06||vDistance>=fogEnd)discard;
        vec3 seed=vec3(vAnchor.xz*.029,fract(vAnchor.y*.061)*4.0);
        float accum=0.0,lighted=0.0;
        for(int i=0;i<6;i++){
          float layer=float(i)/5.0;
          vec3 p=vec3(uv*2.2,layer*1.8)+seed+
            vec3(time*.018,layer*.14,time*.008);
          float detail=noise(p)+.35*noise(p*2.13);
          float radial=1.0-shape*shape*.93-abs(layer-.46)*.35;
          float density=smoothstep(.44,.86,detail*radial);
          accum+=density;
          lighted+=density*(.69+.31*layer);
        }
        float alpha=(1.0-exp(-accum*.46))*(1.0-smoothstep(.60,1.04,shape));
        float fade=1.0-smoothstep(fogStart,fogEnd,vDistance);
        alpha*=fade*.88;
        if(alpha<.012)discard;
        float shade=lighted/max(.001,accum);
        vec3 day=vec3(.83,.88,.90)*shade+vec3(.09,.10,.11);
        vec3 sunset=vec3(1.0,.71,.49);
        vec3 night=vec3(.15,.21,.30)*shade;
        vec3 color=mix(night,mix(day,sunset,warm*.62),light);
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
  const cloudGeometry=new T.PlaneGeometry(1,1);
  const clouds=[];
  for(let i=0;i<14;i++){
    const mesh=new T.Mesh(cloudGeometry,cloudMaterial);
    mesh.renderOrder=-20;mesh.visible=false;mesh.frustumCulled=true;
    scene.add(mesh);clouds.push(mesh);
  }
  const cloudSites=[];
  let lastCellX=Infinity,lastCellZ=Infinity,lastRange=0,weatherFrame=0;
  function resampleClouds(){
    const pos=player.position,cell=94;
    const cx=Math.floor(pos.x/cell),cz=Math.floor(pos.z/cell),range=viewDistance();
    if(cx===lastCellX&&cz===lastCellZ&&range===lastRange)return;
    lastCellX=cx;lastCellZ=cz;lastRange=range;
    cloudSites.length=0;
    for(let x=cx-2;x<=cx+2;x++)for(let z=cz-2;z<=cz+2;z++){
      if(rand(x,z,seed+4)>.74)continue;
      const px=(x+.5)*cell+(rand(x,z,seed+6)-.5)*72;
      const pz=(z+.5)*cell+(rand(x,z,seed+7)-.5)*72;
      const distance=Math.hypot(px-pos.x,pz-pos.z);
      if(distance>range*1.4)continue;
      cloudSites.push({x:px,z:pz,h:36+rand(x,z,seed+8)*26,
        w:24+rand(x,z,seed+9)*28,scale:.70+rand(x,z,seed+10)*.6,
        dist:distance,seed:rand(x,z,seed+11)});
    }
    cloudSites.sort((a,b)=>a.dist-b.dist);
  }
  const horizon=new T.Color(),dayHorizon=new T.Color(0x98bed0),dusk=new T.Color(0xc88f70);
  const warm=new T.Color(0xffbc7e),daySun=new T.Color(0xffe7cc),
        moon=new T.Color(0x92afd7),nightAmbient=new T.Color(0x879bb9),
        dayAmbient=new T.Color(0xf2f6e9),nightGround=new T.Color(0x344057),
        dayGround=new T.Color(0x657449);
  let lastLightAt=-100,phase=0,daylight=1,cloudQuality=0;
  function update(dt,elapsed,gameMinutes){
    if(dt<0)return;
    const solar=solarState(gameMinutes);
    phase=solar.phase;daylight=solar.daylight;
    const sunAzimuth=phase*6.28318530718;
    const sunDir=skyUniforms.uSun.value;
    sunDir.set(Math.cos(sunAzimuth),solar.altitude,Math.sin(sunAzimuth)).normalize();
    // Smooth exposure transitions, with a readable moonlit night.
    const night=1-daylight;
    horizon.set(0x1d385b).lerp(dayHorizon,daylight);
    horizon.lerp(dusk,solar.twilight*.38);
    skyUniforms.uHorizon.value.copy(horizon);
    skyUniforms.uDay.value=daylight;
    skyUniforms.uDetail.value=quality()==='low'?0:1;
    skyUniforms.uTwilight.value=solar.twilight;
    skyUniforms.uNight.value=night;
    skyUniforms.uTime.value=elapsed;
    cloudUniforms.time.value=elapsed;
    cloudUniforms.light.value=.18+.82*daylight;
    cloudUniforms.warm.value=solar.twilight;
    const range=viewDistance();
    cloudUniforms.fogStart.value=range*.66;
    cloudUniforms.fogEnd.value=range*.99;
    sky.position.copy(camera.position);
    weatherFrame+=dt;
    if(weatherFrame>=.12){
      weatherFrame=0;
      // Reuse existing Color objects; adapt fog to horizon to hide chunk pop-in.
      if(scene.fog)scene.fog.color.copy(horizon);
      if(scene.background?.isColor)scene.background.copy(horizon);
      sun.color.copy(moon).lerp(daySun,daylight).lerp(warm,solar.twilight*.65);
      sun.intensity=.10+2.15*daylight;
      // The same astronomical direction drives both the visible sky
      // discs and directional shadows. At night the moon is opposite the sun.
      const facing=solar.altitude<0?-1:1;
      // Snap the moving shadow volume to stable world steps to suppress
      // shadow-map shimmer while walking; sunlight direction stays continuous.
      const anchorX=Math.round(player.position.x*2)/2;
      const anchorZ=Math.round(player.position.z*2)/2;
      sun.position.set(anchorX+sunDir.x*95*facing,
        Math.max(9,Math.abs(sunDir.y)*95),anchorZ+sunDir.z*95*facing);
      sun.target.position.set(anchorX,0,anchorZ);
      sun.target.updateMatrixWorld();
      if(ambient){
        ambient.intensity=.72+1.65*daylight;
        ambient.color.copy(nightAmbient).lerp(dayAmbient,daylight);
        ambient.groundColor.copy(nightGround).lerp(dayGround,daylight);
      }
    }
    resampleClouds();
    const mode=quality(),count=mode==='low'?0:mode==='high'?14:8;
    for(let i=0;i<clouds.length;i++){
      const mesh=clouds[i],site=i<count?cloudSites[i]:null;
      if(!site){mesh.visible=false;continue}
      mesh.visible=true;
      // Clouds are world-space volumes, not camera-facing billboards.
      // A fixed tilted plane retains a visible underside from most angles;
      // its position, phase and rotation never depend on camera movement.
      mesh.position.set(site.x+elapsed*.27,site.h,site.z+elapsed*.11);
      mesh.scale.set(site.w*site.scale,site.w*.46*site.scale,1);
      mesh.rotation.set(-1.13,site.seed*.32,0);
    }
  }
  function dispose(){
    scene.remove(sky);sky.geometry.dispose();skyMaterial.dispose();
    for(const mesh of clouds)scene.remove(mesh);
    cloudGeometry.dispose();cloudMaterial.dispose();
  }
  return {update,dispose,get dayFactor(){return daylight},
    get cloudCount(){return clouds.filter(c=>c.visible).length},
    get phase(){return phase}};
}
