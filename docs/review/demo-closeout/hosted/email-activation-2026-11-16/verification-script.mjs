import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),dir=root+'/docs/review/demo-closeout/hosted/email-activation-2026-11-16';
const prior=JSON.parse(await readFile(root+'/docs/review/demo-closeout/hosted/closed-deployment-verification.json','utf8'));
const expected=execFileSync('git',['rev-parse','ef70b07'],{encoding:'utf8'}).trim();
const hash=b=>createHash('sha256').update(b).digest('hex');
async function get(p){const r=await fetch('https://api.cloudflare.com/client/v4/accounts/cda2ab71dd8127c8031c945a738b86e2'+p,{headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN},redirect:'manual',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Cloudflare read HTTP '+r.status);return r;}
const flags=['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED','DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED','DEMO_ONLY_EXECUTION_ENABLED','DEMO_RESPONSE_LOSS_TEST_ENABLED'];
const workers=[];
for(const old of prior.workers){const n=old.name,owner=n.endsWith('-staging'),base='/workers/scripts/'+n;
const settings=(await(await get(base+'/settings')).json()).result;
const deployment=(await(await get(base+'/deployments')).json()).result.deployments[0];
const subdomain=(await(await get(base+'/subdomain')).json()).result;
const secretNames=(await(await get(base+'/secrets')).json()).result.map(s=>s.name).sort();
const b=settings.bindings||[],vars=Object.fromEntries(b.filter(x=>x.type==='plain_text').map(x=>[x.name,x.text]));
const ns=b.filter(x=>x.type==='durable_object_namespace').map(x=>({name:x.name,className:x.class_name,namespaceId:x.namespace_id,scriptName:x.script_name}));
const modules=[],r=await get(base);
if(r.headers.get('content-type')?.includes('multipart')){for(const [key,file] of await r.formData()){if(/\.m?js$/.test(key)||(typeof file!=='string'&&/javascript|ecmascript/.test(file.type))){const bytes=typeof file==='string'?Buffer.from(file):Buffer.from(await file.arrayBuffer());modules.push({name:key,sha256:hash(bytes),bytes:bytes.length});}}}else{const bytes=Buffer.from(await r.arrayBuffer());modules.push({name:'response',sha256:hash(bytes),bytes:bytes.length});}
const realm=hash(JSON.stringify({issuer:vars.ACCESS_ISSUER,audience:vars.ACCESS_AUDIENCE}));
const oldSettings=JSON.parse(await readFile(root+'/docs/review/demo-closeout/hosted/before-deployment.json','utf8')).workers.find(x=>x.name===n);
const route={provider:vars.OPERATOR_EMAIL_PROVIDER,from:vars.OPERATOR_EMAIL_FROM,to:vars.OPERATOR_EMAIL_TO,replyTo:vars.OPERATOR_EMAIL_REPLY_TO,consoleUrl:vars.OPERATOR_CONSOLE_URL};
const routeMatches=!owner||(route.provider==='resend'&&route.from==='alerts@aiandmain.ai'&&route.to==='janie@aiandmain.ai'&&route.replyTo==='janie@aiandmain.ai'&&route.consoleUrl==='https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/operator');
const row={name:n,versionId:deployment.versions[0].version_id,deploymentId:deployment.id,traffic:deployment.versions,fullyActive:deployment.versions.length===1&&deployment.versions[0].percentage===100,sourceCommit:vars.RELEASE_SOURCE_SHA,sourceMatches:vars.RELEASE_SOURCE_SHA===(owner?expected:old.sourceCommit),remoteModules:modules,reviewedCodeUnchanged:modules.length===old.remoteModules.length&&modules.every(m=>old.remoteModules.some(p=>p.sha256===m.sha256)),secretNames,secretsPreserved:JSON.stringify(secretNames)===JSON.stringify(old.secretNames),namespaceBindings:ns,namespacePreserved:JSON.stringify(ns)===JSON.stringify(old.namespaceBindings),realmPreserved:realm===oldSettings.realmHash,subdomain,hostnameStatePreserved:JSON.stringify(subdomain)===JSON.stringify(old.subdomain),flags:Object.fromEntries(flags.map(f=>[f,vars[f]??'NOT_CONFIGURED'])),allExecutionClosed:flags.every(f=>vars[f]==='false'),emailEnabled:vars.OPERATOR_EMAIL_ENABLED,emailStateCorrect:vars.OPERATOR_EMAIL_ENABLED===(owner?'true':'false'),operatorEmailSettings:owner?route:undefined,routeMatches,gatewayDeploymentUnchanged:owner?undefined:deployment.versions[0].version_id===old.versionId,tenantPreserved:!owner||(vars.STAGING_PORTAL_ID==='247646122'&&vars.STAGING_CONTACT_ID==='582095692487'),expectedApproverMapped:owner?undefined:JSON.parse(vars.APPROVER_SUBJECTS_JSON||'{}')['68cac6f1-0127-51c9-a1b2-ee2d5b031945']==='Approver'};
workers.push(row);
}
const verified=workers.every(w=>w.fullyActive&&w.sourceMatches&&w.reviewedCodeUnchanged&&w.secretsPreserved&&w.namespacePreserved&&w.realmPreserved&&w.hostnameStatePreserved&&w.allExecutionClosed&&w.emailStateCorrect&&w.routeMatches&&w.tenantPreserved&&w.gatewayDeploymentUnchanged!==false&&w.expectedApproverMapped!==false);
const report={kind:'ACTUAL_OPERATOR_EMAIL_ACTIVATION_CONFIGURATION_VERIFICATION',checkedAt:new Date().toISOString(),activationSourceCommit:expected,verified,workers,secretValuesRead:false,hubspotCalls:0,modelCalls:0,emailProviderCallsFromCodex:0,actualEmailDeliveryVerified:false,existingTaskEvidence:'operator-operation-evidence.json',limitations:['Email delivery and inbox receipt remain pending an operator-triggered new synthetic finding.','Configuration and code checks do not establish fresh semantic acceptance or exact task execution approval.']};
await writeFile(dir+'/after-activation-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verified,workers:workers.map(w=>({name:w.name,versionId:w.versionId,emailEnabled:w.emailEnabled,allExecutionClosed:w.allExecutionClosed,reviewedCodeUnchanged:w.reviewedCodeUnchanged,secretsPreserved:w.secretsPreserved,namespacePreserved:w.namespacePreserved,gatewayDeploymentUnchanged:w.gatewayDeploymentUnchanged}))},null,2));if(!verified)process.exitCode=1;
