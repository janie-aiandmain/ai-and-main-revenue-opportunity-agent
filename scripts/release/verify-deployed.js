// Read active provider code/settings only. Never print values of Secret bindings.
import {writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='https://api.cloudflare.com/client/v4/accounts/cda2ab71dd8127c8031c945a738b86e2',hash=b=>createHash('sha256').update(b).digest('hex');
const out={kind:'ACTUAL_ACTIVE_CODE_AND_CONFIGURATION_VERIFICATION',checkedAt:new Date().toISOString(),expectedSource:process.env.RELEASE_EXPECTED_SHA,workers:[],hubspotCalls:0};
async function get(path){const r=await fetch(root+path,{headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('cloudflare_'+r.status);return r;}
const mapped=JSON.parse(await readFile('reports/release-role-map.json','utf8'));
for(const [name,dir]of [['ai-and-main-revenue-opportunity-agent','/tmp/release-demo-bundle'],['ai-and-main-revenue-opportunity-staging','/tmp/release-owner-bundle']]){
 const deps=(await(await get('/workers/scripts/'+name+'/deployments')).json()).result.deployments[0],id=deps.versions[0].version_id;
 const version=(await(await get('/workers/scripts/'+name+'/versions/'+id)).json()).result,bindings=version.resources?.bindings||[],subdomain=(await(await get('/workers/scripts/'+name+'/subdomain')).json()).result;
 const content=await get('/workers/scripts/'+name),modules=[];
 if(content.headers.get('content-type')?.includes('multipart')){for(const [key,file]of await content.formData())if(/\.m?js$/.test(key)||(typeof file!=='string'&&/javascript|ecmascript/.test(file.type))){const bytes=typeof file==='string'?Buffer.from(file):Buffer.from(await file.arrayBuffer());modules.push({name:key,sha256:hash(bytes),bytes:bytes.length});}}
 else{const bytes=Buffer.from(await content.arrayBuffer());modules.push({name:'response',sha256:hash(bytes),bytes:bytes.length});}
 const local=[];for(const file of await readdir(dir))if(/\.m?js$/.test(file)){const bytes=await readFile(dir+'/'+file);local.push({name:file,sha256:hash(bytes),bytes:bytes.length});}
 const flags=Object.fromEntries(bindings.filter(b=>['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED','DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED'].includes(b.name)).map(b=>[b.name,b.text]));
 let approverMappingVerified=null;const mapping=bindings.find(b=>b.name==='APPROVER_SUBJECTS_JSON');if(mapping){const roles=JSON.parse(mapping.text);approverMappingVerified=Object.entries(roles).some(([sub,role])=>hash(sub)===mapped.subjectHash&&role==='Approver');}
 out.workers.push({name,activeVersion:id,percentage:deps.versions[0].percentage,sourceCommit:bindings.find(b=>b.name==='RELEASE_SOURCE_SHA')?.text,subdomain,flags,allExecutionFlagsFalse:Object.values(flags).every(v=>v==='false'),secretNames:bindings.filter(b=>b.type==='secret_text').map(b=>b.name).sort(),approverMappingVerified,namespaceBindings:bindings.filter(b=>b.type==='durable_object_namespace').map(b=>({name:b.name,className:b.class_name,namespaceId:b.namespace_id})),remoteModules:modules,localModules:local,codeMatches:local.length>0&&local.every(l=>modules.some(m=>m.sha256===l.sha256))});
}
out.unauthenticatedChecks=[];
for(const path of ['/identity','/operator','/certification/general/findings','/writeback-task']){const r=await fetch('https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev'+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});const location=r.headers.get('location');out.unauthenticatedChecks.push({path,httpStatus:r.status,redirectHost:location?new URL(location,'https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev').hostname:null});await r.body?.cancel();}
await writeFile('reports/release-deployed-verification.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(out.workers.some(w=>!w.codeMatches||!w.allExecutionFlagsFalse||w.sourceCommit!==out.expectedSource)||out.workers[0].approverMappingVerified!==true)process.exitCode=1;
