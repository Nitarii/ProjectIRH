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
  await context.close();
  const checkContext=await browser.newContext({viewport:{width:1280,height:800}});
  const salePage=await checkContext.newPage();
  salePage.on('pageerror',e=>errors.push('SALE SCRIPT '+e.message));
  await salePage.addInitScript(()=>{
    localStorage.setItem('irh-state',JSON.stringify({
      x:10,z:1,gold:100,bag:8,inv:[2,1,0,0,0],products:[1,0,0,0,0],stock:[0]
    }));
  });
  await salePage.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await salePage.locator('#play').click({timeout:15000});
  await salePage.waitForFunction(()=>document.querySelector('#coins')?.textContent==='240',null,{timeout:35000});
  const saleState=await salePage.evaluate(()=>({
    gold:document.querySelector('#coins')?.textContent,
    capacity:document.querySelector('#inventoryCapacity')?.textContent,
    saved:JSON.parse(localStorage.getItem('irh-state')||'{}'),
    topBagCount:document.querySelectorAll('#bag').length
  }));
  if(saleState.gold!=='240'||saleState.capacity?.trim()!=='0 / 8'||
     saleState.topBagCount!==0||saleState.saved.stock?.length!==0)
    throw new Error('Automatic sale failed: '+JSON.stringify(saleState));
  await checkContext.close();
  const marketContext=await browser.newContext({viewport:{width:1280,height:800}});
  const marketPage=await marketContext.newPage();
  marketPage.on('pageerror',e=>errors.push('MARKET SCRIPT '+e.message));
  await marketPage.addInitScript(()=>{
    localStorage.setItem('irh-state',JSON.stringify({x:0,z:5,gold:100}));
  });
  await marketPage.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await marketPage.locator('#play').click({timeout:15000});
  await marketPage.waitForFunction(()=>window.__irhMonitor?.frames>8,null,{timeout:30000});
  const contextHint=await marketPage.evaluate(()=>({
    label:document.querySelector('#prompt')?.textContent,
    hidden:document.querySelector('#prompt')?.classList.contains('hidden'),
    screenX:document.querySelector('#prompt')?.style.left,
    screenY:document.querySelector('#prompt')?.style.top
  }));
  if(contextHint.label!=='F'||contextHint.hidden||!contextHint.screenX||!contextHint.screenY)
    throw new Error('World hint invalid: '+JSON.stringify(contextHint));
  await marketPage.keyboard.press('e');
  const eIgnored=await marketPage.locator('#panel').evaluate(el=>el.classList.contains('hidden'));
  if(!eIgnored)throw new Error('E still opens merchant');
  await marketPage.keyboard.press('f');
  await marketPage.waitForFunction(()=>!document.querySelector('#panel').classList.contains('hidden'),null,{timeout:15000});
  console.log(JSON.stringify({sale: {gold:saleState.gold,inventory:saleState.capacity},merchant:'F',tooltip:contextHint,extraErrors:errors},null,2));
  await marketContext.close();
  const factoryContext=await browser.newContext({viewport:{width:1280,height:800}});
  const workforce=await factoryContext.newPage();
  workforce.on('pageerror',e=>errors.push('WORKFORCE '+e.message));
  await workforce.addInitScript(()=>{
    localStorage.setItem('irh-state',JSON.stringify({x:17,z:12,gold:250,bag:8,
      buildings:[
        {id:'b1',kind:'worker',type:0,x:33,z:20,workers:1,stockRaw:12,stock:12},
        {id:'b2',kind:'factory',type:0,x:42,z:20,workers:1,inputRaw:4,stockProcessed:5},
        {id:'b3',kind:'transport',type:0,x:30,z:30,workers:1},
        {id:'b4',kind:'seller',type:0,x:27,z:15,workers:1}
      ]
    }));
  });
  await workforce.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await workforce.locator('#play').click({timeout:15000});
  await workforce.waitForFunction(()=>window.__irhMonitor?.visibleEmployees>=4,null,{timeout:25000});
  const workerStats=await workforce.evaluate(()=>({...window.__irhMonitor}));
  if(workerStats.lastError||workerStats.contextLost||workerStats.employees<4||
     workerStats.visibleEmployees<4)throw new Error('Employee scene failed: '+JSON.stringify(workerStats));
  console.log(JSON.stringify({workerStats},null,2));
  await factoryContext.close();
  if(errors.length)throw new Error('Browser errors after scenarios: '+errors.join(' | '));

}finally{
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
}
