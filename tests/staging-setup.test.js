import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateKeyPairSync,sign } from 'node:crypto';
import { stagingConfig } from '../scripts/staging/configure.js';
import { verifyOperator } from '../src/staging/auth.js';
import { HubSpotCertificationClient } from '../src/staging/hubspot-client.js';
import { reasonCorrected } from '../src/findings-v0.3.2.js';
import { generalProjection } from '../src/staging/review-policy.js';
const template=JSON.parse(await readFile('wrangler.staging.jsonc','utf8'));
const settings={accountId:'a'.repeat(32),stagingPortalId:'247646122',productionPortalId:'100000001',stagingContactId:'100000002',accessIssuer:'https://test-team.cloudflareaccess.com',accessAudience:'b'.repeat(64),subjects:{'test-subject':'Approver'}};
test('prepared staging Worker and SQLite namespace are separate and cannot enable writes or copy production IDs',()=>{
 const out=stagingConfig(settings,{...template,vars:{...template.vars,ENABLE_TEST_TASK_WRITES:'true',ENABLE_GENERAL_EXECUTION:'true',CRM_WRITEBACK_ENABLED:'true',GENERAL_RELEASE_APPROVED:'true'}},'/workspace/test');
 assert.equal(out.name,'ai-and-main-revenue-opportunity-staging');assert.equal(out.workers_dev,false);assert.equal(out.keep_vars,false);
 for(const flag of ['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED'])assert.equal(out.vars[flag],'false');
 assert.equal(out.durable_objects.bindings[0].class_name,'CertificationLedger');assert.deepEqual(out.migrations[0].new_sqlite_classes,['CertificationLedger']);
 assert.throws(()=>stagingConfig({...settings,productionPortalId:settings.stagingPortalId},template,'/tmp'),/differ/);
 assert.throws(()=>stagingConfig({...settings,writeToken:'not-allowed-here'},template,'/tmp'),/ordinary/);
 assert.throws(()=>stagingConfig(settings,{...template,name:'ai-and-main-revenue-opportunity-agent'},'/tmp'),/separate/);
 assert.throws(()=>stagingConfig({...settings,productionPortalId:'none'},template,'/tmp'),/numeric/);
});
test('read-only preflight uses both credential identities but cannot create even when a write token exists',async t=>{
 const env={DEPLOYMENT_ENVIRONMENT:'staging',CERTIFICATION_MODE:'remote-staging',CRM_WRITEBACK_ENABLED:'false',ENABLE_TEST_TASK_WRITES:'false',STAGING_ISOLATION_APPROVED:'true',STAGING_PORTAL_ID:'247646122',PRODUCTION_PORTAL_ID:'100000001',STAGING_CONTACT_ID:'100000002',STAGING_HUBSPOT_READ_TOKEN:'test-reader',STAGING_HUBSPOT_WRITE_TOKEN:'test-writer'};
 const calls=[];t.mock.method(globalThis,'fetch',async(url,o)=>{calls.push({url,method:o.method});return Response.json(String(url).includes('account-info')?{portalId:'247646122'}:{id:'100000002',properties:{firstname:'AI_MAIN_CERTIFICATION_ONLY'}});});
 const client=new HubSpotCertificationClient(env,{readOnly:true});await client.verifyIsolation();await assert.rejects(client.create('{}'),/read_only/);assert.ok(calls.every(c=>c.method==='GET'));assert.equal(calls.length,3);
 assert.throws(()=>new HubSpotCertificationClient(env),/isolation/);
});
test('Access-injected JWT receives the same signature/issuer/audience/role checks as Bearer',async()=>{
 const pair=generateKeyPairSync('rsa',{modulusLength:2048});const jwk={...pair.publicKey.export({format:'jwk'}),kid:'test-key'};
 const env={CERTIFICATION_MODE:'local',ACCESS_ISSUER:'https://certification.invalid',ACCESS_AUDIENCE:'test-aud',APPROVER_SUBJECTS_JSON:JSON.stringify({'test-user':'Viewer'}),LOCAL_TEST_JWKS_JSON:JSON.stringify({keys:[jwk]})};
 const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),data=encode({alg:'RS256',kid:'test-key'})+'.'+encode({sub:'test-user',iss:env.ACCESS_ISSUER,aud:env.ACCESS_AUDIENCE,exp:Date.now()/1000+300,role:'Admin'});
 const token=data+'.'+sign('RSA-SHA256',Buffer.from(data),pair.privateKey).toString('base64url');
 const verified=await verifyOperator(new Request('https://staging/',{headers:{'Cf-Access-Jwt-Assertion':token}}),env);assert.equal(verified.role,'Viewer');
 await assert.rejects(verifyOperator(new Request('https://staging/',{headers:{'Cf-Access-Jwt-Assertion':token,Authorization:'Bearer different'}}),env),/ambiguous/);
 await assert.rejects(verifyOperator(new Request('https://staging/',{headers:{'Cf-Access-Jwt-Assertion':token}}),{...env,ACCESS_AUDIENCE:'wrong'}),/identity_audience_mismatch/);
});
test('hosted reasoning cannot redirect the evaluation credential to a local fixture',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',()=>{calls++;throw Error('must_not_call');});
 await assert.rejects(reasonCorrected({EVAL_OPENAI_API_KEY:'synthetic-key',CERTIFICATION_MODE:'remote-staging',LOCAL_MODEL_FIXTURE_URL:'http://127.0.0.1:1'}, {serviceHistory:[]},'ctx'),/fixture_forbidden/);assert.equal(calls,0);
});
test('an unseen absolute expired deadline and unresolved current tomorrow cannot be hidden by a new task due time',()=>{
 const make=text=>({opportunityKey:'pricing',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',humanReviewRequired:true,evidence:[{noteId:'n1',quote:text}],recommendedNextAction:'Human review pricing.',reasoningSummary:'Synthetic.'});
 const spec={intent:'prepare_quote',priority:'MEDIUM',timing:{kind:'none'},taskDueAt:'2026-11-04T12:00:00Z',attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}};
 for(const text of ['Customer requests pricing by 2023-04-18.','Customer requests pricing tomorrow.'])assert.throws(()=>generalProjection(make(text),[{noteId:'n1',timestamp:'2026-11-03T10:00:00Z',note:text}],spec,'ctx','2026-11-03T12:00:00Z'),/deadline/);
});
test('production verification never probes mutations and does not infer disabled state from network or malformed health errors',async()=>{
 const {verifyProduction}=await import('../scripts/staging/verify-production.js');const calls=[];
 const off=await verifyProduction(async(url,o)=>{calls.push({url,method:o.method});return Response.json({crmWritesEnabled:false,release:'test'});});assert.equal(off.verified,true);assert.equal(off.crmWritesEnabled,false);
 const unknown=await verifyProduction(async()=>{throw Error('network_unavailable');});assert.equal(unknown.verified,false);assert.equal(unknown.crmWritesEnabled,null);
 const unreported=await verifyProduction(async()=>Response.json({status:'ready'}));assert.equal(unreported.verified,false);assert.equal(unreported.crmWritesEnabled,null);
 assert.deepEqual(calls.map(c=>c.method),['GET']);assert.ok(calls.every(c=>c.url==='https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/health'));
});
test('untrusted quote markup is encoded before final payload hashing while original evidence remains verbatim',()=>{
 const text='Customer requests pricing for <em>surge</em> protection.',f={opportunityKey:'surge',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',humanReviewRequired:true,evidence:[{noteId:'n1',quote:text}],recommendedNextAction:'Human review pricing.',reasoningSummary:'Synthetic.'};
 const spec={intent:'prepare_quote',priority:'MEDIUM',timing:{kind:'none'},taskDueAt:'2026-11-04T12:00:00Z',attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}};
 const projection=generalProjection(f,[{noteId:'n1',timestamp:'2026-11-03T10:00:00Z',note:text}],spec,'ctx','2026-11-03T12:00:00Z');
 assert.doesNotMatch(projection.payload.properties.hs_task_body,/<em>/);assert.match(projection.payload.properties.hs_task_body,/&lt;em&gt;/);assert.equal(projection.material.evidence[0].quote,text);
});
test('missing, rejected, insufficient, portal/contact mismatch and network blockers are distinct and never serialize token values',async t=>{
 const {StagingBlocker,checkedJsonFetch,missingCredential}=await import('../src/staging/blockers.js');
 const token='sensitive-test-value-not-for-output';
 assert.equal(missingCredential('STAGING_HUBSPOT_READ_TOKEN').code,'missing_credential');
 for(const [status,code] of [[401,'rejected_credential'],[403,'insufficient_permission']]){
  t.mock.method(globalThis,'fetch',async()=>Response.json({message:token,errors:[{context:{requiredScopes:['crm.objects.tasks.read']}}]},{status}));
  await assert.rejects(checkedJsonFetch('https://api.hubapi.com/account-info/v3/details',{headers:{Authorization:'Bearer '+token}},'STAGING_HUBSPOT_READ_TOKEN','identity'),e=>{assert.equal(e.code,code);assert.doesNotMatch(JSON.stringify(e.toJSON()),new RegExp(token));assert.ok(e.details.setupAction);assert.equal(e.details.permissionsExpanded,false);return true;});
 }
 t.mock.method(globalThis,'fetch',async()=>{throw Error(token);});await assert.rejects(checkedJsonFetch('https://api.hubapi.com/account-info/v3/details',{},'reader','identity'),e=>e.code==='blocked_network_access'&&!JSON.stringify(e.toJSON()).includes(token));
 for(const [code,step] of [['portal_mismatch',2],['contact_mismatch',3]]){const e=new StagingBlocker(code,{setupStep:step});assert.equal(e.code,code);assert.equal(e.details.setupStep,step);}
});
test('production host denied by the configured network policy is reported before any credential or origin check',async()=>{
 const {verifyProduction}=await import('../scripts/staging/verify-production.js');let calls=0;
 const result=await verifyProduction(async()=>{calls++;}, {http_network_policy:{type:'restricted',egress_rules:[{host:'api.openai.com'}]}});
 assert.equal(result.blocker.code,'blocked_network_access');assert.equal(result.blocker.setupStep,11);assert.equal(result.attemptedHTTP,false);assert.equal(result.verified,false);assert.equal(result.crmWritesEnabled,null);assert.equal(calls,0);
});
test('operator console uses CSP, no credential entry, and compiles its served script',async()=>{
 const {operatorConsole}=await import('../src/staging/operator-console.js'),{Script}=await import('node:vm');
 const response=operatorConsole({STAGING_PORTAL_ID:'247646122',STAGING_CONTACT_ID:'582095692487'}),html=await response.text();
 assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);assert.equal((html.match(/<script /g)||[]).length,1);new Script(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
 assert.doesNotMatch(html,/input[^>]*type=["']password/);assert.match(html,/HubSpot remains the system of record/);
});
