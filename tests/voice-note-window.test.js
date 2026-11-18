import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {VoiceIntakeLedger} from '../src/voice/ledger.js';
import {assertNoteWindow} from '../src/voice/execution-window.js';
import {voiceGateway} from '../src/voice/http.js';
import {HubSpotVoiceClient} from '../src/voice/clients.js';
import {StagingBlocker} from '../src/staging/blockers.js';
import {executionFlags,hash,noteRequest,actionVersion} from '../src/voice/contract.js';
const base={CERTIFICATION_MODE:'remote-demo',DEPLOYMENT_ENVIRONMENT:'staging',STAGING_ISOLATION_APPROVED:'true',STAGING_PORTAL_ID:'247646122',STAGING_CONTACT_ID:'582095692487',VOICE_INTAKE_ENABLED:'true',VOICE_NOTE_WRITES_ENABLED:'true',VOICE_NOTE_RELEASE_APPROVED:'true',...Object.fromEntries(executionFlags.map(k=>[k,'false']))};
async function lab(){
 const raw=new DatabaseSync(':memory:'),db={exec:s=>raw.exec(s),prepare:s=>raw.prepare(s),transaction:fn=>{raw.exec('BEGIN IMMEDIATE');try{const x=fn();raw.exec('COMMIT');return x;}catch(e){raw.exec('ROLLBACK');throw e;}}},env={...base},actor={kind:'EXTERNAL_VERIFIED',subject:'UNIT_TEST_ONLY_NOT_HOSTED_IDENTITY',role:'Approver',expiresAt:Date.now()+3600000},ledger=new VoiceIntakeLedger(db,env);
 const metadata={recordedAt:'2026-11-18T10:00:00Z',sourceLabel:'Synthetic test',syntheticConfirmed:true},d=await ledger.transcribe({audioHash:hash('unit-window-audio')},metadata,actor,async()=>({text:'Fictional customer requested pricing for one ceiling fan. No work or contact authorized.'}));
 const p=ledger.review({...metadata,intakeId:d.intakeId,revision:d.revision,transcript:d.reviewedText,contactId:env.STAGING_CONTACT_ID,accuracyConfirmed:true,correctContactConfirmed:true,sourceTimeConfirmed:true},actor),grant=ledger.approve({intakeId:p.intakeId,revision:p.revision,payloadHash:p.payloadHash,actionVersion:p.actionVersion},actor),input={intakeId:p.intakeId,approvalId:grant.approval.approvalId},material={...input,payloadHash:p.payloadHash};
 Object.assign(env,{VOICE_NOTE_EXECUTION_RUN_ID:'voice-note-run-00000000-0000-4000-8000-000000000001',VOICE_NOTE_EXECUTION_STARTED_AT:new Date().toISOString(),VOICE_NOTE_EXECUTION_EXPIRES_AT:new Date(Date.now()+900000).toISOString(),VOICE_NOTE_EXECUTION_MAX_CREATES:'1',VOICE_NOTE_EXECUTION_INTAKE_ID:p.intakeId,VOICE_NOTE_EXECUTION_APPROVAL_ID:input.approvalId,VOICE_NOTE_EXECUTION_PAYLOAD_HASH:p.payloadHash});
 let creates=0;const notes=[],client={async verifyIsolation(){},async lookup(){return notes;},async create(request){creates++;notes.push({id:'unit-note-1',properties:request.body.properties,associations:{contacts:{results:[{id:env.STAGING_CONTACT_ID}]}}});return {id:'unit-note-1'};}};
 return {raw,db,env,actor,ledger,p,grant,input,material,client,notes,creates:()=>creates};
}
for(const [field,value]of [['VOICE_NOTE_EXECUTION_RUN_ID',undefined],['VOICE_NOTE_EXECUTION_MAX_CREATES','2'],['VOICE_NOTE_EXECUTION_INTAKE_ID','voice_'+'1'.repeat(64)],['VOICE_NOTE_EXECUTION_PAYLOAD_HASH','sha256:'+'1'.repeat(64)],['VOICE_NOTE_EXECUTION_APPROVAL_ID','voice-approval_00000000-0000-4000-8000-000000000002'],['VOICE_NOTE_EXECUTION_EXPIRES_AT','2020-01-01T00:00:00Z'],['VOICE_NOTE_EXECUTION_STARTED_AT','2020-01-01T00:00:00Z']])test('remote note window rejects '+field+' without a create',async()=>{
 const l=await lab();try{l.env[field]=value;await assert.rejects(l.ledger.submit(l.input,l.actor,l.client),/voice_note_window_/);assert.equal(l.creates(),0);assert.equal(l.ledger.status(l.p.intakeId,l.actor).createAttempts,0);assert.equal(l.ledger.status(l.p.intakeId,l.actor).noteWritesEnabled,false);}finally{l.raw.close();}
});
test('valid exact window persists before create; restart and repeated submissions cannot create twice',async()=>{
 const l=await lab();try{const create=l.client.create;l.client.create=async request=>{const saved=l.ledger.read(l.p.intakeId);assert.equal(saved.state,'NOTE_SENDING');assert.equal(saved.createAttempts,1);assert.equal(saved.executionWindow.payloadHash,l.p.payloadHash);assert.equal(saved.executionWindow.approvalId,l.input.approvalId);return create(request);};
 const result=await l.ledger.submit(l.input,l.actor,l.client);assert.equal(result.state,'NOTE_CONFIRMED');assert.equal(result.remoteNoteId,'unit-note-1');assert.equal(l.creates(),1);
 const restarted=new VoiceIntakeLedger(l.db,{...l.env,VOICE_NOTE_WRITES_ENABLED:'false'});assert.equal((await restarted.submit(l.input,l.actor,l.client)).remoteNoteId,result.remoteNoteId);assert.equal(l.creates(),1);
 }finally{l.raw.close();}
});
test('window expiry or replacement during awaited flush cannot submit a note',async()=>{
 for(const replacement of [false,true]){const l=await lab();try{l.ledger.flush=async()=>{if(l.ledger.read(l.p.intakeId).state==='NOTE_SENDING'){if(replacement)l.env.VOICE_NOTE_EXECUTION_RUN_ID='voice-note-run-00000000-0000-4000-8000-000000000002';else l.env.VOICE_NOTE_EXECUTION_EXPIRES_AT=new Date(Date.now()-1).toISOString();}};
 const result=await l.ledger.submit(l.input,l.actor,l.client);assert.equal(result.state,'NOTE_UNKNOWN');assert.equal(result.createAttempts,1);assert.equal(l.creates(),0);
 }finally{l.raw.close();}}
});
test('closing the window during isolation reads prevents even persisted create intent',async()=>{
 const l=await lab();try{l.client.verifyIsolation=async()=>{l.env.VOICE_NOTE_WRITES_ENABLED='false';};await assert.rejects(l.ledger.submit(l.input,l.actor,l.client),/execution_disabled/);assert.equal(l.creates(),0);assert.equal(l.ledger.status(l.p.intakeId,l.actor).createAttempts,0);}finally{l.raw.close();}
});
test('gateway independently rejects closed or wrong-intake window before calling an open owner',async()=>{
 const l=await lab();try{let forwards=0;l.env.DEMO_RECOVERY_LEDGER={idFromName:n=>n,get(){return {fetch(){forwards++;return Response.json({});}};}};
 const request=body=>new Request('https://demo.test/certification/voice/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 l.env.VOICE_NOTE_WRITES_ENABLED='false';assert.equal((await voiceGateway(request(l.input),l.env,l.actor)).status,409);l.env.VOICE_NOTE_WRITES_ENABLED='true';assert.equal((await voiceGateway(request({...l.input,intakeId:'wrong'}),l.env,l.actor)).status,409);assert.equal(forwards,0);
 assert.equal((await voiceGateway(request(l.input),l.env,l.actor)).status,200);assert.equal(forwards,1);
 }finally{l.raw.close();}
});
test('HubSpot client rejects a payload changed after the window check without network calls',async()=>{
 const l=await lab(),saved=globalThis.fetch;try{let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unit_network_forbidden');};const c=new HubSpotVoiceClient({...l.env,STAGING_HUBSPOT_READ_TOKEN:'unit-read',STAGING_HUBSPOT_WRITE_TOKEN:'unit-write'}),request=structuredClone(l.p.finalRequest);request.body.properties.hs_note_body+=' unapproved';await assert.rejects(c.create(request,l.material),/window_target_or_approval_mismatch/);assert.equal(calls,0);}finally{globalThis.fetch=saved;l.raw.close();}
});
test('write rejection retains only safe exact credential/scope diagnostics and cannot retry create',async()=>{
 const l=await lab();try{let posts=0;l.client.create=async()=>{posts++;throw new StagingBlocker('insufficient_permission',{credential:'STAGING_HUBSPOT_WRITE_TOKEN',check:'voice_approved_note_creation',httpStatus:403,setupStep:4,requiredPermissions:['crm.objects.notes.write']});};
 const result=await l.ledger.submit(l.input,l.actor,l.client);assert.equal(result.state,'NOTE_UNKNOWN');assert.equal(result.blocker.code,'insufficient_permission');assert.equal(result.blocker.httpStatus,403);assert.deepEqual(result.blocker.requiredPermissions,['crm.objects.notes.write']);assert.equal(result.createAttempts,1);l.env.VOICE_NOTE_WRITES_ENABLED='false';await l.ledger.submit(l.input,l.actor,l.client);assert.equal(posts,1);
 }finally{l.raw.close();}
});
test('operational guard leaves the captured human-approved v1.2 payload and action version unchanged',()=>{
 const d=JSON.parse(readFileSync(new URL('../docs/review/voice-intake-v1/hosted/ceiling-fan-dictation-2026-11-18/operator-approved-note.json',import.meta.url)));const request=noteRequest(d,base);assert.deepEqual(request,d.finalRequest);assert.equal(hash(request),d.payloadHash);assert.equal(actionVersion(request),d.actionVersion);assert.equal(d.approval.payloadHash,d.payloadHash);
});
