// Existing synthetic demo only. Cloudflare configuration/code, never CRM/model/email.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {executionFlags} from '../../src/voice/contract.js';
import {VOICE_ROUTINE_POLICY} from '../../src/voice/execution-window.js';
import {settingsVersion} from './version-consistency.js';

const account='cda2ab71dd8127c8031c945a738b86e2',api='https://api.cloudflare.com/client/v4/accounts/'+account;
const root=process.cwd(),dir='/tmp/ai-main-voice-routine-deploy',out='docs/review/voice-routine-demo-2026-11-18/hosted';
const args=process.argv.slice(2),noteFlags=['VOICE_NOTE_WRITES_ENABLED','VOICE_NOTE_RELEASE_APPROVED','VOICE_NOTE_RESPONSE_LOSS_TEST_ENABLED'];
const labels=['owner','gateway'],worker=label=>'ai-and-main-revenue-opportunity-'+(label==='owner'?'staging':'agent');
const load=async p=>JSON.parse(await readFile(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const save=(name,value)=>writeFile(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const vars=b=>Object.fromEntries(b.filter(x=>x.type==='plain_text').map(x=>[x.name,x.text]));
const secrets=b=>b.filter(x=>x.type==='secret_text').map(x=>x.name).sort();
const ns=b=>b.filter(x=>x.type==='durable_object_namespace').map(x=>({name:x.name,className:x.class_name,namespaceId:x.namespace_id,...(x.script_name?{scriptName:x.script_name}:{})}));
assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID,account);assert(process.env.CLOUDFLARE_API_TOKEN,'missing_cloudflare_credential');
async function call(path,{method='GET',body}={}){
 const form=body instanceof FormData,r=await fetch(api+path,{method,headers:{authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN,...(body&&!form?{'content-type':'application/json'}:{})},...(body?{body:form?body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(25000)});
 const j=await r.json().catch(()=>null);if(!r.ok||j?.success!==true)throw Error('cloudflare_'+method+'_'+r.status+'_codes_'+(j?.errors||[]).map(e=>e.code).join('_'));return j.result;
}
async function state(label){
 const name=worker(label),p='/workers/scripts/'+name,settings=await call(p+'/settings'),deployment=(await call(p+'/deployments')).deployments[0],subdomain=await call(p+'/subdomain');
 assert.equal(deployment.versions.length,1);assert.equal(deployment.versions[0].percentage,100);
 return {label,name,settings,bindings:settings.bindings||[],vars:vars(settings.bindings||[]),versionId:deployment.versions[0].version_id,deploymentId:deployment.id,subdomain};
}
function base(s){
 assert(executionFlags.every(f=>s.vars[f]==='false'),'general_task_execution_must_remain_closed');
 for(const [k,v]of Object.entries({CERTIFICATION_MODE:'remote-demo',STAGING_ISOLATION_APPROVED:'true',STAGING_PORTAL_ID:'247646122',STAGING_CONTACT_ID:'582095692487',VOICE_INTAKE_ENABLED:'true'}))assert.equal(s.vars[k],v,k);
 assert.equal(s.subdomain.enabled,s.label==='gateway');assert.equal(s.subdomain.previews_enabled,false);
 assert(!s.bindings.some(x=>x.type==='plain_text'&&/TOKEN|API_KEY|SECRET|PASSWORD/.test(x.name)),'plaintext_credential_binding');
}
async function modules(label){
 const r=await fetch(api+'/workers/scripts/'+worker(label),{headers:{authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN},redirect:'manual',signal:AbortSignal.timeout(25000)});assert(r.ok,'module_read_failed');
 const result=[];for(const [moduleName,file]of await r.formData())if(/\.m?js$/.test(moduleName)){const b=typeof file==='string'?Buffer.from(file):Buffer.from(await file.arrayBuffer());result.push({name:moduleName,sha256:sha(b),bytes:b.length});}
 assert(result.length);return result.sort((a,b)=>a.name.localeCompare(b.name));
}
function sameSettings(b,prior,overrides={}){
 const v=vars(b);assert.deepEqual(secrets(b),prior.secretNames);assert.deepEqual(ns(b),prior.namespaceBindings);
 const expected=[...new Set([...Object.keys(prior.ordinarySettingHashes),...Object.keys(overrides)])].sort();assert.deepEqual(Object.keys(v).sort(),expected);
 for(const [k,h]of Object.entries(prior.ordinarySettingHashes))if(!(k in overrides))assert.equal(sha(v[k]??''),h,'setting_changed_'+k);
 for(const [k,value]of Object.entries(overrides))assert.equal(v[k],value,k);
}
async function activate(label,id,message){
 const p='/workers/scripts/'+worker(label);let s=await state(label);
 if(s.versionId!==id)await call(p+'/deployments',{method:'POST',body:{strategy:'percentage',versions:[{version_id:id,percentage:100}],annotations:{'workers/message':message}}});
 for(let n=0;n<12;n++){s=await state(label);if(s.versionId===id)return s;await new Promise(r=>setTimeout(r,1000));}throw Error('deployment_did_not_converge');
}
async function accessCheck(){
 const checks=[];for(const path of ['/voice-intake','/certification/voice/submit','/certification/voice/submit-recovery-test','/identity']){
  const r=await fetch('https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev'+path,{redirect:'manual',signal:AbortSignal.timeout(20000)}),location=r.headers.get('location');const host=location?new URL(location).hostname:null;
  const protectedAccess=([301,302,303,307,308].includes(r.status)&&host==='falling-cell-9501.cloudflareaccess.com')||[401,403].includes(r.status);checks.push({path,httpStatus:r.status,redirectHost:host,protected:protectedAccess});assert(protectedAccess,'Access_protection_failed');
 }return checks;
}
const reportBase=()=>({at:new Date().toISOString(),accountId:account,policyVersion:VOICE_ROUTINE_POLICY,hubspotCalls:0,modelCalls:0,emailCalls:0,noteSubmissions:0,secretValuesRead:false});
if(args.join(' ')==='--prepare'){
 const closed=await load('docs/review/voice-intake-release-2026-11-18/hosted/recovery-run-1/note-window-close.json');assert(closed.verified&&!closed.noteWindowEnabled);
 const events=(await readFile('docs/review/voice-intake-release-2026-11-18/release-adjudication/events.jsonl','utf8')).trim().split('\n').map(JSON.parse);assert(events.some(e=>e.separateRoutineActivationAuthorization),'explicit_routine_activation_authorization_required');
 const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();await mkdir(dir,{recursive:true,mode:0o700});await mkdir(out,{recursive:true});
 const report={kind:'CLOSED_ROUTINE_DEMO_DEPLOYMENT_PREPARATION',...reportBase(),sourceCommit,workers:[]};
 for(const label of labels){
  const s=await state(label),prior=closed.workers.find(w=>w.name===s.name);base(s);assert.equal(s.versionId,prior.versionId,'concurrent_deployment');assert(noteFlags.every(f=>s.vars[f]==='false'));
  assert.deepEqual(secrets(s.bindings),prior.secretNames);assert.deepEqual(ns(s.bindings),prior.namespaceBindings);assert.deepEqual(await modules(label),prior.remoteModules);
  const cfg=await load(label==='owner'?'wrangler.staging.jsonc':'wrangler.jsonc');assert.equal(cfg.name,s.name);assert.equal(cfg.vars.VOICE_NOTE_EXECUTION_MODE,'human_approved_demo');
  cfg.account_id=account;cfg.main=root+(label==='owner'?'/src/staging/worker.js':'/src/demo/worker.js');cfg.vars={...s.vars,VOICE_NOTE_EXECUTION_MODE:'human_approved_demo',VOICE_NOTE_WRITES_ENABLED:'false',VOICE_NOTE_RELEASE_APPROVED:'false',VOICE_NOTE_RESPONSE_LOSS_TEST_ENABLED:'false',RELEASE_SOURCE_SHA:sourceCommit};cfg.keep_vars=true;cfg.workers_dev=label==='gateway';cfg.preview_urls=false;
  await writeFile(dir+'/'+label+'.jsonc',JSON.stringify(cfg,null,2)+'\n',{mode:0o600});
  report.workers.push({label,name:s.name,versionId:s.versionId,sourceCommit:s.vars.RELEASE_SOURCE_SHA,subdomain:s.subdomain,secretNames:secrets(s.bindings),namespaceBindings:ns(s.bindings),ordinarySettingHashes:Object.fromEntries(Object.entries(s.vars).map(([k,v])=>[k,sha(v)])),oldModules:prior.remoteModules});
 }
 await save('before-deployment.json',report);console.log(JSON.stringify({prepared:true,sourceCommit,allWritesClosed:true}));
}else if(args[0]==='--activate-closed'){
 const [,label,id]=args;assert(args.length===3&&labels.includes(label)&&/^[a-f0-9-]{36}$/.test(id??''));
 const before=await load(out+'/before-deployment.json'),prior=before.workers.find(w=>w.label===label),s=await state(label);base(s);assert([prior.versionId,id].includes(s.versionId),'concurrent_deployment');
 const version=await call('/workers/scripts/'+s.name+'/versions/'+id),overrides={RELEASE_SOURCE_SHA:before.sourceCommit,VOICE_NOTE_EXECUTION_MODE:'human_approved_demo'};
 sameSettings(version.resources.bindings,prior,overrides);assert(noteFlags.every(f=>vars(version.resources.bindings)[f]==='false'));
 const active=await activate(label,id,'Deploy routine reviewed-note policy CLOSED; task/fault execution remains disabled');base(active);sameSettings(active.bindings,prior,overrides);
 const remote=await modules(label),local=[];for(const name of await readdir(dir+'/'+label+'-bundle'))if(/\.m?js$/.test(name)){const b=await readFile(dir+'/'+label+'-bundle/'+name);local.push({name,sha256:sha(b),bytes:b.length});}assert.deepEqual(remote,local.sort((a,b)=>a.name.localeCompare(b.name)),'active_module_mismatch');
 await save('closed-deployment-'+label+'.json',{kind:'ACTUAL_CLOSED_ROUTINE_DEMO_DEPLOYMENT',...reportBase(),sourceCommit:before.sourceCommit,name:active.name,activeVersionId:active.versionId,namespaceBindings:ns(active.bindings),secretNames:secrets(active.bindings),subdomain:active.subdomain,remoteModules:remote,codeMatches:true,allTaskAndNoteFlagsClosed:true,otherSettingsPreserved:true});console.log(JSON.stringify({label,activeVersionId:id,codeMatches:true,closed:true}));
}else{
 assert(['--enable-user-authorized','--disable'].includes(args[0])&&args.length===1,'explicit_prepare_deploy_enable_or_disable_required');
 const enable=args[0]==='--enable-user-authorized',before=await load(out+'/before-deployment.json');
 const delta={VOICE_NOTE_EXECUTION_MODE:'human_approved_demo',VOICE_NOTE_WRITES_ENABLED:String(enable),VOICE_NOTE_RELEASE_APPROVED:String(enable),VOICE_NOTE_RESPONSE_LOSS_TEST_ENABLED:'false'};
 const report={kind:enable?'ACTUAL_USER_AUTHORIZED_ROUTINE_NOTE_ACTIVATION':'ACTUAL_ROUTINE_NOTE_DISABLE',...reportBase(),sourceCommit:before.sourceCommit,steps:[],workers:[],verified:false};
 async function update(label,changes){
  const s=await state(label);base(s);const p='/workers/scripts/'+s.name,overrides=new Map(Object.entries(changes)),bindings=s.bindings.map(b=>{if(!overrides.has(b.name))return {name:b.name,type:'inherit'};const text=overrides.get(b.name);overrides.delete(b.name);return {name:b.name,type:'plain_text',text};});for(const [name,text]of overrides)bindings.push({name,type:'plain_text',text});
  const form=new FormData();form.set('settings',JSON.stringify({bindings,...(s.settings.annotations?{annotations:s.settings.annotations}:{})}));await call(p+'/settings',{method:'PATCH',body:form});
  const v=await settingsVersion({readVersions:()=>call(p+'/versions?per_page=1'),readVersion:id=>call(p+'/versions/'+id),previousId:s.versionId,delta:changes});
  const active=await activate(label,v.id,enable?'Activate human-approved synthetic voice notes only; no tasks or injected faults':'Disable voice note writes; preserve all other settings');
  report.steps.push({label,previousVersion:s.versionId,versionId:active.versionId,at:new Date().toISOString()});return active;
 }
 try{
  report.accessBefore=await accessCheck();
  for(const label of labels){const s=await state(label),prior=before.workers.find(w=>w.label===label),closed=await load(out+'/closed-deployment-'+label+'.json');base(s);
   if(enable){assert.equal(s.versionId,closed.activeVersionId,'concurrent_deployment');assert(noteFlags.every(f=>s.vars[f]==='false'));}
   sameSettings(s.bindings,prior,{RELEASE_SOURCE_SHA:before.sourceCommit,VOICE_NOTE_EXECUTION_MODE:'human_approved_demo',...(!enable?Object.fromEntries(noteFlags.map(f=>[f,s.vars[f]])):{})});assert.deepEqual(await modules(label),closed.remoteModules);
  }
  for(const label of enable?labels:[...labels].reverse())await update(label,delta);
  for(const label of labels){const s=await state(label),prior=before.workers.find(w=>w.label===label),closed=await load(out+'/closed-deployment-'+label+'.json');base(s);sameSettings(s.bindings,prior,{RELEASE_SOURCE_SHA:before.sourceCommit,...delta});assert.deepEqual(await modules(label),closed.remoteModules);
   report.workers.push({name:s.name,versionId:s.versionId,sourceCommit:s.vars.RELEASE_SOURCE_SHA,noteFlags:Object.fromEntries(noteFlags.map(f=>[f,s.vars[f]])),executionMode:s.vars.VOICE_NOTE_EXECUTION_MODE,allNineTaskFlagsFalse:true,codeUnchangedFromTestedClosedCandidate:true,namespaceBindings:ns(s.bindings),secretNames:secrets(s.bindings),subdomain:s.subdomain,otherSettingsPreserved:true});
  }
  report.accessAfter=await accessCheck();report.verified=true;
 }catch(error){report.failure=String(error.message);report.rollback=[];for(const label of [...labels].reverse()){try{let s=await state(label);if(noteFlags.some(f=>s.vars[f]!=='false'))s=await update(label,Object.fromEntries(noteFlags.map(f=>[f,'false'])));assert(noteFlags.every(f=>s.vars[f]==='false'));report.rollback.push({label,closed:true});}catch(e){report.rollback.push({label,closed:false,error:String(e.message)});}}}
 report.finishedAt=new Date().toISOString();await save(enable?'activation.json':'disabled-'+Date.now()+'.json',report);assert(report.verified,report.failure);console.log(JSON.stringify({enabled:enable,verified:true,workers:report.workers.map(w=>({name:w.name,versionId:w.versionId})),taskExecution:false,faultInjection:false,noteSubmissions:0}));
}
