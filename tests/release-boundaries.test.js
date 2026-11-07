import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {operatorGateway} from '../src/release/gateway.js';
import {tenantConfiguration} from '../src/release/tenant.js';
import {checkedJsonFetch} from '../src/staging/blockers.js';
import {HubSpotCertificationClient} from '../src/staging/hubspot-client.js';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'release-test',alg:'RS256'};
const env={DEPLOYMENT_ENVIRONMENT:'staging',CRM_WRITEBACK_ENABLED:'false',CERTIFICATION_MODE:'local',ACCESS_ISSUER:'https://certification.invalid',ACCESS_AUDIENCE:'release-local',LOCAL_TEST_JWKS_JSON:JSON.stringify({keys:[jwk]}),APPROVER_SUBJECTS_JSON:JSON.stringify({'test-viewer':'Viewer','test-approver':'Approver'}),STAGING_PORTAL_ID:'local',STAGING_CONTACT_ID:'contact'};
function token(subject){const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const b=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({iss:env.ACCESS_ISSUER,aud:env.ACCESS_AUDIENCE,sub:subject,exp:Math.floor(Date.now()/1000)+3600});return b+'.'+sign('RSA-SHA256',Buffer.from(b),privateKey).toString('base64url');}
const req=(path,subject,body)=>new Request('https://local.test'+path,{method:body?'POST':'GET',headers:{...(subject?{Authorization:'Bearer '+token(subject)}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
test('only a cryptographically verified subject can read its own identity before role mapping',async()=>{
 assert.equal((await operatorGateway(req('/identity'),env)).status,401);
 const r=await operatorGateway(req('/identity','unmapped-self'),{...env,APPROVER_SUBJECTS_JSON:undefined});assert.equal(r.status,200);const d=await r.json();assert.equal(d.subject,'unmapped-self');assert.equal(d.configuredRole,null);assert.equal(d.kind,'VERIFIED_SELF_IDENTITY_NOT_APPROVAL');
 assert.equal((await operatorGateway(req('/operator','unmapped-self'),env)).status,403);
});
test('viewer body spoofing, direct legacy routes and cross-origin requests cannot grant write authority',async()=>{
 assert.equal((await operatorGateway(req('/certification/general/evaluate','test-viewer',{actor:{role:'Admin'}}),env)).status,403);
 assert.equal((await operatorGateway(req('/writeback-task','test-approver',{}),env)).status,403);
 const r=req('/certification/general/evaluate','test-approver',{});r.headers.set('Origin','https://evil.invalid');assert.equal((await operatorGateway(r,env)).status,403);
 assert.equal((await operatorGateway(req('/ai-shadow-evaluate','test-approver'),env)).status,404);
});
test('customer configuration needs an explicitly approved tenant and record; demo cannot use another portal',()=>{
 const demo={...env,CERTIFICATION_MODE:'remote-demo',STAGING_PORTAL_ID:'247646122',STAGING_CONTACT_ID:'582095692487',STAGING_ISOLATION_APPROVED:'true'};assert.equal(tenantConfiguration(demo).synthetic,true);assert.throws(()=>tenantConfiguration({...demo,STAGING_PORTAL_ID:'1'}));
 const customer={...demo,DEPLOYMENT_ENVIRONMENT:'customer',CERTIFICATION_MODE:'remote-single-tenant',APPROVED_PORTAL_ID:'1',APPROVED_CONTACT_ID:'2',STAGING_PORTAL_ID:'1',STAGING_CONTACT_ID:'2',SYNTHETIC_RECORDS_ONLY:'false',TENANT_CONFIGURATION_APPROVED:'true'};assert.equal(tenantConfiguration(customer).synthetic,false);assert.throws(()=>tenantConfiguration({...customer,STAGING_CONTACT_ID:'3'}));assert.throws(()=>tenantConfiguration({...customer,TENANT_CONFIGURATION_APPROVED:'false'}));
});
test('rate limits and timeouts are safe distinct blockers without response bodies or automatic create retries',async()=>{
 const saved=globalThis.fetch;try{
 globalThis.fetch=async()=>new Response('sensitive upstream detail',{status:429,headers:{'retry-after':'30'}});await assert.rejects(checkedJsonFetch('https://api.invalid',{},'TEST','test'),e=>e.code==='rate_limited'&&e.details.retryAfterSeconds===30&&!JSON.stringify(e.toJSON()).includes('sensitive'));
 globalThis.fetch=async()=>{throw new DOMException('private details','TimeoutError');};await assert.rejects(checkedJsonFetch('https://api.invalid',{},'TEST','test'),e=>e.code==='upstream_timeout');
 }finally{globalThis.fetch=saved;}
});
test('task lookup enumerates only the permitted contact, completes paging and does not trust a known task ID',async()=>{
 const c=new HubSpotCertificationClient({...env,LOCAL_HUBSPOT_FIXTURE_URL:'http://127.0.0.1:1',ENABLE_TEST_TASK_WRITES:'true',STAGING_HUBSPOT_READ_TOKEN:'test-read',STAGING_HUBSPOT_WRITE_TOKEN:'test-write'});
 const calls=[];c.request=async path=>{calls.push(path);if(path.includes('/associations/tasks'))return path.includes('after=')?{results:[{toObjectId:'two'}]}:{results:[{toObjectId:'one'}],paging:{next:{after:'next'}}};return {id:path.includes('/one?')?'one':'two',properties:{hs_task_body:'[AI_MAIN_CORRELATION:c]'},associations:{contacts:{results:[{id:env.STAGING_CONTACT_ID}]}}};};
 assert.equal((await c.lookup('c','one')).length,2);assert.ok(calls.some(p=>p.includes('after=next')));assert.ok(calls.every(p=>!p.startsWith('/crm/v3/objects/tasks?')));
 c.request=async()=>({results:[],paging:{next:{after:'again'}}});await assert.rejects(c.lookup('c'),/lookup_limit_incomplete/);
});
test('a closed demo gateway cannot forward an execute even if its ledger owner were misconfigured open',async()=>{
 let forwarded=0;const binding={idFromName(){return 'test';},get(){return {fetch(){forwarded++;return Response.json({state:'SENDING'});}};}};
 const r=await operatorGateway(req('/certification/general/execute','test-approver',{operationId:'op',approvalId:'grant'}),{...env,ENABLE_GENERAL_EXECUTION:'false',GENERAL_RELEASE_APPROVED:'false',DEMO_RECOVERY_LEDGER:binding});assert.equal(r.status,403);assert.equal(forwarded,0);
});
test('demo preflight distinguishes rejected owner credentials from existing healthy credentials without substituting or writing',async()=>{
 const remote={...env,CERTIFICATION_MODE:'remote-demo',ACCESS_ISSUER:'https://release-test.cloudflareaccess.com',LOCAL_TEST_JWKS_JSON:undefined,STAGING_PORTAL_ID:'247646122',STAGING_CONTACT_ID:'582095692487',HUBSPOT_ACCESS_TOKEN:'synthetic-original-reader',HUBSPOT_WRITE_TOKEN:'synthetic-original-writer'};
 const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),data=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({iss:remote.ACCESS_ISSUER,aud:remote.ACCESS_AUDIENCE,sub:'test-approver',exp:Date.now()/1000+3600}),jwt=data+'.'+sign('RSA-SHA256',Buffer.from(data),privateKey).toString('base64url');
 const saved=globalThis.fetch,calls=[];try{globalThis.fetch=async(url,options)=>{calls.push({url:String(url),method:options?.method||'GET'});if(String(url).includes('/certs'))return Response.json({keys:[jwk]});if(String(url).includes('/account-info/'))return Response.json({portalId:'247646122'});return Response.json({id:'582095692487',properties:{firstname:'AI_MAIN_CERTIFICATION_ONLY'}});};
 const owner={idFromName(){return 'test';},get(){return {fetch(){return Response.json({status:'rejected_credential',blocker:{code:'rejected_credential',credential:'STAGING_HUBSPOT_READ_TOKEN',httpStatus:401}},{status:401});}};}};
 const response=await operatorGateway(new Request('https://demo.test/certification/preflight',{method:'POST',headers:{Authorization:'Bearer '+jwt,'content-type':'application/json'},body:'{}'}),{...remote,DEMO_RECOVERY_LEDGER:owner});assert.equal(response.status,401);const result=await response.json();assert.equal(result.blocker.credential,'STAGING_HUBSPOT_READ_TOKEN');assert.ok(result.originalDemoCredentialProof.checks.every(c=>c.status==='PASS'));assert.equal(result.originalDemoCredentialProof.contactMarkerVerified,true);assert.equal(result.credentialsNotSubstituted,true);assert.ok(calls.every(c=>c.method==='GET'));
 }finally{globalThis.fetch=saved;}
});
