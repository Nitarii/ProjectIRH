import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {openSaveVault} from '../src/save-vault.js';
globalThis.crypto??=webcrypto;
class MemoryStorage{
  constructor(){this.items=new Map()}
  getItem(k){return this.items.get(k)??null}
  setItem(k,v){this.items.set(k,String(v))}
  removeItem(k){this.items.delete(k)}
}
const left=new MemoryStorage(),right=new MemoryStorage();
left.setItem('irh-state',JSON.stringify({gold:17,buildings:[]}));
const first=await openSaveVault(left),second=await openSaveVault(right);
assert.notEqual(first.id,second.id);
assert.equal(first.state.gold,17);
await first.save({gold:842,avatar:{hairStyle:4},buildings:[]});
assert.equal(left.getItem('irh-state'),null);
assert.ok(!left.getItem('irh-vault-data-v1').includes('"gold":842'));
assert.equal((await openSaveVault(left)).state.gold,842);
const backup=await first.backup();
await second.restore(backup);
assert.equal((await openSaveVault(right)).state.gold,842);
console.log('Local save identity, encryption, migration and recovery verified');
