import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function startGame(page){
  await page.locator('#play').click({timeout:15000});
  if(await page.locator('#creator').isVisible()){
    await page.locator('#creatorPreview canvas').waitFor({timeout:20000});
    await page.locator('[data-avatar="hairStyle"]').selectOption('4');
    await page.locator('[data-avatar="topStyle"]').selectOption('2');
    await page.locator('[data-avatar="bottomStyle"]').selectOption('1');
    await page.locator('[data-avatar="glasses"]').check();
    await page.locator('[data-avatar="hairColor"]').evaluate(el=>{el.value='#a17436';el.dispatchEvent(new Event('input',{bubbles:true}))});
    await page.locator('#creatorFinish').click({timeout:20000});
  }
  await page.waitForFunction(()=>!document.querySelector('#hud').classList.contains('hidden'),null,{timeout:20000});
}
async function decryptedSave(page){
  return page.evaluate(async()=>{
    const {openSaveVault}=await import('./src/save-vault.js');
    return (await openSaveVault()).state||{};
  });
}

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
  await startGame(page);
  const progress=[];
  for(let i=0;i<6;i++){
    if(i%2===1)await page.keyboard.down('w');
    await sleep(4500);
    if(i%2===1)await page.keyboard.up('w');
    progress.push(await page.evaluate(()=>({
      hudVisible:!document.querySelector('#hud').classList.contains('hidden'),
      coords:[window.__irhMonitor?.playerX?.toFixed(2),window.__irhMonitor?.playerZ?.toFixed(2)].join(','),
      alert:document.querySelector('#notice')?.textContent,
      ui:document.querySelector('#coins')?.textContent,
      canvases:document.querySelectorAll('#game canvas').length,
      contextLost:document.querySelector('#game canvas')?.getContext('webgl2')?.isContextLost()??null,
      marker:window.__irhMonitor?{...window.__irhMonitor}:null
    })));
  }
  const created=await decryptedSave(page);
  if(created.avatar?.hairStyle!==4||created.avatar?.topStyle!==2||
     created.avatar?.bottomStyle!==1||created.avatar?.glasses!==true)
    throw new Error('Personalized character style was not saved: '+JSON.stringify(created.avatar));
  console.log(JSON.stringify({progress,errors,avatarCreated:true},null,2));
  if(errors.length)throw new Error('Browser errors: '+errors.join(' | ').slice(0,1000));
  if(progress.some(p=>!p.hudVisible||p.canvases!==1))throw new Error('The game UI was not ready');
  if(progress.some(p=>p.contextLost===true))throw new Error('WebGL context lost');
  const counts=progress.map(p=>p.marker?.frames??0);
  if(counts.every(n=>n>0)&&counts.slice(1).some((n,i)=>n<=counts[i]))throw new Error('Frame rendering stalled');
  if(progress.every(p=>!p.coords))throw new Error('World position did not update');
  const rendering=progress.at(-1)?.marker;
  if(!rendering||rendering.lastError||rendering.contextLost)
    throw new Error('World rendering diagnostics failed: '+JSON.stringify(rendering));
  if(rendering.resourceGeometries>180||!rendering.batchedChunks)
    throw new Error('Resource batch or geometry reuse regression: '+JSON.stringify(rendering));
  console.log(JSON.stringify({rendering:{
    frames:rendering.frames,drawCalls:rendering.drawCalls,chunks:rendering.chunks,
    resources:rendering.resources,batchedChunks:rendering.batchedChunks,
    sharedGeometryCount:rendering.resourceGeometries,estimatedFps:rendering.estimatedFps
  }},null,2));
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
  await startGame(salePage);
  await salePage.waitForFunction(()=>document.querySelector('#coins')?.textContent==='240',null,{timeout:35000});
  const gainText=await salePage.locator('#goldGain').textContent();
  if(gainText?.trim()!=='+140')throw new Error('Currency gain indicator missing: '+gainText);
  const saleState=await salePage.evaluate(()=>({
    gold:document.querySelector('#coins')?.textContent,
    capacity:document.querySelector('#inventoryCapacity')?.textContent,
    saved:null,
    topBagCount:document.querySelectorAll('#bag').length
  }));
  saleState.saved=await decryptedSave(salePage);
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
  await startGame(marketPage);
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
    localStorage.setItem('irh-state',JSON.stringify({x:33,z:24,gold:250,bag:8,
      buildings:[
        {id:'b1',kind:'worker',type:0,x:33,z:20,workers:1,stockRaw:12,stock:12},
        {id:'b2',kind:'factory',type:0,x:42,z:20,workers:1,inputRaw:4,stockProcessed:5},
        {id:'b3',kind:'transport',type:0,x:30,z:30,workers:1},
        {id:'b4',kind:'seller',type:0,x:27,z:15,workers:1}
      ]
    }));
  });
  await workforce.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await startGame(workforce);
  await workforce.waitForFunction(()=>window.__irhMonitor?.employees>=4&&window.__irhMonitor?.frames>18,null,{timeout:25000});
  const workerStats=await workforce.evaluate(()=>({...window.__irhMonitor}));
  if(workerStats.lastError||workerStats.contextLost||workerStats.employees<4||
     workerStats.visibleEmployees>workerStats.employees)throw new Error('Employee scene failed: '+JSON.stringify(workerStats));
  await workforce.keyboard.press('f');
  await workforce.waitForFunction(()=>document.querySelector('#panelTitle')?.textContent==='EMPLOYEES',null,{timeout:20000});
  if(await workforce.locator('button[data-action="hire:0"]').count()!==1||
     await workforce.locator('button[data-action="carry:0"]').count()!==1)
    throw new Error('F at harvesting facility did not focus its hiring and equipment upgrades');
  console.log(JSON.stringify({workerStats,facilityEmployees:true},null,2));
  await factoryContext.close();

  const tradeContext=await browser.newContext({viewport:{width:1280,height:800}});
  const tradePage=await tradeContext.newPage();
  tradePage.on('pageerror',e=>errors.push('TRADE SCRIPT '+e.message));
  await tradePage.addInitScript(()=>{
    localStorage.setItem('irh-state',JSON.stringify({
      x:26,z:15,gold:50000,inv:[3,0,0,0,0],products:[0,1,0,0,0],bag:8,
      gameMinutes:102,buildings:[{id:'b70',kind:'seller',type:0,x:27,z:17,workers:0}]
    }));
  });
  await tradePage.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  await startGame(tradePage);
  await tradePage.waitForFunction(()=>window.__irhMonitor?.frames>14,null,{timeout:30000});
  const beforeVendor=await tradePage.evaluate(()=>({
    gold:Number(document.querySelector('#coins').textContent),
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
  // F on a nearby facility legitimately opens its employee-management panel.
  if(!await tradePage.locator('#panel').evaluate(el=>el.classList.contains('hidden')))
    await tradePage.keyboard.press('Tab');
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
  await tradePage.keyboard.press('Tab');
  await tradePage.waitForFunction(()=>!!document.querySelector('button[data-system="unstuck"]'),null,{timeout:15000});
  await tradePage.locator('button[data-system="unstuck"]').click();
  const recovered=await decryptedSave(tradePage);
  if(recovered.x!==0||recovered.z!==9||recovered.inv?.some(Boolean)||
     recovered.products?.some(Boolean)||recovered.buildings?.length!==1)
    throw new Error('Unstuck failed to move safely and forfeit carried goods: '+JSON.stringify(recovered));
  await tradePage.keyboard.press('c');
  await tradePage.waitForFunction(()=>document.querySelector('#panelTitle')?.textContent==='MARKET',null,{timeout:16000});
  await tradePage.locator('button[data-action="bag"]').click({timeout:16000});
  await tradePage.locator('button[data-action="bag24"]').click({timeout:16000});
  await tradePage.locator('button[data-action="bicycle"]').click({timeout:16000});
  if(await tradePage.locator('#inventoryGrid .inventory-slot').count()!==24)
    throw new Error('24-slot backpack UI did not render all slots');
  await tradePage.keyboard.press('Tab');
  await tradePage.keyboard.press('v');
  await tradePage.waitForFunction(()=>window.__irhMonitor?.bikeRiding===true,null,{timeout:16000});
  await tradePage.keyboard.down('w');await sleep(2100);await tradePage.keyboard.up('w');
  const bikeMetric=await tradePage.evaluate(()=>({...window.__irhMonitor}));
  if(!bikeMetric.bikeRiding||bikeMetric.bagCapacity!==24)
    throw new Error('Purchased bicycle or enlarged backpack did not activate');
  await tradePage.keyboard.press('v');
  await tradePage.waitForFunction(()=>window.__irhMonitor?.bikeRiding===false,null,{timeout:16000});
  await tradePage.keyboard.press('r');
  await tradePage.waitForFunction(()=>window.__irhMonitor?.autoMode===true,null,{timeout:16000});
  const layouts=[];
  for(const viewport of [{width:320,height:400},{width:375,height:667},
     {width:640,height:480},{width:900,height:600},{width:1280,height:800}]){
    await tradePage.setViewportSize(viewport);
    await sleep(130);
    const result=await tradePage.evaluate(()=>{
      const rect=id=>{
        const element=document.querySelector(id);
        if(!element||getComputedStyle(element).display==='none')return null;
        const r=element.getBoundingClientRect();
        return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};
      };
      const rects={inventory:rect('#miniInventory'),auto:rect('#autoState'),
        stamina:rect('#staminaHud'),target:rect('#target'),
        brand:rect('.brand'),gold:rect('.gold'),mission:rect('.mission'),
        map:rect('.rightcol')};
      const intersect=(a,b)=>a&&b&&a.x<b.right-2&&a.right>b.x+2&&a.y<b.bottom-2&&a.bottom>b.y+2;
      const conflicts=[];
      for(const [a,b] of [['inventory','auto'],['inventory','stamina'],
        ['inventory','target'],['brand','gold'],['mission','map']])
        if(intersect(rects[a],rects[b]))conflicts.push(a+' / '+b);
      const outside=Object.entries(rects).filter(([key,r])=>r&&(r.x<-3||r.right>innerWidth+3||r.y<-3||r.bottom>innerHeight+3)).map(([key])=>key);
      return {conflicts,outside,rects};
    });
    if(result.conflicts.length||result.outside.length)
      throw new Error('HUD overlaps at '+JSON.stringify(viewport)+': '+JSON.stringify(result));
    layouts.push({viewport,ok:true});
  }
  console.log(JSON.stringify({backpack:24,bicycle:bikeMetric.bikeRiding,
    testedLayouts:layouts},null,2));
  console.log(JSON.stringify({trade:afterVendor,clock:beforeVendor.clock,zoomUnchanged:zoomBefore,placement,recovered:true},null,2));
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
  await startGame(optionsPage);
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
  await optionsPage.keyboard.press('r');
  await optionsPage.waitForFunction(()=>window.__irhMonitor?.autoMode===true,null,{timeout:16000});
  const autoLabel=await optionsPage.locator('#autoState').textContent();
  if(!autoLabel.startsWith('AUTO MODE')||!autoLabel.includes('20%'))throw new Error('Auto-mode label or slowdown missing: '+autoLabel);
  await optionsPage.keyboard.press('c');
  await optionsPage.waitForFunction(()=>document.querySelector('#panelTitle')?.textContent==='MARKET',null,{timeout:16000});
  const autoBefore=await optionsPage.evaluate(()=>window.__irhMonitor?.gameMinutes);
  await sleep(1300);
  const autoDuring=await optionsPage.evaluate(()=>({gameMinutes:window.__irhMonitor?.gameMinutes,auto:window.__irhMonitor?.autoMode}));
  if(!autoDuring.auto||autoDuring.gameMinutes<=autoBefore)
    throw new Error('Automatic mode must continue behind ordinary menus: '+JSON.stringify(autoDuring));
  await optionsPage.keyboard.press('Tab');
  await optionsPage.keyboard.press('r');
  await optionsPage.waitForFunction(()=>window.__irhMonitor?.autoMode===false,null,{timeout:16000});
  await optionsPage.keyboard.press('c');
  await optionsPage.waitForFunction(()=>document.querySelector('#panelTitle')?.textContent==='MARKET',null,{timeout:16000});
  await optionsPage.keyboard.press('Tab');
  await optionsPage.waitForFunction(()=>document.querySelector('#panel').classList.contains('hidden'),null,{timeout:15000});
  await optionsPage.keyboard.press('Space');
  await optionsPage.waitForFunction(()=>window.__irhMonitor?.jumpHeight>.15,null,{timeout:19000});
  await optionsPage.keyboard.press('Escape');
  await optionsPage.waitForFunction(()=>!!document.querySelector('#settingVolume'),null,{timeout:15000});
  const pauseBefore=await optionsPage.evaluate(()=>window.__irhMonitor?.gameMinutes);
  await optionsPage.waitForTimeout(550);
  const pauseAfter=await optionsPage.evaluate(()=>window.__irhMonitor?.gameMinutes);
  if(Math.abs(pauseAfter-pauseBefore)>.00001)
    throw new Error('Escape menu must pause the game clock');
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
  const personalId=await optionsPage.locator('.vault-code').textContent();
  if(!/^IRH-[A-F0-9]{14}$/.test(personalId))
    throw new Error('Unique local save ID not shown: '+personalId);
  await optionsPage.locator('button[data-system="saveExport"]').click();
  const backup=await optionsPage.locator('#vaultExportCode').inputValue();
  if(!backup.startsWith('IRH1.')||backup.length<100)
    throw new Error('Encrypted save export missing or malformed');
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
  const freshState=await decryptedSave(optionsPage);
  if(freshState.gold!==100||freshState.buildings?.length!==0||freshState.avatar!==null||
      freshState.tools?.some(n=>n!==-1)||Object.keys(freshState.trails||{}).length)
    throw new Error('Reset did not produce a fresh procedural world: '+JSON.stringify(freshState));
  console.log(JSON.stringify({options:optionsState,remappedBuild:true,resetSeed:freshState.seed,jump:true,signs:true},null,2));
  await optionsContext.close();
  if(errors.length)throw new Error('Browser errors after scenarios: '+errors.join(' | '));

}finally{
  await browser?.close().catch(()=>{});
  server.kill('SIGTERM');
}
