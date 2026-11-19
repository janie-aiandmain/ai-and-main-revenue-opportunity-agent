const bytes=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const base64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function key(secret){let raw;try{raw=bytes(secret);}catch{throw Error('token_encryption_secret_invalid');}if(raw.length!==32)throw Error('token_encryption_secret_must_be_32_bytes');return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}
const aad=installationId=>new TextEncoder().encode('hubspot-oauth-connection-v1:'+installationId);
export async function sealTokens(value,env){
 const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(env.HUBSPOT_INSTALLATION_ID)},await key(env.HUBSPOT_TOKEN_ENCRYPTION_KEY),new TextEncoder().encode(JSON.stringify(value)));
 return JSON.stringify({v:1,iv:base64(iv),cipher:base64(cipher)});
}
export async function openTokens(box,env){
 try{const b=JSON.parse(box);if(b.v!==1)throw Error();return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(b.iv),additionalData:aad(env.HUBSPOT_INSTALLATION_ID)},await key(env.HUBSPOT_TOKEN_ENCRYPTION_KEY),bytes(b.cipher))));}catch{throw Error('stored_connection_cannot_be_decrypted_reconnect_required');}
}
