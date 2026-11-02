import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
const errors=[];
try{
  await sleep(1500);
  browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('SCRIPT '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404 (File not found)'))errors.push('CONSOLE '+m.text())});
  page.on('response',r=>{
    if(r.status()>=400&&(/\\.(js|css|html)(\\?|$)/.test(r.url())||r.url().includes('/src/')))errors.push('HTTP '+r.status()+' '+r.url());
  });
  page.on('requestfailed',r=>errors.push('NETWORK '+r.url()+' '+r.failure()?.errorText));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#play',{timeout:30000});
  await page.locator('#play').click({timeout:10000});
  const progress=[];
  for(let i=0;i<6;i++){
    if(i%2===1)await page.keyboard.down('w');
    await sleep(4500);
    if(i%2===1)await page.keyboard.up('w');
    progress.push(await page.evaluate(()=>({
      hudVisible:!document.querySelector('#hud').classList.contains('hidden'),
      coords:document.querySelector('#coordinates')?.textContent,
      alert:document.querySelector('#notice')?.textContent,
      ui:document.querySelector('#coins')?.textContent,
      canvases:document.querySelectorAll('#game canvas').length,
      contextLost:document.querySelector('#game canvas')?.getContext('webgl2')?.isContextLost()??null,
      marker:window.__irhMonitor?{...window.__irhMonitor}:null
    })));
  }
  console.log(JSON.stringify({progress,errors},null,2));
  if(errors.length)throw new Error('Browser errors: '+errors.join(' | ').slice(0,1000));
  if(progress.some(p=>!p.hudVisible||p.canvases!==1))throw new Error('The game UI was not ready');
  if(progress.some(p=>p.contextLost===true))throw new Error('WebGL context lost');
  const counts=progress.map(p=>p.marker?.frames??0);
  if(counts.every(n=>n>0)&&counts.slice(1).some((n,i)=>n<=counts[i]))throw new Error('Frame rendering stalled');
  if(progress.every(p=>!p.coords))throw new Error('World position did not update');
}finally{
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
}
