// Each browser owns a random AES-256-GCM save key. Saves are encrypted before
// localStorage writes, and a portable encrypted recovery code can be exported.
// This is local-only, not an account or a server-side synchronization service.
const KEY='irh-vault-key-v1',DATA='irh-vault-data-v1',LEGACY='irh-state';
const encoder=new TextEncoder(),decoder=new TextDecoder();
const toBase64=bytes=>{
  let string='';for(const b of bytes)string+=String.fromCharCode(b);
  return btoa(string).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const fromBase64=text=>{
  const raw=atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
};
function ensureCrypto(){
  if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues)
    throw new Error('Browser does not support encrypted local saves');
}
function random(length){const bytes=new Uint8Array(length);crypto.getRandomValues(bytes);return bytes}
async function importKey(bytes){
  return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function decrypt(key,payload){
  const iv=fromBase64(payload.iv),data=fromBase64(payload.data);
  const output=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data);
  const state=JSON.parse(decoder.decode(output));
  if(!state||typeof state!=='object'||Array.isArray(state))throw Error('Invalid save');
  return state;
}
export async function openSaveVault(storage=localStorage){
  ensureCrypto();
  let secret;
  try{secret=storage.getItem(KEY)?fromBase64(storage.getItem(KEY)):random(32)}
  catch{secret=random(32)}
  if(secret.length!==32)secret=random(32);
  const key=await importKey(secret);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',secret));
  const id='IRH-'+Array.from(digest.slice(0,7),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  if(!storage.getItem(KEY))storage.setItem(KEY,toBase64(secret));
  let state=null;
  const encrypted=storage.getItem(DATA);
  if(encrypted){
    try{state=await decrypt(key,JSON.parse(encrypted))}
    catch(error){console.warn('Encrypted save is unreadable; old save kept untouched',error)}
  }else{
    const legacy=storage.getItem(LEGACY);
    if(legacy)try{state=JSON.parse(legacy)}catch{}
  }
  let pending=Promise.resolve();
  let latest=null;
  function save(next){
    // Serialize writes: a slow encryption may not overwrite a newer snapshot.
    latest=structuredClone(next);
    const snapshot=latest;
    pending=pending.catch(()=>{}).then(async()=>{
      const iv=random(12);
      const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(snapshot)));
      storage.setItem(DATA,JSON.stringify({iv:toBase64(iv),data:toBase64(new Uint8Array(encrypted))}));
      storage.removeItem(LEGACY);
    });
    return pending;
  }
  async function backup(){
    await pending;
    const content=storage.getItem(DATA);
    if(!content)await save(state||{});
    const payload=JSON.parse(storage.getItem(DATA));
    // The recovery string contains the decryption secret. Keep it private.
    return 'IRH1.'+toBase64(secret)+'.'+payload.iv+'.'+payload.data;
  }
  async function restore(code){
    const parts=String(code||'').trim().split('.');
    if(parts.length!==4||parts[0]!=='IRH1')throw Error('Invalid recovery code');
    const bytes=fromBase64(parts[1]);
    if(bytes.length!==32)throw Error('Invalid recovery key');
    const otherKey=await importKey(bytes);
    const payload={iv:parts[2],data:parts[3]};
    const recovered=await decrypt(otherKey,payload);
    await pending;
    storage.setItem(KEY,parts[1]);storage.setItem(DATA,JSON.stringify(payload));
    storage.removeItem(LEGACY);
    return recovered;
  }
  return {state,id,save,backup,restore,flush:()=>pending};
}
