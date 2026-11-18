import test from 'node:test';
import assert from 'node:assert/strict';
import {settingsVersion} from '../scripts/voice/version-consistency.js';
const version=(id,flag)=>({id,resources:{bindings:[{name:'VOICE_NOTE_WRITES_ENABLED',type:'plain_text',text:flag}]}});
test('configuration polling ignores stale old versions and transient new-version 404 without another PATCH',async()=>{
 let reads=0,details=0,pauses=0;const result=await settingsVersion({previousId:'old',delta:{VOICE_NOTE_WRITES_ENABLED:'true'},pause:async()=>{pauses++;},readVersions:async()=>({items:[{id:++reads===1?'old':'new'}]}),readVersion:async id=>{details++;if(details===1)throw Error('cloudflare_GET_404_codes_100146');return version(id,details===2?'false':'true');}});assert.equal(result.id,'new');assert.equal(reads,4);assert.equal(pauses,3);
});
test('nonconverging configuration fails closed and authentication errors are not retried as stale data',async()=>{
 let reads=0;await assert.rejects(settingsVersion({previousId:'old',delta:{VOICE_NOTE_WRITES_ENABLED:'true'},attempts:2,pause:async()=>{},readVersions:async()=>{reads++;return {items:[{id:'old'}]};},readVersion:async()=>{throw Error('unexpected');}}),/did_not_converge/);assert.equal(reads,2);
 await assert.rejects(settingsVersion({previousId:'old',delta:{VOICE_NOTE_WRITES_ENABLED:'true'},pause:async()=>{},readVersions:async()=>({items:[{id:'new'}]}),readVersion:async()=>{throw Error('cloudflare_GET_403_codes_10000');}}),/cloudflare_GET_403/);
});
