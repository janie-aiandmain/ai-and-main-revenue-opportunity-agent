import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import demo from '../src/demo/worker.js';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'legacy-route-test',alg:'RS256'};
const env={DEPLOYMENT_ENVIRONMENT:'staging',CRM_WRITEBACK_ENABLED:'false',CERTIFICATION_MODE:'local',ACCESS_ISSUER:'https://certification.invalid',ACCESS_AUDIENCE:'legacy-route-test',LOCAL_TEST_JWKS_JSON:JSON.stringify({keys:[jwk]}),APPROVER_SUBJECTS_JSON:JSON.stringify({'synthetic-reader':'Viewer'}),HUBSPOT_ACCESS_TOKEN:'synthetic-existing-reader',STAGING_HUBSPOT_READ_TOKEN:'synthetic-designated-reader'};
const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const body=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({iss:env.ACCESS_ISSUER,aud:env.ACCESS_AUDIENCE,sub:'synthetic-reader',exp:Math.floor(Date.now()/1000)+3600});
const jwt=body+'.'+sign('RSA-SHA256',Buffer.from(body),privateKey).toString('base64url');
const request=(path,authenticated=true)=>new Request('https://local.test'+path,{headers:authenticated?{'Cf-Access-Jwt-Assertion':jwt}:{}});
test('configured demo denies legacy diagnostics even with a valid identity and legacy reader binding',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;throw Error('external_requests_forbidden');};
  for(const path of ['/shadow-evaluate','/ai-shadow-evaluate','/hubspot-test','/hubspot-notes-test','/ai-stress-test'])assert.equal((await demo.fetch(request(path),env)).status,404,path);
  assert.equal((await demo.fetch(request('/writeback-task'),env)).status,403);assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('actual staging fetch dispatcher reaches the legacy diagnostic only after authentication and with its legacy reader',async()=>{
 const dir=await mkdtemp('/tmp/ai-main-legacy-route-'),original=globalThis.fetch,calls=[];
 try{
  // Only the import is shimmed; this test never instantiates a Durable Object.
  await build({entryPoints:['src/staging/worker.js'],outfile:dir+'/owner.mjs',bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'no-do-instantiation',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'workers',namespace:'local-test'}));b.onLoad({filter:/.*/,namespace:'local-test'},()=>({contents:'export class DurableObject {}'}));}}]});
  const owner=(await import(pathToFileURL(dir+'/owner.mjs').href)).default;
  globalThis.fetch=async(url,options)=>{
   const path=new URL(String(url)).pathname;calls.push({path,method:options?.method||'GET'});
   if(path==='/crm/v3/objects/contacts')return Response.json({results:[{id:'synthetic-contact',properties:{firstname:'Synthetic',lastname:'Fixture'},associations:{notes:{results:[{id:'newer'},{id:'older'}]}}}]});
   if(path==='/crm/v3/objects/notes/batch/read')return Response.json({results:[{id:'older',properties:{hs_timestamp:'2026-01-01T12:00:00Z',hs_note_body:'Customer requests pricing for a generator.'}},{id:'newer',properties:{hs_timestamp:'2026-10-01T12:00:00Z',hs_note_body:'Customer declines the generator and no follow-up is needed.'}}]});
   throw Error('unconfigured_external_destination_forbidden');
  };
  assert.equal((await owner.fetch(request('/shadow-evaluate',false),env)).status,401);assert.equal(calls.length,0);
  const missing=await owner.fetch(request('/shadow-evaluate'),{...env,HUBSPOT_ACCESS_TOKEN:undefined});assert.equal(missing.status,503);assert.equal(calls.length,0);
  const response=await owner.fetch(request('/shadow-evaluate'),env),result=await response.json();assert.equal(response.status,200);
  assert.equal(result.methodology,'deterministic diagnostic rules v0.3');assert.equal(result.evaluations[0].classification,'no opportunity');assert.equal(result.evaluations[0].humanReviewRequired,false);
  assert.deepEqual(calls,[{path:'/crm/v3/objects/contacts',method:'GET'},{path:'/crm/v3/objects/notes/batch/read',method:'POST'}]);
  // All requests above were intercepted local fixtures; no real CRM/model request.
 }finally{globalThis.fetch=original;await rm(dir,{recursive:true,force:true});}
});
