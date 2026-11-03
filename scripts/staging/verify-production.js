import { StagingBlocker } from '../../src/staging/blockers.js';
// Read-only verification of the exact production URL supplied by the user.
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export async function verifyProduction(fetcher=fetch,networkPolicy=null){
 const url='https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/health';
 const result={kind:'READ_ONLY_DEPLOYED_PRODUCTION_HEALTH_CHECK',url,checkedAt:new Date().toISOString(),method:'GET',mutationsAttempted:0,verified:false,crmWritesEnabled:null};
 const policy=networkPolicy?.http_network_policy;
 if(policy?.type==='restricted'&&!policy.egress_rules?.some(r=>r.host===new URL(url).hostname)){result.blocker=new StagingBlocker('blocked_network_access',{host:new URL(url).hostname,check:'environment_host_not_allowlisted',setupStep:11}).toJSON();result.attemptedHTTP=false;return result;}
 try{
  const response=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(20000)});result.httpStatus=response.status;
  const body=await response.json().catch(()=>null);
  if(response.ok&&typeof body?.crmWritesEnabled==='boolean'){result.verified=true;result.crmWritesEnabled=body.crmWritesEnabled;result.reportedRelease=typeof body.release==='string'?body.release:null;result.limit='Health-reported state only; deployed script and Cloudflare settings not independently verified.';}
  else result.blocker=new StagingBlocker(response.status===401?'missing_credential':response.status===403?'insufficient_permission':'invalid_upstream_response',{credential:'production health read-only identity',httpStatus:response.status,check:'production_health_read_only',setupStep:response.status===401?5:12}).toJSON();
 }catch{result.blocker=new StagingBlocker('blocked_network_access',{host:new URL(url).hostname,check:'no_http_response',setupStep:11}).toJSON();}
 return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let policy;try{policy=JSON.parse(await readFile('/etc/codex/network-policy.json','utf8'));}catch{}
 const result=await verifyProduction(fetch,policy);await mkdir('reports',{recursive:true});await writeFile('reports/production-state.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exitCode=!result.verified?2:result.crmWritesEnabled?1:0;
}
