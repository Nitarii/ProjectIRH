// Self-contained Node smoke tests: node tests/ui-regressions.mjs
// No CDN, WebGL or dependencies required. Browser rendering needs manual QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const asScript=source=>source.replace(/^import[^\n]*\n/gm,'').replace(/^export\s+/gm,'');
let passed=0;
function check(label,condition){
  assert.ok(condition,label);
  passed++;
  console.log('✓ '+label);
}
const settingsSrc=asScript(read('src/settings.js'));
const fakeStorage={
  state:{'irh-options':JSON.stringify({language:'fr',minimapSize:1000,hudScale:0,
    controlsVersion:2,bindings:{talents:'KeyU'}})},
  getItem(key){return this.state[key]??null},
  setItem(key,value){this.state[key]=value}
};
const settingsApi=new Function('navigator','localStorage',
  settingsSrc+'\nreturn {loadSettings,storeSettings,keyLabel};')
  ({language:'fr-FR'},fakeStorage);
const settings=settingsApi.loadSettings();
check('Minimap setting bounded',settings.minimapSize===260);
check('HUD scale setting bounded',settings.hudScale===.7);
check('Progression key migration intact',settings.bindings.talents==='KeyT');
check('AZERTY stock key label',settingsApi.keyLabel('KeyA')==='Q');
const UI={fr:Object.fromEntries([
  'sound','on','off','volume','graphics','quality','low','balanced','high',
  'resolution','distance','sensitivity','lowHint','effects','language',
  'controls','recovery','recoveryInfo','rebinding','unstuck','resetQuestion',
  'resetWarning','cancel','confirm','resetGame','back','capacity'
].map(k=>[k,k]))};
const options=new Function('UI','keyLabel','ACTIONS',
  asScript(read('src/options-ui.js'))+'\nreturn optionsMarkup;')
  (UI,settingsApi.keyLabel,['forward','backward','market','auto','map']);
const menu=options(settings,null,'TEST');
check('Minimap slider exists',menu.includes('id="settingMinimapSize"'));
check('HUD size slider exists',menu.includes('id="settingHudScale"'));
check('Sliders use bounded persisted settings',menu.includes('value="260"')&&menu.includes('value="70"'));
const transfer=new Function(asScript(read('src/stock-interaction.js'))+
  '\nreturn transferStock;')();
const inventory={inv:[6,0,0,0,0],products:[0,0,0,0,0],bag:8};
const building={id:1,kind:'worker',type:0,stockRaw:0};
check('Stock deposit',transfer(inventory,building,'raw','deposit',100)===6&&building.stockRaw===6);
check('Stock withdrawal',transfer(inventory,building,'raw','withdraw',100)===6&&inventory.inv[0]===6);
const main=read('src/main.js'),markup=read('index.html');
check('Map does not pause simulation',!/const paused=[^\n]*exploration\.visible/.test(main));
check('Keyboard/button storage uses one transaction path',main.includes('function performStockTransfer(action)')&&
  main.includes("card('stockDeposit','KeyA'")&&main.includes("card('stockWithdraw','KeyE'"));
check('Completed stock transaction closes menu',main.includes('updateInventory();save();close();'));
check('Minimap samples live employee positions',main.includes('mapAgents=industry.snapshot()'));
check('Chroma effect only when auto active',main.includes('syncAutoEyes(on)')&&
  main.includes('if(autoMode)eyeChromaMaterial.uniforms.time.value=elapsed'));
check('World map legend exists',markup.includes('id="mapWorkerLegend"'));
const canvasCalls=[];
const ctx={
  fillRect(){},beginPath(){},arc(x,y,r){canvasCalls.push({x,y,r})},
  fill(){},stroke(){},fillText(){}
};
const elements=Object.fromEntries(
  ['worldMapCoords','worldMapClose','worldMapZoomIn','worldMapZoomOut','worldMapCenter']
    .map(id=>[id,{textContent:''}]));
const fakeDoc={getElementById:id=>elements[id]};
const canvas={
  width:800,height:520,getContext:()=>ctx,addEventListener(){},setPointerCapture(){},
  getBoundingClientRect:()=>({width:800,height:520})
};
const atlasFactory=new Function('document',asScript(read('src/exploration-map.js'))+
  '\nreturn createExplorationMap;')(fakeDoc);
const atlas=atlasFactory({
  canvas,overlay:{classList:{toggle(){}}},player:{position:{x:5,z:5}},
  biome:()=>0,buildings:()=>[{x:15,z:15}],agents:()=>[{x:25,z:15},{x:900,z:900}],
  onDiscover:()=>{}
});
atlas.load(['0,0','1,1','2,1']);atlas.setVisible(true);
check('Fog-safe building and AI atlas dots',canvasCalls.length===4);
atlas.update(.25);
check('Live atlas refresh',canvasCalls.length===8);
console.log('\nPassed '+passed+' checks.');
