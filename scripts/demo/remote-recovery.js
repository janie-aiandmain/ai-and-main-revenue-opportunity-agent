// Opt-in bounded operator harness. Capabilities exist only in memory and Cloudflare Secrets.
import {spawn} from 'node:child_process';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,symlink,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const args=process.argv.slice(2);
if(!args.includes('--live')||!args.includes('--user-authorized')||!args.includes('--max-tasks=3')){console.log('Opt-in required: node scripts/demo/remote-recovery.js --live --user-authorized --max-tasks=3');process.exit(2);}
const account='cda2ab71dd8127c8031c945a738b86e2',worker='ai-and-main-revenue-opportunity-agent',owner='ai-and-main-revenue-opportunity-staging',namespace='16dca25759494a33813d2800f3f1a850';
const root='https://'+worker+'.ruddy4learning.workers.dev',api='https://api.cloudflare.com/client/v4/accounts/'+account;
const runId='demo-'+randomUUID(),capability=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+2*3600000).toISOString();
const allFlags=['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED'];
const evidence={kind:'HOSTED_REAL_HUBSPOT_SYNTHETIC_CONTROL_RECOVERY',runId,startedAt:new Date().toISOString(),accountId:account,worker,portalId:'247646122',contactId:'582095692487',maximumAuthorizedTasks:3,taskIds:[],phases:[],approvalsAre:'USER_AUTHORIZED_SYNTHETIC_CONTROL_NOT_HUMAN_SEMANTIC_SIGNOFF',sevenSemanticReviews:'PENDING',newModelCalls:0,newEnvironments:0,newNamespaces:0,verifiedRemoteRecovery:false};
const output=resolve('reports/demo-recovery-'+runId+'.json'),nullLog='/tmp/ai-main-demo-wrangler-'+runId+'.log';
let installedCapability=false,controlConfigured=false;
await mkdir('reports',{recursive:true});await symlink('/dev/null',nullLog);
const note=(phase,detail={})=>{evidence.phases.push({phase,at:new Date().toISOString(),...detail});console.log(JSON.stringify({phase,...detail}));};
async function save(){await writeFile(output,JSON.stringify(evidence,null,2)+'\n');}
async function cf(path,{method='GET',body}={}){
 let r;try{r=await fetch(api+path,{method,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN,...(body===undefined?{}:{'content-type':'application/json'})},signal:AbortSignal.timeout(25000)});}catch{throw Error('cloudflare_network_access_blocked');}
 const b=await r.json().catch(()=>null);if(!r.ok||b?.success!==true)throw Error('cloudflare_'+r.status+'_codes_'+(b?.errors||[]).map(e=>e.code).join('_'));return b.result;
}
async function settings(values){
 const path='/workers/scripts/'+worker+'/settings',before=await cf(path),overrides=new Map(Object.entries(values));
 const bindings=before.bindings.map(b=>{if(!overrides.has(b.name))return {name:b.name,type:'inherit'};const text=overrides.get(b.name);overrides.delete(b.name);return {name:b.name,type:'plain_text',text};});
 for(const [name,text]of overrides)bindings.push({name,type:'plain_text',text});
 const form=new FormData();form.set('settings',JSON.stringify({bindings,...(before.annotations?{annotations:before.annotations}:{})}));
 const r=await fetch(api+path,{method:'PATCH',headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN},body:form,redirect:'error',signal:AbortSignal.timeout(25000)});const b=await r.json().catch(()=>null);if(!r.ok||b?.success!==true)throw Error('settings_update_'+r.status);
}
async function deploy(config,phase){
 const result=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config',config],{env:{...process.env,CLOUDFLARE_ACCOUNT_ID:account,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG:'error',WRANGLER_LOG_PATH:nullLog,CI:'true'},stdio:['ignore','pipe','pipe']});let text='';p.stdout.on('data',d=>{text+=d;});p.stderr.on('data',d=>{text+=d;});p.on('error',()=>reject(Error('wrangler_spawn_failed')));p.on('close',code=>resolve({code,version:text.match(/Current Version ID:\s*([a-f0-9-]{36})/)?.[1]||null,errorCodes:[...text.matchAll(/\[code:\s*(\d+)\]/g)].map(x=>Number(x[1]))}));});
 evidence.phases.push({phase,config,...result,at:new Date().toISOString()});await save();if(result.code!==0)throw Error('wrangler_deploy_failed_'+result.errorCodes.join('_'));console.log(JSON.stringify({phase,success:true,version:result.version}));
}
async function call(action,body={}){
 let r;try{r=await fetch(root+'/demo-recovery/'+action,{method:'POST',redirect:'error',headers:{'content-type':'application/json',Authorization:'Bearer '+capability},body:JSON.stringify(body),signal:AbortSignal.timeout(55000)});}catch{throw Error('demo_request_'+action+'_transport_failed');}
 const data=await r.json().catch(()=>null);if(!data)throw Error('demo_non_json_'+action);return {status:r.status,data};
}
async function ok(action,body={}){const r=await call(action,body);if(r.status!==200)throw Error('demo_'+action+'_'+r.status+'_'+r.data.status);return r.data;}
const bound=o=>({operationId:o.operationId,payloadHash:o.payloadHash,actionVersion:o.actionVersion,revision:o.revision,sourceHash:o.sourceHash});
async function confirmed(o,a){let result=await ok('execute',{...bound(o),approvalId:a.approvalId});for(let i=0;result.state!=='CONFIRMED'&&i<6;i++){await new Promise(r=>setTimeout(r,2000));result=await ok('reconcile',{operationId:o.operationId});}assert.equal(result.state,'CONFIRMED','Remote task must be proved by readback, not create response');return result;}
try{
 if(process.env.CLOUDFLARE_ACCOUNT_ID!==account||!process.env.CLOUDFLARE_API_TOKEN)throw Error('cloudflare_authentication_not_configured');
 const cfg=JSON.parse(await readFile('wrangler.jsonc','utf8'));assert.equal(cfg.name,worker);assert.equal(cfg.vars.DEMO_RECOVERY_EXECUTION_ENABLED,'false');assert.equal(cfg.durable_objects.bindings[0].script_name,owner);assert.equal(cfg.migrations,undefined);
 const before=await cf('/workers/durable_objects/namespaces?per_page=1000');const ns=before.find(n=>n.id===namespace);assert.equal(ns?.script,owner);assert.equal(ns?.class,'CertificationLedger');assert.equal(ns?.use_sqlite,true);evidence.namespaceBefore=ns;evidence.namespaceIdsBefore=before.map(n=>n.id).sort();
 await deploy('wrangler.staging.jsonc','existing_ledger_owner_updated_no_new_migration');
 await deploy('wrangler.jsonc','original_demo_controller_deployed_execution_disabled');
 await cf('/workers/scripts/'+worker+'/secrets',{method:'PUT',body:{name:'DEMO_RECOVERY_CAPABILITY',type:'secret_text',text:capability}});installedCapability=true;
 await settings({...Object.fromEntries(allFlags.map(n=>[n,'false'])),DEMO_RECOVERY_ENABLED:'true',DEMO_RECOVERY_EXECUTION_ENABLED:'false',DEMO_RECOVERY_FAULT_ENABLED:'false',DEMO_RECOVERY_RUN_ID:runId,DEMO_RECOVERY_EXPIRES_AT:expiresAt});controlConfigured=true;
 const beforeUnauth=await fetch(root+'/demo-recovery/summary',{method:'POST',headers:{'content-type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(20000)});assert.equal(beforeUnauth.status,403);note('unauthenticated_operator_access_rejected');
 evidence.bindingProof=await ok('binding');assert.equal(evidence.bindingProof.className,'CertificationLedger');note('external_existing_namespace_binding_actually_works',{bootId:evidence.bindingProof.bootId});
 const deployed=await cf('/workers/scripts/'+worker+'/settings');assert.equal(deployed.bindings.find(b=>b.name==='DEMO_RECOVERY_LEDGER')?.namespace_id,namespace);
 evidence.preflight=await ok('preflight');assert.equal(evidence.preflight.readPortalId,'247646122');assert.equal(evidence.preflight.writePortalId,'247646122');assert.equal(evidence.preflight.contactId,'582095692487');assert.equal(evidence.preflight.marker,'AI_MAIN_CERTIFICATION_ONLY');assert.equal(evidence.preflight.taskReadVerified,true);note('both_credentials_portal_marker_and_task_read_verified');await save();
 // Only after the preceding hosted preflight may the synthetic task gate open.
 await settings({DEMO_RECOVERY_EXECUTION_ENABLED:'true',DEMO_RECOVERY_FAULT_ENABLED:'true'});note('bounded_synthetic_execution_enabled_general_writeback_still_false');
 const dueAt=new Date(Date.now()+86400000).toISOString();
 const normal=await ok('prepare',{caseId:'NORMAL',dueAt}),normalApproval=await ok('approve',bound(normal));evidence.normal={prepared:normal,approval:normalApproval};await save();
 const n=await confirmed(normal,normalApproval),nr=await confirmed(normal,normalApproval);assert.equal(n.remoteTaskId,nr.remoteTaskId);assert.equal(nr.createAttempts,1);evidence.normal={...evidence.normal,confirmed:n,repeated:nr};evidence.taskIds.push(n.remoteTaskId);note('normal_and_repeat_one_real_task',{taskId:n.remoteTaskId,createAttempts:1});await save();
 const originalChanged=await ok('prepare',{caseId:'CHANGED',dueAt}),oldApproval=await ok('approve',bound(originalChanged));
 const changed=await ok('prepare',{caseId:'CHANGED',dueAt,priority:'HIGH'});assert.notEqual(changed.payloadHash,originalChanged.payloadHash);
 const rejection=await call('execute',{...bound(changed),approvalId:oldApproval.approvalId});assert.equal(rejection.status,409);assert.equal(rejection.data.status,'approval_stale_or_payload_or_source_changed');const changedStatus=await ok('status',{operationId:changed.operationId});assert.equal(changedStatus.createAttempts,0);evidence.changedPayload={old:originalChanged,oldApproval,changed,rejection,final:changedStatus};note('changed_payload_rejected_old_approval_zero_creates');await save();
 const loss=await ok('prepare',{caseId:'LOSS',dueAt}),lossApproval=await ok('approve',bound(loss));await ok('arm-fault',{operationId:loss.operationId});evidence.lostResponse={prepared:loss,approval:lossApproval};await save();
 const discarded=await call('execute',{...bound(loss),approvalId:lossApproval.approvalId});assert.equal(discarded.status,503);assert.equal(discarded.data.kind,'INJECTED_APPLICATION_RESPONSE_LOSS_NOT_NETWORK_OUTAGE');const beforeRestart=await ok('status',{operationId:loss.operationId});assert.equal(beforeRestart.state,'SENDING');assert.equal(beforeRestart.remoteTaskId,null);assert.equal(beforeRestart.createAttempts,1);evidence.lostResponse={...evidence.lostResponse,injectedLoss:discarded,beforeRestart};note('real_create_response_deliberately_discarded_ledger_has_no_task_id',{operationId:loss.operationId});await save();
 const restart=await call('restart',{operationId:loss.operationId}).catch(()=>({status:0,data:{status:'expected_restart_transport_termination'}}));evidence.lostResponse.restartRequest=restart;
 await deploy('wrangler.jsonc','hosted_original_worker_redeployed_execution_defaults_closed');
 await settings({DEMO_RECOVERY_ENABLED:'true',DEMO_RECOVERY_EXECUTION_ENABLED:'false',DEMO_RECOVERY_FAULT_ENABLED:'false'});
 const afterRestart=await ok('status',{operationId:loss.operationId});assert.notEqual(afterRestart.bootId,beforeRestart.bootId);assert.ok(afterRestart.trace.some(t=>t.event==='RESTART_RECOVERED_UNCERTAIN_NO_CREATE'));assert.equal(afterRestart.state,'UNKNOWN');evidence.lostResponse.afterRestart=afterRestart;note('hosted_restart_and_redeployment_durable_unknown_state_verified',{beforeBoot:beforeRestart.bootId,afterBoot:afterRestart.bootId});await save();
 const recovered=await confirmed(loss,lossApproval);assert.equal(recovered.createAttempts,1);const repeatedRecovery=await confirmed(loss,lossApproval);assert.equal(recovered.remoteTaskId,repeatedRecovery.remoteTaskId);evidence.taskIds.push(recovered.remoteTaskId);evidence.lostResponse={...evidence.lostResponse,reconciled:recovered,repeated:repeatedRecovery,genuineNetworkOutage:false};
 evidence.finalSummary=await ok('summary');assert.equal(evidence.finalSummary.totalCreateAttempts,2);assert.equal(new Set(evidence.taskIds).size,2);evidence.verifiedRemoteRecovery=true;note('remote_recovery_verified_for_injected_loss_only',{taskId:recovered.remoteTaskId,totalCreateAttempts:2});
}catch(error){evidence.failure={code:/^[a-zA-Z0-9_]+$/.test(error.message)?error.message:'demo_run_failed',name:error.name};note('run_stopped_no_unproven_success',{code:evidence.failure.code});process.exitCode=1;}
finally{
 evidence.cleanup={};
 if(controlConfigured){try{evidence.closedRun=await ok('close');evidence.cleanup.durableRunClosed=true;}catch{evidence.cleanup.durableRunClosed=false;}
  try{await settings({DEMO_RECOVERY_ENABLED:'false',DEMO_RECOVERY_EXECUTION_ENABLED:'false',DEMO_RECOVERY_FAULT_ENABLED:'false',...Object.fromEntries(allFlags.map(n=>[n,'false']))});evidence.cleanup.executionAndFaultFlagsDisabled=true;}catch{evidence.cleanup.executionAndFaultFlagsDisabled=false;process.exitCode=1;}}
 if(installedCapability){try{await cf('/workers/scripts/'+worker+'/secrets/DEMO_RECOVERY_CAPABILITY',{method:'DELETE'});evidence.cleanup.temporaryOperatorCapabilityRemoved=true;}catch{evidence.cleanup.temporaryOperatorCapabilityRemoved=false;process.exitCode=1;}}
 try{
  const settingsFinal=await cf('/workers/scripts/'+worker+'/settings');const val=n=>settingsFinal.bindings.find(b=>b.name===n)?.text;
  evidence.cleanup.flagValues=Object.fromEntries([...allFlags,'DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED'].map(n=>[n,val(n)==='false'?'false':'NOT_VERIFIED_FALSE']));
  assert.ok(Object.values(evidence.cleanup.flagValues).every(v=>v==='false'));
  const namespaces=await cf('/workers/durable_objects/namespaces?per_page=1000');evidence.namespaceIdsAfter=namespaces.map(n=>n.id).sort();assert.deepEqual(evidence.namespaceIdsAfter,evidence.namespaceIdsBefore);evidence.cleanup.noNamespaceAddedOrTransferred=true;
  const ownerSub=await cf('/workers/scripts/'+owner+'/subdomain');assert.equal(ownerSub.enabled,false);assert.equal(ownerSub.previews_enabled,false);evidence.cleanup.ownerPublicEndpointsRemainDisabled=true;
  const health=await (await fetch(root+'/health',{redirect:'error',signal:AbortSignal.timeout(20000)})).json();assert.equal(health.crmWritesEnabled,false);evidence.cleanup.healthReportsGeneralWritebackDisabled=true;
 }catch{evidence.cleanup.finalMetadataVerificationFailed=true;process.exitCode=1;}
 evidence.finishedAt=new Date().toISOString();await save();await rm(nullLog,{force:true});console.log(JSON.stringify({evidenceFile:output,verifiedRemoteRecovery:evidence.verifiedRemoteRecovery,taskIds:evidence.taskIds,cleanup:evidence.cleanup}));
}
