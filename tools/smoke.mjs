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
      x:23,z:0,gold:100,bag:8,inv:[2,1,0,0,0],products:[1,0,0,0,0],stock:[0]
    }));
  });
  await salePage.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await salePage.locator('#play').click({timeout:15000});
  await salePage.waitForFunction(()=>document.querySelector('#coins')?.textContent==='240',null,{timeout:35000});
  const gainText=await salePage.locator('#goldGain').textContent();
  if(gainText?.trim()!=='+140')throw new Error('Currency gain indicator missing: '+gainText);
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
  await workforce.waitForFunction(()=>window.__irhMonitor?.employees>=4&&window.__irhMonitor?.frames>18,null,{timeout:25000});
  const workerStats=await workforce.evaluate(()=>({...window.__irhMonitor}));
  if(workerStats.lastError||workerStats.contextLost||workerStats.employees<4||
     workerStats.visibleEmployees>workerStats.employees)throw new Error('Employee scene failed: '+JSON.stringify(workerStats));
  console.log(JSON.stringify({workerStats},null,2));
  await factoryContext.close();

  const tradeContext=await browser.newContext({viewport:{width:1280,height:800}});
  const tradePage=await tradeContext.newPage();
  tradePage.on('pageerror',e=>errors.push('TRADE SCRIPT '+e.message));
  await tradePage.addInitScript(()=>{
    localStorage.setItem('irh-state',JSON.stringify({
      x:26,z:15,gold:20000,inv:[3,0,0,0,0],products:[0,1,0,0,0],bag:8,
      gameMinutes:102,buildings:[{id:'b70',kind:'seller',type:0,x:27,z:17,workers:0}]
    }));
  });
  await tradePage.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await tradePage.locator('#play').click({timeout:15000});
  await tradePage.waitForFunction(()=>window.__irhMonitor?.frames>14,null,{timeout:30000});
  const beforeVendor=await tradePage.evaluate(()=>({
    gold:JSON.parse(localStorage.getItem('irh-state')).gold,
    count:window.__irhMonitor.inventoryCount,
    clock:document.querySelector('#clock').textContent
  }));
  await tradePage.keyboard.press('f');
  await tradePage.waitForFunction(()=>window.__irhMonitor?.frames>22,null,{timeout:20000});
  const afterVendor=await tradePage.evaluate(()=>({
    count:window.__irhMonitor.inventoryCount,
    coins:document.querySelector('#coins').textContent
  }));
  if(beforeVendor.count!==4||afterVendor.count!==4)
    throw new Error('Nearby vendor consumed player bag: '+JSON.stringify({beforeVendor,afterVendor}));
  if(!/\d\d:\d\d$/.test(beforeVendor.clock))
    throw new Error('Clock does not display game minutes: '+beforeVendor.clock);
  await tradePage.keyboard.press('b');
  await tradePage.waitForFunction(()=>!document.querySelector('#panel').classList.contains('hidden'),null,{timeout:15000});
  const zoomBefore=await tradePage.evaluate(()=>window.__irhMonitor.cameraDistance);
  await tradePage.mouse.move(700,490);
  await tradePage.mouse.wheel(0,520);
  await tradePage.waitForFunction(()=>window.__irhMonitor?.frames>32,null,{timeout:20000});
  const zoomAfter=await tradePage.evaluate(()=>window.__irhMonitor.cameraDistance);
  if(zoomAfter!==zoomBefore)throw new Error('Menu wheel changed world camera zoom');
  await tradePage.locator('button[data-action="worker:0"]').click({timeout:15000});
  await tradePage.waitForFunction(()=>!document.querySelector('#placementHud').classList.contains('hidden')&&window.__irhMonitor?.constructionActive===true,null,{timeout:20000});
  const placement=await tradePage.evaluate(()=>({
    construction:document.querySelector('#placementHud').textContent,
    active:window.__irhMonitor.constructionActive,
    menuHidden:document.querySelector('#panel').classList.contains('hidden')
  }));
  if(!placement.active||!placement.menuHidden||!placement.construction.includes('CONSTRUCTION'))
    throw new Error('Placement preview missing: '+JSON.stringify(placement));
  await tradePage.keyboard.press('Escape');
  await tradePage.waitForFunction(()=>document.querySelector('#placementHud').classList.contains('hidden'),null,{timeout:15000});
  console.log(JSON.stringify({trade:afterVendor,clock:beforeVendor.clock,zoomUnchanged:zoomBefore,placement},null,2));
  await tradeContext.close();

  const optionsContext=await browser.newContext({viewport:{width:1280,height:800},locale:'en-US'});
  const optionsPage=await optionsContext.newPage();
  optionsPage.on('pageerror',e=>errors.push('OPTIONS SCRIPT '+e.message));
  await optionsPage.addInitScript(()=>{
    if(!localStorage.getItem('irh-state')){
      localStorage.setItem('irh-state',JSON.stringify({x:0,z:9,gold:100,
        buildings:[{id:'b-l10',kind:'worker',type:0,x:35,z:20,workers:0}]}));
    }
  });
  await optionsPage.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await optionsPage.locator('#play').click({timeout:15000});
  await optionsPage.waitForFunction(()=>window.__irhMonitor?.frames>10,null,{timeout:30000});
  const initialLanguage=await optionsPage.evaluate(()=>document.documentElement.lang);
  if(initialLanguage!=='en')throw new Error('English locale should be default for non-French visitors');
  const initialState=await optionsPage.evaluate(()=>({
    labels:window.__irhMonitor?.buildingLabels,
    hints:document.querySelector('.keyline')?.textContent,
    soundButton:!!document.querySelector('#soundToggle')
  }));
  if(initialState.soundButton||/ZQSD|SHIFT|SOURIS|MAJ|CAMÉRA/.test(initialState.hints))
    throw new Error('Old HUD shortcuts or sound toggle remain: '+JSON.stringify(initialState));
  if(initialState.labels?.[0]?.label!=='LOGGING HUT')
    throw new Error('English building signage missing: '+JSON.stringify(initialState));
  await optionsPage.keyboard.press('Space');
  await optionsPage.waitForFunction(()=>window.__irhMonitor?.jumpHeight>.15,null,{timeout:19000});
  await optionsPage.keyboard.press('Escape');
  await optionsPage.waitForFunction(()=>!!document.querySelector('#settingVolume'),null,{timeout:15000});
  await optionsPage.locator('#settingVolume').evaluate(el=>{el.value='28';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await optionsPage.locator('#settingQuality').selectOption('low');
  await optionsPage.locator('#settingResolution').evaluate(el=>{el.value='75';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await optionsPage.locator('#settingDistance').evaluate(el=>{el.value='112';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await optionsPage.locator('#settingSensitivity').evaluate(el=>{el.value='140';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await optionsPage.locator('#settingAudio').uncheck();
  await optionsPage.locator('#settingLanguage').selectOption('fr');
  await optionsPage.waitForFunction(()=>window.__irhMonitor?.buildingLabels?.[0]?.label==='BÛCHERONS',null,{timeout:15000});
  await optionsPage.locator('button[data-bind="build"]').click();
  await optionsPage.keyboard.press('j');
  const optionsState=await optionsPage.evaluate(()=>({
    language:document.documentElement.lang,
    settings:JSON.parse(localStorage.getItem('irh-options')||'{}'),
    canvasPixelRatio:document.querySelector('#game canvas').width/window.innerWidth
  }));
  if(optionsState.language!=='fr'||optionsState.settings.volume!==.28||
     optionsState.settings.quality!=='low'||optionsState.settings.muted!==true||
     optionsState.settings.bindings.build!=='KeyJ'||optionsState.canvasPixelRatio>=.8||
     optionsState.settings.renderScale!==.75||optionsState.settings.viewDistance!==112||
     optionsState.settings.mouseSensitivity!==1.4)
    throw new Error('Settings not applied: '+JSON.stringify(optionsState));
  await optionsPage.keyboard.press('Escape');
  await optionsPage.keyboard.press('j');
  await optionsPage.waitForFunction(()=>!document.querySelector('#panel').classList.contains('hidden'),null,{timeout:12000});
  const newKeyWorks=await optionsPage.evaluate(()=>document.querySelector('#panelTitle').textContent);
  if(newKeyWorks!=='CONSTRUCTION')throw new Error('Remapped construction binding did not open menu');
  await optionsPage.keyboard.press('Tab'); // close construction panel
  await optionsPage.keyboard.press('Tab'); // open settings
  await optionsPage.waitForFunction(()=>!!document.querySelector('#resetConfirm'),null,{timeout:15000});
  await optionsPage.locator('button[data-system="requestReset"]').click();
  const confirmed=await optionsPage.locator('#resetConfirm').evaluate(el=>!el.classList.contains('hidden'));
  if(!confirmed)throw new Error('Reset confirmation was not shown');
  await optionsPage.locator('button[data-system="cancelReset"]').click();
  const cancelled=await optionsPage.locator('#resetConfirm').evaluate(el=>el.classList.contains('hidden'));
  if(!cancelled)throw new Error('Reset confirmation could not be cancelled');
  await optionsPage.locator('button[data-system="requestReset"]').click();
  await optionsPage.locator('button[data-system="confirmReset"]').click();
  await optionsPage.waitForFunction(()=>!!document.querySelector('#welcome')&&
    !document.querySelector('#welcome').classList.contains('hidden'),
    null,{timeout:30000});
  const freshState=await optionsPage.evaluate(()=>JSON.parse(localStorage.getItem('irh-state')||'{}'));
  if(freshState.gold!==100||freshState.buildings?.length!==0||freshState.seed===7331||
      freshState.tools?.some(n=>n!==-1)||Object.keys(freshState.trails||{}).length)
    throw new Error('Reset did not produce a fresh procedural world: '+JSON.stringify(freshState));
  console.log(JSON.stringify({options:optionsState,remappedBuild:true,resetSeed:freshState.seed,jump:true,signs:true},null,2));
  await optionsContext.close();
  if(errors.length)throw new Error('Browser errors after scenarios: '+errors.join(' | '));

}finally{
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
}
