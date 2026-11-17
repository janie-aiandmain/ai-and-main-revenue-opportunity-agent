// Local workerd integration. No Cloudflare deployment, HubSpot, model or mail access.
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from 'miniflare';
import assert from 'node:assert/strict';

const dir=await mkdtemp(tmpdir()+'/approval-negative-worker-'),root=process.cwd();let mf;
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'negative-local',alg:'RS256'};
const flags=['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED','DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED','DEMO_ONLY_EXECUTION_ENABLED','DEMO_RESPONSE_LOSS_TEST_ENABLED'];
const bindings={CERTIFICATION_MODE:'local',DEPLOYMENT_ENVIRONMENT:'staging',STAGING_PORTAL_ID:'local-fixture',STAGING_CONTACT_ID:'local-fixture-contact',ACCESS_ISSUER:'https://certification.invalid',ACCESS_AUDIENCE:'approval-negative-local',LOCAL_TEST_JWKS_JSON:JSON.stringify({keys:[jwk]}),APPROVER_SUBJECTS_JSON:JSON.stringify({'fixture-approver':'Approver','fixture-viewer':'Viewer'}),OPERATOR_EMAIL_ENABLED:'false',...Object.fromEntries(flags.map(f=>[f,'false']))};
function token(subject='fixture-approver',expired=false){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),data=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({sub:subject,iss:bindings.ACCESS_ISSUER,aud:bindings.ACCESS_AUDIENCE,exp:Date.now()/1000+(expired?-60:3600)});return data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');}
try{
 const entry=dir+'/entry.mjs',bundle=dir+'/worker.mjs';
 await writeFile(entry,`import {operatorGateway} from ${JSON.stringify(resolve(root,'src/release/gateway.js'))}; export {CertificationLedger} from ${JSON.stringify(resolve(root,'src/staging/worker.js'))}; let calls=0;globalThis.fetch=async()=>{calls++;throw Error('no_external_network_in_local_test');};export default {fetch(r,e){if(new URL(r.url).pathname==='/__test_network_count')return Response.json({calls});return operatorGateway(r,e);}};`);
 await build({entryPoints:[entry],outfile:bundle,bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers','node:*'],logLevel:'silent'});
 const options={name:'approval-negative-local',modules:true,modulesRoot:dir,scriptPath:bundle,compatibilityDate:'2026-10-09',compatibilityFlags:['nodejs_compat'],durableObjects:{CERTIFICATION_LEDGER:{className:'CertificationLedger',useSQLite:true}},resourcePersistencePath:dir+'/durable-state',bindings,log:new Log(LogLevel.ERROR)};
 async function start(){mf=new Miniflare(convertV4MiniflareOptions(options));await mf.ready;}
 await start();
 const path='/certification/general/approval-negative-tests',runId='negative-'+randomUUID();
 async function call(body={},jwt=token(),origin){const response=await mf.dispatchFetch('https://worker.test'+path,{method:'POST',headers:{'content-type':'application/json',...(jwt?{Authorization:'Bearer '+jwt}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
 assert.equal((await call({},null)).status,401);
 assert.equal((await call({},token('fixture-approver',true))).status,401);
 assert.equal((await call({},token('fixture-viewer'))).status,403);
 assert.equal((await call({actor:{role:'Admin'}})).status,400);
 assert.equal((await call({},token(),'https://evil.invalid')).status,403);
 const namespace=await mf.getDurableObjectNamespace('CERTIFICATION_LEDGER');
 const actor={subject:'fixture-approver',role:'Approver',kind:'LOCAL_SYNTHETIC'};
 const rootId=namespace.idFromName('release-portal:'+bindings.STAGING_PORTAL_ID+':contact:'+bindings.STAGING_CONTACT_ID);
 const blocked=await namespace.get(rootId).fetch('https://private-ledger'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({runId,actor})});
 assert.equal(blocked.status,409);assert.equal((await blocked.json()).status,'negative_diagnostics_isolated_object_required');
 const run=await call({runId});assert.equal(run.status,200,JSON.stringify(run.body));
 assert.equal(run.body.summary.cases,38);assert.equal(run.body.summary.failed,0,JSON.stringify(run.body.rows.filter(r=>!r.passed)));
 assert.equal(run.body.isolatedObjectVerified,true);assert.equal(run.body.cached,false);
 assert.equal(run.body.executionEnvironment,'LOCAL_WORKER_SQLITE_NOT_HOSTED');
 assert.equal((await call({runId})).body.cached,true);
 const count=await(await mf.dispatchFetch('https://worker.test/__test_network_count')).json();assert.equal(count.calls,0);
 await mf.dispose();await start();
 const restored=await call({runId});assert.equal(restored.status,200);assert.equal(restored.body.cached,true);
 assert.equal(restored.body.ledgerBootId,run.body.ledgerBootId);assert.deepEqual(restored.body.rows,run.body.rows);
 const record={kind:'EXECUTED_LOCAL_WORKER_SQLITE_NOT_HOSTED',runtime:'Miniflare/workerd Durable Object SQLite',matrix:run.body,checks:{unauthenticatedRejected:true,expiredSyntheticJwtRejected:true,viewerRejected:true,actorSpoofRejected:true,crossOriginRejected:true,operationalRootRefused:true,cachedReportNotRerun:true,reportSurvivesRuntimeRestart:true,externalNetworkCalls:count.calls},restarts:1,liveHubSpotTasks:0,hostedExecution:'PENDING_AUTHENTICATED_OPERATOR'};
 await writeFile('docs/review/demo-approval-negatives-2026-11-17/local-worker.json',JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify({cases:run.body.summary.cases,passed:run.body.summary.passed,checks:record.checks,hostedExecution:record.hostedExecution}));
}finally{await mf?.dispose();await rm(dir,{recursive:true,force:true});}
