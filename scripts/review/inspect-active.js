// Read-only Cloudflare metadata/code. Never invokes Worker, CRM or model endpoints.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='https://api.cloudflare.com/client/v4/accounts/cda2ab71dd8127c8031c945a738b86e2/workers/scripts/';
const out={kind:'READ_ONLY_ACTIVE_DEPLOYMENT_CODE_AND_BINDING_NAMES',checkedAt:new Date().toISOString(),cloudflareWrites:0,hubspotCalls:0,modelCalls:0,workers:[]};
await mkdir('/tmp/semantic-cycle-active-code',{recursive:true,mode:0o700});
for(const name of ['ai-and-main-revenue-opportunity-agent','ai-and-main-revenue-opportunity-staging']){
 const get=async path=>{const r=await fetch(root+name+path,{headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('cloudflare_read_'+r.status);return r;};
 try{
  const deps=(await(await get('/deployments')).json()).result.deployments[0],id=deps.versions[0].version_id;
  const version=(await(await get('/versions/'+id)).json()).result,bindings=version.resources?.bindings||[];
  const response=await get(''),modules=[];
  const save=async(nameInBundle,bytes)=>{const local='/tmp/semantic-cycle-active-code/'+name+'-'+modules.length+'.js';await writeFile(local,bytes,{mode:0o600});modules.push({name:nameInBundle,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,privateLocalPath:local});};
  if(response.headers.get('content-type')?.includes('multipart')){for(const [key,file]of await response.formData())if(/\.m?js$/.test(key))await save(key,typeof file==='string'?Buffer.from(file):Buffer.from(await file.arrayBuffer()));}
  else await save('response',Buffer.from(await response.arrayBuffer()));
  const source=bindings.find(b=>b.name==='RELEASE_SOURCE_SHA')?.text;
  const flags=Object.fromEntries(bindings.filter(b=>['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED','DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED','DEMO_ONLY_EXECUTION_ENABLED','DEMO_RESPONSE_LOSS_TEST_ENABLED'].includes(b.name)).map(b=>[b.name,['true','false'].includes(b.text)?b.text:'INVALID_REDACTED']));
  out.workers.push({name,activeVersion:id,sourceCommit:/^[a-f0-9]{40}$/.test(source||'')?source:null,flags,allExecutionFlagsFalse:Object.keys(flags).length>0&&Object.values(flags).every(v=>v==='false'),legacyReaderBindingPresent:bindings.some(b=>b.name==='HUBSPOT_ACCESS_TOKEN'),bindingNames:bindings.map(b=>({name:b.name,type:b.type})),modules});
 }catch(error){out.workers.push({name,blocker:error.cause?.code||error.message});}
}
await writeFile('docs/review/semantic-diagnostic-cycle/active-deployment-readonly.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
if(out.workers.some(w=>w.blocker||!w.allExecutionFlagsFalse))process.exitCode=1;
