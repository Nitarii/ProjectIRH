// node tests/menu-shortcuts.mjs
// Ensure the player's configurable menu keys toggle their corresponding panels.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const slice=(start,end)=>{
  const a=main.indexOf(start),b=main.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Missing source segment: '+start);
  return main.slice(a,b);
};
const shortcutsSource=slice('function menuShortcut(code,bindings){','let employeeFilterId=');
const keyBranch=slice("  if(panel&&panel!=='settings'&&panel!=='storage'){","  if(panel)return;");
const bindings={market:'KeyC',build:'KeyB',talents:'KeyT'};
let passed=0;
const check=(name,ok)=>{assert.ok(ok,name);passed++;console.log('✓ '+name)};
function harness(){
  let panel=null,lockRestored=0,switches=0;
  const source=shortcutsSource+
    'function close(){panel=null;lockRestored++}'+
    'function openPanel(k){if(panel===k){close();return} panel=k;switches++}'+
    'function press(code,settings){const e={code,preventDefault(){}};'+keyBranch+'}'+
    'return {press,setPanel:p=>panel=p,get:()=>({panel,lockRestored,switches})};';
  return new Function(source)();
}
const app=harness();
app.setPanel('build');
app.press('KeyB',bindings);
check('pressing B again closes construction and requests camera restore',
  app.get().panel===null&&app.get().lockRestored===1);
app.setPanel('market');
app.press('KeyC',bindings);
check('pressing C again closes the market',app.get().panel===null&&app.get().lockRestored===2);
app.setPanel('talents');
app.press('KeyT',bindings);
check('pressing T again closes progression',app.get().panel===null&&app.get().lockRestored===3);
app.setPanel('market');
app.press('KeyB',bindings);
check('a different menu shortcut switches panels',app.get().panel==='build');
app.press('KeyC',bindings);
check('switching back with C works',app.get().panel==='market');
app.setPanel('settings');
app.press('KeyB',bindings);
check('settings remains a dedicated modal',app.get().panel==='settings');
app.setPanel('storage');
app.press('KeyC',bindings);
check('storage shortcuts remain protected',app.get().panel==='storage');
app.setPanel('talents');
app.press('KeyH',{...bindings,talents:'KeyH'});
check('custom rebinding works without hard-coded physical key',
  app.get().panel===null&&app.get().lockRestored===4);
app.setPanel('build');
app.press('KeyC',{...bindings,market:'KeyJ'});
check('old market key is ignored after custom rebind',app.get().panel==='build');
app.press('KeyJ',{...bindings,market:'KeyJ'});
check('custom market shortcut switches open panel',app.get().panel==='market');
check('actual keydown guards against auto-repeat',
  main.includes('if(e.repeat)return;')&&
  main.indexOf('if(e.repeat)return;')<main.indexOf("  if(panel&&panel!=='settings'&&panel!=='storage'){"));
console.log('\nPassed '+passed+' menu toggle checks.');
