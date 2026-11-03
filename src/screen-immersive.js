// Browser-supported fullscreen and optional mobile screen wake lock.
// Never use a busy loop or video playback workaround to prevent sleep.
export function createScreenImmersion({
  document=globalThis.document,navigator=globalThis.navigator,
  button,root=document?.documentElement,isMobile=()=>false
}={}){
  let running=false,wakeLock=null,requesting=false;
  const fullscreen=()=>!!(document?.fullscreenElement||document?.webkitFullscreenElement);
  function render(){
    if(!button)return;
    button.textContent=fullscreen()?'⤡':'⛶';
    button.setAttribute('aria-label',fullscreen()?'Quitter le plein écran':'Passer en plein écran');
    button.title=fullscreen()?'Quitter le plein écran':'Plein écran';
    button.setAttribute('aria-pressed',String(fullscreen()));
  }
  async function acquireWakeLock(){
    if(!running||!isMobile()||document?.visibilityState==='hidden'||
      !navigator?.wakeLock?.request||wakeLock||requesting)return false;
    requesting=true;
    try{
      const sentinel=await navigator.wakeLock.request('screen');
      if(!running||document?.visibilityState==='hidden'){
        await sentinel.release?.();return false;
      }
      wakeLock=sentinel;
      sentinel.addEventListener?.('release',()=>{
        if(wakeLock===sentinel)wakeLock=null;
      });
      return true;
    }catch{
      // Low-battery modes, iOS versions, and browser policy may deny it.
      return false;
    }finally{requesting=false}
  }
  async function releaseWakeLock(){
    const lock=wakeLock;wakeLock=null;
    try{await lock?.release?.()}catch{}
  }
  async function toggleFullscreen(){
    try{
      if(fullscreen()){
        const exit=document.exitFullscreen||document.webkitExitFullscreen;
        if(exit)await exit.call(document);
      }else{
        const request=root?.requestFullscreen||root?.webkitRequestFullscreen;
        if(request)await request.call(root);
      }
    }catch{
      // A rejected request must not break the gameplay or touch controls.
    }
    render();
    if(running)void acquireWakeLock();
    return fullscreen();
  }
  function start(){running=true;void acquireWakeLock();render()}
  function stop(){running=false;void releaseWakeLock()}
  button?.addEventListener?.('click',()=>{void toggleFullscreen()});
  document?.addEventListener?.('fullscreenchange',render);
  document?.addEventListener?.('webkitfullscreenchange',render);
  document?.addEventListener?.('visibilitychange',()=>{
    if(document.visibilityState==='hidden')void releaseWakeLock();
    else if(running)void acquireWakeLock();
  });
  render();
  return {start,stop,toggleFullscreen,acquireWakeLock,
    get fullscreen(){return fullscreen()},
    get awake(){return !!wakeLock}};
}
