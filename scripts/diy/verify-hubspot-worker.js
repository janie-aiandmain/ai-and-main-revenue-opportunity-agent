// Actual local workerd/SQLite with outbound fixture services. No live provider.
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';import {generateKeyPairSync,sign} from 'node:crypto';
import {build} from 'esbuild';import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from 'miniflare';import assert from 'node:assert/strict';
import {customerPreviewConfig} from '../../src/diy/hubspot-profile.js';
const dir=await mkdtemp('/tmp/revenue-customer-worker-'),out='products/revenue-rescue-diy/evidence';let mf;
const report={kind:'EXECUTED_LOCAL_WORKER_CUSTOMER_PROFILES_WITH_SYNTHETIC_OUTBOUND_FIXTURES',profiles:[],realHubspotCalls:0,realModelCalls:0,CRMCreates:0,humanApprovals:0,hostedCustomerCertification:false,complete:false};
try{
 await mkdir(out,{recursive:true});await build({entryPoints:['src/diy/hubspot-worker.js'],outfile:dir+'/worker.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers','node:*'],logLevel:'silent'});
 const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'local-customer-fixture',alg:'RS256'};
 for(const [portalId,contactId]of [['111111','222222'],['333333','444444']]){
  const cfg=customerPreviewConfig({cloudflareAccountId:'a'.repeat(32),workerName:'fictional-'+portalId,portalId,contactId,accessIssuer:'https://fixture-customer.cloudflareaccess.com',accessAudience:'b'.repeat(64),roles:{'synthetic-operator':'Approver'},nonProductionPortalConfirmed:true,tenantReviewed:true}),calls=[];
  const text='Synthetic test data only. Customer requested pricing for one Level 2 EV charger. Pricing information only. No installation, scheduling, customer contact or billing was authorized.',noteId='555555';
  const fixture=async request=>{
   const u=new URL(request.url);calls.push({host:u.hostname,path:u.pathname,method:request.method});
   if(u.hostname==='fixture-customer.cloudflareaccess.com'&&u.pathname==='/cdn-cgi/access/certs')return Response.json({keys:[jwk]});
   if(u.hostname==='api.hubapi.com'){
    assert.equal(request.method,'GET','fixture_CRM_mutation_forbidden');
    if(u.pathname==='/account-info/v3/details')return Response.json({portalId});
    if(u.pathname==='/crm/v3/objects/contacts/'+contactId)return Response.json({id:contactId,properties:{firstname:'AI_MAIN_CERTIFICATION_ONLY'}});
    if(u.pathname==='/crm/v4/objects/contacts/'+contactId+'/associations/notes')return Response.json({results:[{toObjectId:noteId}]});
    if(u.pathname==='/crm/v3/objects/notes/'+noteId)return Response.json({id:noteId,properties:{hs_note_body:text,hs_timestamp:'2025-02-13T12:00:00Z'}});
    if(u.pathname==='/crm/v3/objects/tasks')return Response.json({results:[]});
   }
   if(u.hostname==='api.openai.com'&&u.pathname==='/v1/responses'){
    const raw={findings:[{opportunityKey:'ev-charger-pricing',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:text.split(/(?<=\.)\s+/).map(quote=>({noteId,quote})),reasoningSummary:'Synthetic fixture response; not fresh inference.',recommendedNextAction:'Internally prepare the requested pricing only.',humanReviewRequired:true}]};
    return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(raw)}]}]});
   }throw Error('unexpected_outbound_fixture_request');
  };
  const options={name:cfg.name,host:'127.0.0.1',port:0,modules:true,modulesRoot:dir,scriptPath:dir+'/worker.mjs',compatibilityDate:cfg.compatibility_date,compatibilityFlags:cfg.compatibility_flags,durableObjects:{CERTIFICATION_LEDGER:{className:'CertificationLedger',useSQLite:true}},resourcePersistencePath:dir+'/state-'+portalId,log:new Log(LogLevel.ERROR),outboundService:fixture,bindings:{...cfg.vars,STAGING_HUBSPOT_READ_TOKEN:'synthetic-fixture-reader',STAGING_HUBSPOT_WRITE_TOKEN:'synthetic-fixture-writer',EVAL_OPENAI_API_KEY:'synthetic-fixture-model'}};
  mf=new Miniflare(convertV4MiniflareOptions(options));await mf.ready;
  const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url'),b=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({sub:'synthetic-operator',iss:cfg.vars.ACCESS_ISSUER,aud:cfg.vars.ACCESS_AUDIENCE,exp:Date.now()/1000+600}),jwt=b+'.'+sign('RSA-SHA256',Buffer.from(b),pair.privateKey).toString('base64url');
  const call=async path=>{const r=await mf.dispatchFetch('https://fictional.test'+path,{method:'POST',headers:{Authorization:'Bearer '+jwt,'content-type':'application/json'},body:'{}'});return {status:r.status,data:await r.json()};};
  const preflight=await call('/certification/preflight');assert.equal(preflight.status,200,JSON.stringify(preflight.data));assert.equal(preflight.data.portalId,portalId);assert.equal(preflight.data.contactId,contactId);assert.equal(preflight.data.noteCount,1);assert.equal(preflight.data.writesEnabled,false);
  const evaluated=await call('/certification/general/evaluate');assert.equal(evaluated.status,200,JSON.stringify(evaluated.data));assert.equal(evaluated.data.findings.length,1);const finding=evaluated.data.findings[0];assert.equal(finding.reviewState,'PENDING');assert.equal(finding.modelFinding.proposedAction.material.customerActionPermitted,false);
  for(const p of ['/certification/general/approve','/certification/general/execute','/certification/voice/submit'])assert.equal((await call(p)).status,403);
  const saved=await call('/certification/general/findings');assert.equal(saved.data.findings[0].findingId,finding.findingId);assert.equal(calls.filter(c=>c.host==='api.hubapi.com'&&c.method!=='GET').length,0);
  report.profiles.push({portalId,contactId,readOnlyPreflightPassed:true,syntheticFindingCount:1,findingId:finding.findingId,durableReadbackPassed:true,mutationsBlocked:true,fixtureModelCalls:calls.filter(c=>c.host==='api.openai.com').length,outboundFixtureCalls:calls.length});
  await mf.dispose();mf=null;
 }assert.notEqual(report.profiles[0].findingId,report.profiles[1].findingId);report.complete=true;
}catch(error){report.error=String(error.message);process.exitCode=1;}
finally{await mf?.dispose();await rm(dir,{recursive:true,force:true,maxRetries:8,retryDelay:100});await writeFile(out+'/customer-worker-local.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
