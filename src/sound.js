export function createSound(){
  let ctx=null, master=null, ambient=null, wind=null, windGain=null, nextMusic=0, nextBird=0, notes=0, enabled=true;
  const AC=window.AudioContext||window.webkitAudioContext;
  const gain=(v)=>{const g=ctx.createGain();g.gain.value=v;g.connect(master);return g};
  function note(freq,start,len,volume=.06,wave='sine',out=master){
    if(!ctx||!enabled)return;
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=wave;o.frequency.setValueAtTime(freq,start);
    g.gain.setValueAtTime(.0001,start);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.04);
    g.gain.exponentialRampToValueAtTime(.0001,start+len);
    o.connect(g);g.connect(out);o.start(start);o.stop(start+len+.02);
  }
  function boot(){
    if(!enabled||!AC)return;
    if(ctx){if(ctx.state==='suspended')ctx.resume();return}
    try{
      ctx=new AC();
      master=ctx.createGain();master.gain.value=.32;master.connect(ctx.destination);
      ambient=ctx.createGain();ambient.gain.value=.1;ambient.connect(master);
      wind=ctx.createBufferSource();
      const len=ctx.sampleRate*3,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
      let lp=0;for(let i=0;i<len;i++){lp=lp*.985+(Math.random()*2-1)*.015;d[i]=lp*2}
      wind.buffer=buf;wind.loop=true;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;
      windGain=ctx.createGain();windGain.gain.value=.2;
      wind.connect(filter);filter.connect(windGain);windGain.connect(ambient);wind.start();
      nextMusic=ctx.currentTime+.4;nextBird=ctx.currentTime+5;
    }catch(e){ctx=null}
  }
  function effect(type=0){
    if(!ctx||!enabled)return;
    const t=ctx.currentTime,tones=[155,115,205,90,380];
    if(type==='sale'){note(523,t,.16,.15,'triangle');note(784,t+.1,.23,.16,'triangle');note(1046,t+.2,.29,.1,'sine');return}
    if(type==='ui'){note(460,t,.085,.07,'sine');return}
    if(type==='buy'){note(320,t,.14,.12,'triangle');note(500,t+.08,.21,.11,'sine');return}
    if(type==='step'){note(70+Math.random()*25,t,.065,.03,'triangle');return}
    if(type==='exhausted'){note(160,t,.16,.08,'sine');return}
    if(type==='build'){note(220,t,.16,.12,'triangle');note(330,t+.12,.23,.12,'sine');return}
    const f=tones[Number(type)]||170;
    note(f*(.92+Math.random()*.16),t,.09,.12,Number(type)===2?'sawtooth':'triangle');
    note(f*.55,t+.02,.13,.045,'sine');
  }
  const progression=[0,2,4,7,9,7,4,2],scale=[174.61,196,220,261.63,293.66,329.63,392,440,523.25];
  function update(biome,dt){
    if(!ctx||!enabled)return;
    if(windGain)windGain.gain.setTargetAtTime(biome===3?.32:biome===1?.24:.16,ctx.currentTime,.4);
    let now=ctx.currentTime;
    if(now>=nextMusic){
      const n=progression[notes%progression.length],freq=scale[n];
      note(freq,now,1.9,.021,'sine');
      if(notes%4===0){note(130.81,now,3.1,.013,'triangle');note(196,now,2.8,.011,'sine')}
      notes++;nextMusic=now+2.1;
    }
    if(now>=nextBird){
      if(biome===0||biome===4||biome===-1){
        const f=740+Math.random()*500;
        note(f,now,.13,.065,'sine');note(f*1.19,now+.18,.12,.05,'sine');
      }else if(biome===3){note(450,now,.18,.027,'sine')}
      nextBird=now+7+Math.random()*12;
    }
  }
  function toggle(){
    enabled=!enabled;
    if(ctx){master.gain.setTargetAtTime(enabled?.32:0,ctx.currentTime,.1);if(enabled&&ctx.state==='suspended')ctx.resume()}
    else if(enabled)boot();
    return enabled;
  }
  return {boot,effect,update,toggle,get enabled(){return enabled}};
}
