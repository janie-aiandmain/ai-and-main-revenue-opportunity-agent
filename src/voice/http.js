import {MAX_AUDIO_BYTES,voiceMode,actorCheck,audioBytes} from './contract.js';
import {VoiceIntakeLedger} from './ledger.js';
import {HubSpotVoiceClient,transcribeAudio} from './clients.js';
import {durableDatabase} from '../staging/sql-adapter.js';
import {StagingBlocker} from '../staging/blockers.js';
export const voiceObjectName=env=>'voice-intake:portal:'+env.STAGING_PORTAL_ID+':contact:'+env.STAGING_CONTACT_ID;
const actions=new Set(['preflight','upload','status','review','approve','submit','reconcile']);
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const safeError=e=>e instanceof StagingBlocker?json({status:e.code,blocker:e.toJSON()},409):json({status:/^[a-z0-9_]+$/.test(e.message)?e.message:'voice_intake_blocked'},409);
async function bounded(request,limit){
 const reader=request.body?.getReader();if(!reader)throw Error('voice_empty_request');const chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('voice_request_too_large');}chunks.push(value);}}finally{reader.releaseLock();}
 return new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:new Blob(chunks)});
}
// Called only after the ordinary gateway verifies signature, realm, role and Origin.
export async function voiceGateway(request,env,actor){
 try{
  voiceMode(env);actorCheck(actor,env);const action=new URL(request.url).pathname.slice('/certification/voice/'.length);if(!actions.has(action))return json({status:'not_found'},404);
  const binding=env.CERTIFICATION_LEDGER||env.DEMO_RECOVERY_LEDGER;if(!binding)throw Error('voice_durable_binding_missing');
  let forwarded;
  if(action==='upload'){
   if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw Error('voice_multipart_audio_required');
   const form=await(await bounded(request,MAX_AUDIO_BYTES+32768)).formData();
   const allowed=new Set(['audio','recordedAt','sourceLabel','syntheticConfirmed','retryTranscription']);
   if([...form.keys()].some(k=>!allowed.has(k))||[...allowed].some(k=>form.getAll(k).length>1))throw Error('voice_unsupported_or_duplicate_fields');
   await audioBytes(form.get('audio')); // Reject malformed/oversized files before crossing the binding.
   form.set('actor',JSON.stringify(actor));forwarded=new Request('https://private-ledger'+new URL(request.url).pathname,{method:'POST',body:form});
  }else{
   const text=await(await bounded(request,98000)).text();let body;try{body=JSON.parse(text);}catch{throw Error('voice_invalid_json');}
   if(!body||typeof body!=='object'||Array.isArray(body)||'actor'in body||'portalId'in body||'finalRequest'in body)throw Error('voice_unsupported_fields');
   forwarded=new Request('https://private-ledger'+new URL(request.url).pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,actor})});
  }
  return await binding.get(binding.idFromName(voiceObjectName(env))).fetch(forwarded);
 }catch(e){return safeError(e);}
}
export async function voiceOwner(request,owner){
 try{
  const env=owner.env;voiceMode(env);const expected=env.CERTIFICATION_LEDGER?.idFromName(voiceObjectName(env));if(!expected||expected.toString()!==owner.demoContext.id.toString())throw Error('voice_isolated_object_required');
  const action=new URL(request.url).pathname.slice('/certification/voice/'.length);if(!actions.has(action))return json({status:'not_found'},404);
  let input,audio;
  if(action==='upload'){
   const form=await(await bounded(request,MAX_AUDIO_BYTES+32768)).formData();const actor=JSON.parse(form.get('actor')||'null');actorCheck(actor,env);
   audio=await audioBytes(form.get('audio'));input={actor,recordedAt:form.get('recordedAt'),sourceLabel:form.get('sourceLabel'),syntheticConfirmed:form.get('syntheticConfirmed')==='true',retryTranscription:form.get('retryTranscription')==='true'};
  }else{input=await request.json();actorCheck(input.actor,env);}
  owner.voiceLedger??=new VoiceIntakeLedger(durableDatabase(owner.demoContext.storage),env,{flush:()=>owner.demoContext.storage.sync()});const ledger=owner.voiceLedger;ledger.prune();
  const actor=input.actor;let result;
  if(action==='preflight')result=await new HubSpotVoiceClient(env).preflight();
  else if(action==='upload'){await new HubSpotVoiceClient(env).verifyIsolation();result=await ledger.transcribe(audio,input,actor,a=>transcribeAudio(env,a));}
  else if(action==='status')result=ledger.status(input.intakeId,actor);
  else if(action==='review')result=ledger.review(input,actor);
  else if(action==='approve')result=ledger.approve(input,actor);
  else if(action==='submit')result=await ledger.submit(input,actor,new HubSpotVoiceClient(env));
  else if(action==='reconcile')result=await ledger.reconcile(input,actor,new HubSpotVoiceClient(env));
  await owner.ensureRetentionAlarm();
  return json({...result,ownerSourceCommit:env.RELEASE_SOURCE_SHA??null,ownerDeploymentVersion:env.RELEASE_VERSION?.id??null,ledgerBootId:owner.bootId});
 }catch(e){return safeError(e);}
}
