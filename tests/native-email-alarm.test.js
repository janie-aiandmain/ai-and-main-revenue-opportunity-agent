import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from 'miniflare';

test('actual Worker Durable Object alarm sends a queued alert without an operator browser and survives restart without a duplicate',async()=>{
 const dir=await mkdtemp('/tmp/ai-main-email-alarm-');let mf;const delivered=[];
 try{
  const file=dir+'/worker.mjs';
  await build({stdin:{resolveDir:process.cwd(),contents:`
   import {CertificationLedger} from './src/staging/worker.js';
   import {materializeCorrected} from './src/release/reasoning.js';
   import {prepareHistory} from './src/findings.js';
   export class Probe extends CertificationLedger {
    async fetch(r){
     const path=new URL(r.url).pathname;
     if(path==='/seed'){
      const quote='Customer requests Level 2 EV charger pricing.',context={serviceHistory:[{noteId:'n',timestamp:'2026-11-12T12:00:00Z',note:quote}]};
      const reason=async(c,k)=>materializeCorrected({findings:[{opportunityKey:'charger-pricing',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId:'n',quote}],reasoningSummary:'Synthetic test.',recommendedNextAction:'Internal pricing preparation only. No customer contact.',humanReviewRequired:true}]},await prepareHistory(c),k);
      await this.ledger.evaluate(this.env,{readContext:async()=>context},reason);await this.ensureRetentionAlarm();
     }
     if(path==='/restart'){await this.demoContext.storage.sync();this.demoContext.abort('Local synthetic restart');}
     return Response.json({boot:this.bootId,alerts:this.ledger.emailOutbox.status(),alarm:await this.demoContext.storage.getAlarm()});
    }
   }
   export default {fetch(r,e){return e.PROBE.get(e.PROBE.idFromName('synthetic-email')).fetch(r);}}
  `},outfile:file,bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers','node:crypto'],logLevel:'silent'});
  mf=new Miniflare(convertV4MiniflareOptions({name:'email-alarm-local',modules:true,modulesRoot:dir,scriptPath:file,compatibilityDate:'2026-10-09',compatibilityFlags:['nodejs_compat'],durableObjects:{PROBE:{className:'Probe',useSQLite:true}},resourcePersistencePath:dir+'/state',log:new Log(LogLevel.NONE),bindings:{CERTIFICATION_MODE:'local',STAGING_PORTAL_ID:'synthetic',STAGING_CONTACT_ID:'synthetic',OPERATOR_EMAIL_ENABLED:'true',OPERATOR_EMAIL_PROVIDER:'resend',OPERATOR_EMAIL_FROM:'alerts@example.test',OPERATOR_EMAIL_TO:'operator@example.test',OPERATOR_EMAIL_API_KEY:'synthetic-not-a-key',OPERATOR_CONSOLE_URL:'https://demo.example.test/operator'},outboundService:async r=>{
   assert.equal(r.url,'https://api.resend.com/emails');delivered.push({key:r.headers.get('Idempotency-Key'),request:await r.json()});return Response.json({id:'synthetic-mail-1'});
  }}));
  const seed=await(await mf.dispatchFetch('http://local.test/seed')).json();assert(seed.alarm);assert.equal(seed.alerts.length,1);
  let status;
  for(let i=0;i<150;i++){status=await(await mf.dispatchFetch('http://local.test/status')).json();if(status.alerts[0].state==='SENT')break;await new Promise(r=>setTimeout(r,25));}
  assert.equal(status.alerts[0].state,'SENT',JSON.stringify({status,delivered}));assert.equal(delivered.length,1);assert.equal(delivered[0].key,status.alerts[0].id);
  try{const r=await mf.dispatchFetch('http://local.test/restart');await r.text();}catch{}
  const restarted=await(await mf.dispatchFetch('http://local.test/status')).json();assert.notEqual(restarted.boot,status.boot);assert.equal(restarted.alerts[0].state,'SENT');assert.equal(delivered.length,1);
 }finally{await mf?.dispose();await rm(dir,{recursive:true,force:true});}
});
