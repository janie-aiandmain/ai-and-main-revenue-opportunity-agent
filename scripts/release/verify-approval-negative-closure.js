// Read-only account/active-version checks after the operator's synthetic matrix.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const account='cda2ab71dd8127c8031c945a738b86e2',base='docs/review/demo-approval-negatives-2026-11-17',api='https://api.cloudflare.com/client/v4/accounts/'+account;
assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID,account);if(!process.env.CLOUDFLARE_API_TOKEN)throw Error('missing_cloudflare_credential');
const before=JSON.parse(await readFile(base+'/before-deployment.json','utf8')),flags=['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED','DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED','DEMO_ONLY_EXECUTION_ENABLED','DEMO_RESPONSE_LOSS_TEST_ENABLED'],sha=s=>createHash('sha256').update(s).digest('hex');
async function get(path){const response=await fetch(api+path,{headers:{authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN},redirect:'manual',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('cloudflare_read_'+response.status);return (await response.json()).result;}
const workers=[];
for(const label of ['owner','gateway']){
 const expected=JSON.parse(await readFile(base+'/deployment-'+label+'.json','utf8')),name=expected.name,path='/workers/scripts/'+name;
 const active=(await get(path+'/deployments')).deployments[0];assert.equal(active.versions.length,1);assert.equal(active.versions[0].version_id,expected.activeVersionId);assert.equal(active.versions[0].percentage,100);
 const version=await get(path+'/versions/'+expected.activeVersionId),b=version.resources?.bindings||[],v=Object.fromEntries(b.filter(x=>x.type==='plain_text').map(x=>[x.name,x.text]));
 assert.equal(v.RELEASE_SOURCE_SHA,expected.sourceCommit);assert(flags.every(k=>v[k]==='false'));
 assert(!b.some(x=>x.type==='plain_text'&&/TOKEN|API_KEY|PASSWORD|SECRET/.test(x.name)),'unexpected_plaintext_credential');
 const secretNames=b.filter(x=>x.type==='secret_text').map(x=>x.name).sort();assert.deepEqual(secretNames,expected.secretNames);
 const ns=b.filter(x=>x.type==='durable_object_namespace').map(x=>({name:x.name,className:x.class_name,namespaceId:x.namespace_id,scriptName:x.script_name}));
 const normalize=xs=>xs.map(({name,className,namespaceId,scriptName})=>({name,className,namespaceId,...(scriptName?{scriptName}:{})}));
 assert.deepEqual(normalize(ns),normalize(expected.namespaceBindings));
 const prior=before.workers.find(w=>w.name===name);for(const [k,h] of Object.entries(prior.ordinarySettingHashes))if(k!=='RELEASE_SOURCE_SHA')assert.equal(sha(v[k]??''),h,'changed_setting_'+k);
 const subdomain=await get(path+'/subdomain');assert.deepEqual(subdomain,expected.subdomain);
 workers.push({name,activeVersionId:expected.activeVersionId,sourceCommit:v.RELEASE_SOURCE_SHA,traffic:active.versions,sameImmutableVersionAsVerifiedCode:true,allNineExecutionFlagsDisabled:true,flags:Object.fromEntries(flags.map(k=>[k,v[k]])),secretNames,secretsPreserved:true,namespaceBindings:ns,namespacePreserved:true,ordinarySettingsPreserved:true,emailEnabled:v.OPERATOR_EMAIL_ENABLED,subdomain});
}
const unauthenticated=[];
for(const path of ['/operator','/certification/general/approval-negative-tests','/certification/general/execute']){
 const response=await fetch('https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev'+path,{method:path==='/operator'?'GET':'POST',...(path==='/operator'?{}:{headers:{'content-type':'application/json'},body:'{}'}),redirect:'manual',signal:AbortSignal.timeout(20000)}),location=response.headers.get('location'),host=location?new URL(location,'https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev').hostname:null;
 const protectedRoute=[401,403].includes(response.status)||(response.status>=300&&response.status<400&&host==='falling-cell-9501.cloudflareaccess.com');assert(protectedRoute);
 unauthenticated.push({path,httpStatus:response.status,redirectHost:host,protected:true});await response.body?.cancel();
}
const result={kind:'ACTUAL_READ_ONLY_POST_HOSTED_MATRIX_CLOSURE_CHECK',checkedAt:new Date().toISOString(),verified:true,workers,unauthenticated,secretValuesRead:false,configurationMutations:0,hubspotCalls:0,modelCalls:0,emailProviderCalls:0,releaseAcceptance:'PENDING'};
await writeFile(base+'/hosted/final-config.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({verified:true,workers:workers.map(w=>({name:w.name,version:w.activeVersionId,allExecutionClosed:true,settingsPreserved:true})),accessProtected:true}));
