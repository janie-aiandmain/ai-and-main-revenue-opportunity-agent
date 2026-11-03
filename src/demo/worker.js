import application from '../index.js';
import {DEMO_CONTRACT,DEMO_CASES,hash} from './recovery-ledger.js';
import {DemoHubSpot,exactTaskMatch} from './hubspot.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const flags=['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED'];
async function authorized(request,env){
 if(env.DEMO_RECOVERY_ENABLED!=='true'||flags.some(n=>env[n]!=='false'))throw Error('demo_control_disabled');
 if(!env.DEMO_RECOVERY_CAPABILITY||!env.DEMO_RECOVERY_RUN_ID||Date.parse(env.DEMO_RECOVERY_EXPIRES_AT)<=Date.now()||!Number.isFinite(Date.parse(env.DEMO_RECOVERY_EXPIRES_AT)))throw Error('demo_operator_control_unavailable');
 const supplied=request.headers.get('Authorization')||'',expected='Bearer '+env.DEMO_RECOVERY_CAPABILITY;
 const a=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(supplied))),b=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(expected)));let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];if(d)throw Error('operator_required');
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)throw Error('cross_origin_forbidden');
}
export async function demoFetch(request,env){
 const path=new URL(request.url).pathname;if(!path.startsWith('/demo-recovery/'))return application.fetch(request,env);
 try{
  await authorized(request,env);if(request.method!=='POST')return json({status:'post_required'},405);
  const text=await request.text();if(text.length>6000)throw Error('request_too_large');const input=JSON.parse(text);
  const action=path.slice('/demo-recovery/'.length),allowed=['preflight','binding','prepare','approve','execute','reconcile','status','summary','arm-fault','restart','close'];if(!allowed.includes(action))throw Error('demo_action_not_allowed');
  if(!env.DEMO_RECOVERY_LEDGER)throw Error('existing_ledger_binding_missing');
  const stub=env.DEMO_RECOVERY_LEDGER.get(env.DEMO_RECOVERY_LEDGER.idFromName('demo-recovery:'+env.DEMO_RECOVERY_RUN_ID));
  const ledger=async(action,fields={})=>{
   const response=await stub.fetch(new Request('https://private-ledger/internal/demo-recovery-v1',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...fields,action,contract:DEMO_CONTRACT,runId:env.DEMO_RECOVERY_RUN_ID})}));const data=await response.json();if(!response.ok)throw Error(data.status||'ledger_operation_blocked');return data;
  };
  const client=new DemoHubSpot(env);
  if(action==='preflight')return json(await client.preflight());
  if(action==='binding')return json({binding:'EXTERNAL_DURABLE_OBJECT_WORKING',owner:'ai-and-main-revenue-opportunity-staging',className:'CertificationLedger',...(await ledger('summary'))});
  if(['summary','close'].includes(action))return json(await ledger(action));
  if(action==='status')return json(await ledger('status',{operationId:input.operationId}));
  if(action==='prepare'){
   if(!DEMO_CASES.includes(input.caseId))throw Error('synthetic_control_only_seven_reviews_remain_pending');
   const source=await client.preflight();return json(await ledger('prepare',{caseId:input.caseId,dueAt:input.dueAt,priority:input.priority,sourceHash:source.sourceHash}));
  }
  if(action==='approve')return json(await ledger('approve',{operationId:input.operationId,payloadHash:input.payloadHash,actionVersion:input.actionVersion,revision:input.revision,sourceHash:input.sourceHash}));
  if(['arm-fault','restart'].includes(action)){
   if(env.DEMO_RECOVERY_FAULT_ENABLED!=='true'||env.DEMO_RECOVERY_EXECUTION_ENABLED!=='true')throw Error('operator_fault_control_disabled');
   return json(await ledger(action,{operationId:input.operationId}));
  }
  const reconcile=async op=>{
   try{
    await client.preflight();const candidates=await client.lookup(op.correlation);
    const match=candidates.length===1&&exactTaskMatch(candidates[0],op.request,op.correlation)?candidates[0]:null;
    return await ledger('reconciled',{operationId:op.operationId,candidates:candidates.length,matchedTaskId:match?String(match.id):null,matchProofHash:match?hash({taskId:String(match.id),approvedRequest:op.request,properties:match.properties,contacts:match.associations.contacts.results.map(c=>String(c.id)).sort()}):null});
   }catch{return ledger('unknown',{operationId:op.operationId,reason:'read_only_reconciliation_unavailable_blocked'});}
  };
  let op=await ledger('status',{operationId:input.operationId});
  if(action==='reconcile'){if(!op.createAttempts)throw Error('no_remote_submission_to_reconcile');return json(await reconcile(op));}
  if(op.createAttempts||['SENDING','UNKNOWN','CONFIRMED'].includes(op.state))return json(await reconcile(op));
  if(env.DEMO_RECOVERY_EXECUTION_ENABLED!=='true')throw Error('demo_test_execution_disabled');
  // Fixed synthetic source, both account identities and live marker are freshly verified.
  let source;try{source=await client.preflight();}catch(error){await ledger('invalidate',{operationId:op.operationId,reason:'fresh_source_or_account_check_failed'});throw error;}
  if(op.sourceHash!==source.sourceHash||op.request.contractVersion!==DEMO_CONTRACT||!DEMO_CASES.includes(op.caseId)){await ledger('invalidate',{operationId:op.operationId,reason:'source_or_control_version_changed'});throw Error('source_or_control_version_changed');}
  const intent=await ledger('begin',{operationId:op.operationId,approvalId:input.approvalId,payloadHash:input.payloadHash,actionVersion:input.actionVersion,revision:input.revision,sourceHash:source.sourceHash});
  if(intent.mode!=='CREATE_ONCE')return json(await reconcile(intent));
  // Send only the durable approved request, never caller-supplied task properties.
  if(hash(intent.request)!==intent.payloadHash||intent.payloadHash!==input.payloadHash||intent.actionVersion!==input.actionVersion)throw Error('final_payload_integrity_failure');
  if(intent.discardResponse&&env.DEMO_RECOVERY_FAULT_ENABLED!=='true')return json(await ledger('unknown',{operationId:op.operationId,reason:'fault_disabled_before_post_no_create'}),409);
  try{
   const response=await client.create(intent.request);
   if(intent.discardResponse){await response.body?.cancel();return json({kind:'INJECTED_APPLICATION_RESPONSE_LOSS_NOT_NETWORK_OUTAGE',operationId:op.operationId,state:'SENDING',successNotRecorded:true,remoteTaskId:null},503);}
   // Discard the creation response ID; confirmation always requires independent readback.
   await response.body?.cancel();return json(await reconcile(intent));
  }catch(error){return json({...await ledger('unknown',{operationId:op.operationId,reason:'remote_post_outcome_uncertain_no_retry'}),status:'remote_post_outcome_unknown',cause:/^hubspot_[a-z_0-9]+$/.test(error.message)?error.message:'remote_request_failed'},409);}
 }catch(e){const status=/^[a-z0-9_]+$/.test(e.message)?e.message:'demo_operation_blocked';return json({status},['operator_required','cross_origin_forbidden'].includes(status)?403:status.includes('disabled')||status==='demo_operator_control_unavailable'?503:409);}
}
export default {fetch:demoFetch};
