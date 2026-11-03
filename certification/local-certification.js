import { mkdtemp,rm,mkdir,writeFile,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { generateKeyPairSync,sign } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare,Log,LogLevel,convertV4MiniflareOptions } from 'miniflare';
import assert from 'node:assert/strict';
import { startFixture } from './http-fixture.js';
import { prepareHistory } from '../src/findings.js';
import { dirname } from 'node:path';
import { Script } from 'node:vm';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const dir=await mkdtemp(tmpdir()+'/worker-certification-');
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'local-test-key',alg:'RS256',use:'sig'};
function jwt(sub='local-approver',expired=false){const head=encode({alg:'RS256',kid:jwk.kid}),payload=encode({sub,iss:'https://certification.invalid',aud:'certification-local',exp:Math.floor(Date.now()/1000)+(expired?-1:3600)}),input=head+'.'+payload;return input+'.'+sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');}
let mf,fixture,restarts=0;
try{
  const bundle=dir+'/worker.mjs';await build({entryPoints:['src/staging/worker.js'],outfile:bundle,bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers','node:*'],logLevel:'silent'});
  fixture=await startFixture(dir+'/external-service.sqlite');
  const options={name:'ai-main-certification-local',modules:true,modulesRoot:dir,scriptPath:bundle,compatibilityDate:'2026-10-09',compatibilityFlags:['nodejs_compat'],durableObjects:{CERTIFICATION_LEDGER:{className:'CertificationLedger',useSQLite:true}},resourcePersistencePath:dir+'/durable-state',log:new Log(LogLevel.ERROR),bindings:{DEPLOYMENT_ENVIRONMENT:'staging',CERTIFICATION_MODE:'local',CRM_WRITEBACK_ENABLED:'false',ENABLE_TEST_TASK_WRITES:'true',STAGING_PORTAL_ID:'test-portal-001',STAGING_CONTACT_ID:'fixture-contact-001',LOCAL_HUBSPOT_FIXTURE_URL:fixture.base,STAGING_HUBSPOT_READ_TOKEN:'local-read',STAGING_HUBSPOT_WRITE_TOKEN:'local-write',ACCESS_ISSUER:'https://certification.invalid',ACCESS_AUDIENCE:'certification-local',LOCAL_TEST_JWKS_JSON:JSON.stringify({keys:[jwk]}),EVAL_OPENAI_API_KEY:'local-eval',LOCAL_MODEL_FIXTURE_URL:fixture.base,ENABLE_LOCAL_GENERAL_TEST_EXECUTION:'false',APPROVER_SUBJECTS_JSON:JSON.stringify({'local-approver':'Approver','local-viewer':'Viewer'})}};
  const start=async()=>{mf=new Miniflare(convertV4MiniflareOptions(options));await mf.ready;};await start();
  const call=async(path,body,token=jwt())=>{const r=await mf.dispatchFetch('http://worker.test'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await r.json();return {status:r.status,data};};
  const must=async(path,body)=>{const r=await call(path,body);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
  const restart=async()=>{await mf.dispose();await start();restarts++;};
  const dueAt=new Date(Date.now()+7200000).toISOString();
  assert.equal((await call('/certification/metrics',{},null)).status,401);
  assert.equal((await call('/certification/metrics',{},jwt('local-approver',true))).status,401);
  const forged=jwt().split('.');forged[2]=(forged[2][0]==='A'?'B':'A')+forged[2].slice(1);
  assert.equal((await call('/certification/metrics',{},forged.join('.'))).status,401);
  const accessResponse=await mf.dispatchFetch('http://worker.test/certification/metrics',{method:'POST',headers:{'content-type':'application/json','Cf-Access-Jwt-Assertion':jwt()},body:'{}'});assert.equal(accessResponse.status,200);
  const ambiguousResponse=await mf.dispatchFetch('http://worker.test/certification/metrics',{method:'POST',headers:{'content-type':'application/json','Cf-Access-Jwt-Assertion':jwt(),Authorization:'Bearer different'},body:'{}'});assert.equal(ambiguousResponse.status,401);
  const crossOrigin=await mf.dispatchFetch('http://worker.test/certification/metrics',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+jwt(),Origin:'https://different.invalid'},body:'{}'});assert.equal(crossOrigin.status,403);
  const consoleResponse=await mf.dispatchFetch('http://worker.test/operator',{headers:{Authorization:'Bearer '+jwt()}});assert.equal(consoleResponse.status,200);assert.match(consoleResponse.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  const consoleHtml=await consoleResponse.text();assert.match(consoleHtml,/agent operator console/);new Script(consoleHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  const failures=JSON.parse(await readFile('fixtures/certification-failures-v1.json','utf8'));
  const flagged=[];for(const c of failures.cases){const r=await call('/certification/prepare',{fixtureId:c.id,dueAt,humanReview:{status:'PASS'}});assert.equal(r.status,423);flagged.push({id:c.id,status:'LOCAL_BLOCK_VERIFIED',response:r.data,humanReview:{status:'PENDING',verdict:null}});}
  const a=await must('/certification/prepare',{fixtureId:'CONTROL',dueAt});
  assert.equal((await call('/certification/approve',{operationId:a.operationId,payloadHash:a.payloadHash,actor:{role:'Approver'}},jwt('local-viewer'))).status,403);
  const approvalA=await must('/certification/approve',{operationId:a.operationId,payloadHash:a.payloadHash});
  fixture.setMode(a.correlation,'create-drop');fixture.hide(a.correlation);
  const lost=await must('/certification/execute',{operationId:a.operationId,approvalId:approvalA.approvalId});assert.equal(lost.state,'UNKNOWN');assert.equal(fixture.tasks(a.correlation).length,1);
  await restart();
  const notYetVisible=await must('/certification/execute',{operationId:a.operationId,approvalId:approvalA.approvalId});assert.equal(notYetVisible.state,'UNKNOWN');assert.equal(fixture.attempts(a.correlation),1);
  fixture.reveal(a.correlation);
  const recovered=await must('/certification/execute',{operationId:a.operationId,approvalId:approvalA.approvalId});assert.equal(recovered.state,'CONFIRMED');assert.equal(fixture.attempts(a.correlation),1);
  const b=await must('/certification/prepare',{fixtureId:'CONTROL_NO_MATCH',dueAt});const approvalB=await must('/certification/approve',{operationId:b.operationId,payloadHash:b.payloadHash});
  fixture.setMode(b.correlation,'drop-without-create');await must('/certification/execute',{operationId:b.operationId,approvalId:approvalB.approvalId});await restart();
  const noMatch=await must('/certification/execute',{operationId:b.operationId,approvalId:approvalB.approvalId});assert.equal(noMatch.state,'UNKNOWN');assert.equal(fixture.attempts(b.correlation),1);assert.equal(fixture.tasks(b.correlation).length,0);
  fixture.setLookupUnavailable(true);const unavailable=await must('/certification/reconcile',{operationId:b.operationId});fixture.setLookupUnavailable(false);assert.equal(unavailable.state,'UNKNOWN');
  const c=await must('/certification/prepare',{fixtureId:'CONTROL_CRASH',dueAt});const approvalC=await must('/certification/approve',{operationId:c.operationId,payloadHash:c.payloadHash});
  fixture.setMode(c.correlation,'create-hold');
  const inFlight=call('/certification/execute',{operationId:c.operationId,approvalId:approvalC.approvalId}).catch(()=>null);
  for(let i=0;i<100&&!fixture.tasks(c.correlation).length;i++)await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(fixture.tasks(c.correlation).length,1);await restart();await inFlight;
  const crashRecovered=await must('/certification/execute',{operationId:c.operationId,approvalId:approvalC.approvalId});assert.equal(crashRecovered.state,'CONFIRMED');assert.equal(fixture.attempts(c.correlation),1);
  assert.ok(crashRecovered.trace.some(t=>t.event==='RESTART_RECOVERED_UNCERTAIN_NO_CREATE'));
  const d=await must('/certification/prepare',{fixtureId:'CONTROL_CHANGED',dueAt});const oldGrant=await must('/certification/approve',{operationId:d.operationId,payloadHash:d.payloadHash});
  const changed=await must('/certification/prepare',{fixtureId:'CONTROL_CHANGED',dueAt:new Date(Date.parse(dueAt)+3600000).toISOString()});assert.notEqual(changed.payloadHash,d.payloadHash);
  assert.equal((await call('/certification/execute',{operationId:d.operationId,approvalId:oldGrant.approvalId})).status,409);assert.equal(fixture.attempts(d.correlation),0);
  const newGrant=await must('/certification/approve',{operationId:d.operationId,payloadHash:changed.payloadHash});const changedDone=await must('/certification/execute',{operationId:d.operationId,approvalId:newGrant.approvalId});assert.equal(changedDone.state,'CONFIRMED');
  const beforeOutcome=await must('/certification/metrics',{});assert.equal(beforeOutcome.confirmedTaskCount,3);assert.equal(beforeOutcome.verifiedTestOutcomes.length,0);assert.equal(beforeOutcome.revenueRescued,null);
  fixture.outcome('synthetic-outcome-1',recovered.remoteTaskId);
  const outcomes=[];for(let i=0;i<5;i++)outcomes.push(await must('/certification/outcome',{operationId:a.operationId,externalRef:'synthetic-outcome-1'}));
  assert.equal(outcomes.filter(r=>r.recorded).length,1);await restart();
  const afterOutcome=await must('/certification/metrics',{});assert.equal(afterOutcome.verifiedTestOutcomes.length,1);assert.equal(afterOutcome.revenueRescued,null);
  for(const op of [recovered,crashRecovered,changedDone]){
    const actual=fixture.allTasks().find(t=>t.correlation===op.correlation);
    assert.deepEqual(actual.body,op.finalRequest.body);
  }
  let general=null;
  if(process.env.RUN_GENERAL_CERTIFICATION==='true'){
    const { certifyGeneral }=await import('./general-scenarios.js');
    general=await certifyGeneral({fixture,must,call,restart,options,dueAt});
  }
  const record={generalIntegration:general,kind:'EXECUTED_LOCAL_WORKER_CERTIFICATION_NOT_HOSTED_HUBSPOT',runtime:'Miniflare/workerd with Durable Object SQLite',separateService:'Independent HTTP fixture with its own SQLite effects',restarts,flaggedCases:flagged,identityChecks:{unauthenticatedRejected:true,expiredTokenRejected:true,forgedTokenRejected:true,accessHeaderSignatureVerified:true,ambiguousHeadersRejected:true,crossOriginRejected:true,operatorConsoleResponseAndScriptSyntaxVerified:true,viewerBodyRoleSpoofRejected:true,viewerApprovalRejected:true,issuer:'ephemeral synthetic RS256 test identity; no human sign-off'},scenarios:{lostResponse:{initial:a,afterLoss:lost,whileHidden:notYetVisible,recovered,postCount:fixture.attempts(a.correlation)},noProvenMatch:{operation:noMatch,lookupUnavailable:unavailable,postCount:fixture.attempts(b.correlation),remoteTaskId:null},restartDuringPost:{recovered:crashRecovered,postCount:fixture.attempts(c.correlation)},changedPayload:{oldHash:d.payloadHash,newHash:changed.payloadHash,oldApprovalRejected:true,confirmed:changedDone}},metricsBeforeVerifiedOutcome:beforeOutcome,metricsAfterVerifiedOutcome:afterOutcome,outcomeAttempts:outcomes,fixtureTasks:fixture.allTasks(),tenantIdentityReads:fixture.identityChecks(),realHubSpotTaskIds:[],hostedGate:'PENDING_ACCESS_AND_HUMAN_REVIEW',productionWritebackEnabled:false,productionRuntimeState:'Not remotely inspected or changed',newModelCalls:0};
  const output=process.env.CERTIFICATION_EVIDENCE_PATH||'reports/local-worker-certification.json';
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({executed:true,restarts,confirmedFixtureTasks:fixture.allTasks().length,lostResponsePostCount:fixture.attempts(a.correlation),unknownOutcomePostCount:fixture.attempts(b.correlation),verifiedTestOutcomes:afterOutcome.verifiedTestOutcomes.length,hosted:'PENDING'}));
}finally{if(mf)await mf.dispose();if(fixture)await fixture.close();await rm(dir,{recursive:true,force:true});}
