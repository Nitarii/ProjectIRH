import {createScore} from './music.js';

export function createSound(){
  let ctx=null,master=null,ambient=null,wind=null,windGain=null;
  let enabled=true,volume=.5,nextWind=0,currentBiome=-1,queuedBiome=-1;
  let tracks=[],nextSongAt=Infinity,lastVariation=-1;
  const AC=window.AudioContext||window.webkitAudioContext;
  const outputGain=()=>enabled?Math.min(.95,Math.max(0,volume)*1.46):0;
  function note(freq,start,len,level=.06,wave='sine',out=master,attack=.04){
    if(!ctx||!enabled||!out||!Number.isFinite(freq)||freq<=0||
       !Number.isFinite(start)||!Number.isFinite(len)||len<=.05)return;
    let oscillator=null,env=null;
    try{
      oscillator=ctx.createOscillator();env=ctx.createGain();
      oscillator.type=wave;oscillator.frequency.setValueAtTime(freq,start);
      env.gain.setValueAtTime(.00001,start);
      const fadeIn=Math.max(.018,Math.min(len*.45,attack));
      env.gain.exponentialRampToValueAtTime(Math.max(.00005,level),start+fadeIn);
      env.gain.exponentialRampToValueAtTime(.00001,start+len);
      oscillator.connect(env);env.connect(out);
      oscillator.start(start);oscillator.stop(start+len+.03);
      oscillator.addEventListener('ended',()=>{
        try{oscillator.disconnect();env.disconnect()}catch{}
      },{once:true});
    }catch{
      try{oscillator?.disconnect();env?.disconnect()}catch{}
    }
  }
  function chooseVariation(){
    let next=Math.floor(Math.random()*3);
    if(next===lastVariation)next=(next+1+Math.floor(Math.random()*2))%3;
    lastVariation=next;return next;
  }
  function startSong(biome,startTime){
    const score=createScore(biome,chooseVariation());
    const mixer=ctx.createGain();
    mixer.gain.setValueAtTime(.0001,startTime);
    mixer.gain.linearRampToValueAtTime(.66,startTime+5.5);
    mixer.connect(master);
    const next={score,mixer,start:startTime,cursor:0,stopAt:Infinity};
    for(const track of tracks){
      if(Number.isFinite(track.stopAt))continue;
      track.stopAt=startTime+5.5;
      track.mixer.gain.cancelScheduledValues(startTime);
      track.mixer.gain.setValueAtTime(.66,startTime);
      track.mixer.gain.linearRampToValueAtTime(.0001,track.stopAt);
    }
    tracks.push(next);
    currentBiome=biome;nextSongAt=startTime+score.duration-5.5;
    return next;
  }
  function boot(){
    if(!enabled||!AC)return;
    if(ctx){if(ctx.state==='suspended')ctx.resume().catch(()=>{});return}
    try{
      ctx=new AC();
      master=ctx.createGain();master.gain.value=outputGain();master.connect(ctx.destination);
      ambient=ctx.createGain();ambient.gain.value=.085;ambient.connect(master);
      wind=ctx.createBufferSource();
      const len=ctx.sampleRate*3,buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);
      let filterValue=0;
      for(let i=0;i<len;i++){
        filterValue=filterValue*.986+(Math.random()*2-1)*.014;
        data[i]=filterValue*1.55;
      }
      wind.buffer=buffer;wind.loop=true;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=510;
      windGain=ctx.createGain();windGain.gain.value=.14;
      wind.connect(filter);filter.connect(windGain);windGain.connect(ambient);wind.start();
      nextWind=ctx.currentTime;
      startSong(-1,ctx.currentTime+.35);
    }catch(error){console.warn('Sound startup unavailable',error);ctx=null}
  }
  function effect(type=0){
    if(!ctx||!enabled)return;
    const t=ctx.currentTime,tones=[155,115,205,90,380];
    if(type==='sale'||type==='coin'){
      note(659.25,t,.17,.105,'sine');note(987.77,t+.082,.26,.058,'sine');
      note(1318.51,t+.17,.33,.025,'sine');return;
    }
    if(type==='ui'){note(430,t,.10,.055,'sine');return}
    if(type==='buy'){note(310,t,.20,.10,'triangle');note(470,t+.10,.29,.07,'sine');return}
    if(type==='step'){note(72+Math.random()*21,t,.07,.020,'sine');return}
    if(type==='exhausted'){note(152,t,.18,.06,'sine');return}
    if(type==='build'){note(208,t,.20,.08,'triangle');note(312,t+.13,.29,.075,'sine');return}
    const f=tones[Number(type)]||160;
    note(f*(.94+Math.random()*.12),t,.11,.083,Number(type)===2?'triangle':'sine');
    note(f*.54,t+.025,.16,.037,'sine');
  }
  function update(biome,dt){
    if(!ctx||!enabled||ctx.state!=='running')return;
    const now=ctx.currentTime;if(!Number.isFinite(now))return;
    queuedBiome=Number.isInteger(biome)&&biome>=-1&&biome<=4?biome:-1;
    if(windGain&&now>=nextWind){
      nextWind=now+.8;
      try{windGain.gain.setTargetAtTime(biome===3?.20:biome===1?.17:.11,now,.6)}catch{}
    }
    // Music changes only at the end of a long movement, not on a biome border.
    if(now>=nextSongAt){
      const nextBiome=queuedBiome;
      startSong(nextBiome,now+.08);
    }
    const horizon=now+2.4;
    for(const track of tracks){
      const {score}=track;
      while(track.cursor<score.events.length){
        const event=score.events[track.cursor],start=track.start+event.time;
        if(start>horizon)break;
        track.cursor++;
        if(start<now-.1||start>track.stopAt+.5)continue;
        note(event.freq,Math.max(now+.012,start),event.length,event.volume,event.wave,track.mixer,event.attack);
      }
    }
    for(let i=tracks.length-1;i>=0;i--){
      const track=tracks[i];
      if(Number.isFinite(track.stopAt)&&now>track.stopAt+8){
        try{track.mixer.disconnect()}catch{}
        tracks.splice(i,1);
      }
    }
  }
  function setEnabled(value){
    enabled=!!value;
    if(ctx){
      master.gain.setTargetAtTime(outputGain(),ctx.currentTime,.1);
      if(enabled&&ctx.state==='suspended')ctx.resume().catch(()=>{});
    }else if(enabled)boot();
    return enabled;
  }
  function toggle(){return setEnabled(!enabled)}
  function setVolume(value){
    volume=Math.max(0,Math.min(1,Number(value)||0));
    if(ctx)master.gain.setTargetAtTime(outputGain(),ctx.currentTime,.12);
  }
  return {boot,effect,update,toggle,setVolume,setEnabled,
    get enabled(){return enabled},get volume(){return volume},
    get currentMusic(){return {biome:currentBiome,variant:lastVariation,tracks:tracks.length}}};
}
