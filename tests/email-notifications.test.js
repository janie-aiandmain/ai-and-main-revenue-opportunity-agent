import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {GeneralFindingLedger} from '../src/staging/general-ledger.js';
import {materializeCorrected} from '../src/release/reasoning.js';
import {prepareHistory} from '../src/findings.js';
import {emailConfig} from '../src/staging/email-notifications.js';
const clock=Date.parse('2026-11-13T12:00:00Z');
const env={STAGING_PORTAL_ID:'synthetic-portal',STAGING_CONTACT_ID:'synthetic-contact',OPERATOR_EMAIL_ENABLED:'true',OPERATOR_EMAIL_PROVIDER:'resend',OPERATOR_EMAIL_FROM:'alerts@example.test',OPERATOR_EMAIL_TO:'operator@example.test',OPERATOR_EMAIL_API_KEY:'synthetic-not-a-real-key',OPERATOR_CONSOLE_URL:'https://demo.example.test/operator'};
const text='Customer requests Level 2 EV charger pricing.';
const candidate=(quote=text,key='charger-pricing',patch={})=>({opportunityKey:key,classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId:'n',quote}],reasoningSummary:'Synthetic request.',recommendedNextAction:'Internal pricing preparation only. No customer contact.',humanReviewRequired:true,...patch});
function open(path=':memory:',settings=env){
 const raw=new DatabaseSync(path),db={exec:q=>raw.exec(q),prepare:q=>raw.prepare(q),transaction:fn=>{raw.exec('BEGIN IMMEDIATE');try{const r=fn();raw.exec('COMMIT');return r;}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const ledger=new GeneralFindingLedger(db,settings);
 const accept=async(findings=[candidate()],note=text,time=clock)=>{
  const context={serviceHistory:[{noteId:'n',timestamp:'2026-11-12T12:00:00Z',note}]},history=await prepareHistory(context),ticket=ledger.beginEvaluation(settings);
  return ledger.acceptEvaluation(ticket,history,await materializeCorrected({findings},history,'synthetic:email',new Date(time).toISOString()),new Date(time).toISOString());
 };
 return {raw,db,ledger,outbox:ledger.emailOutbox,accept};
}
test('HIGH and Immediate Review each enqueue once; both together produce one email, with minimal metadata',async()=>{
 const a=open();try{
  const [f]=await a.accept();await a.accept();assert.equal(a.outbox.status().length,1);
  assert.equal(a.outbox.status()[0].state,'PENDING');assert.equal(a.raw.prepare('SELECT count(*) n FROM cert_approvals').get().n,0);
  const request=JSON.parse(a.raw.prepare('SELECT request_json FROM operator_email_outbox').get().request_json);
  assert(!request.text.includes(text));assert(!request.text.includes('synthetic-contact'));assert(!request.text.includes('synthetic-portal'));
  assert.match(request.text,/No|no task/);assert.match(request.text,/2026-11-12T12:00:00Z/);assert.match(request.text,new RegExp(f.findingId));
 }finally{a.raw.close();}
 const b=open();try{
  const onsite='While the crew is on site, customer asks for three added outlets and pricing before work continues.';
  await b.accept([candidate(onsite,'outlets',{classification:'scope-change opportunity',opportunityType:'scope change'})],onsite);
  const pending=b.outbox.status().filter(r=>r.state==='PENDING');assert.equal(pending.length,1);
  const urgent=JSON.parse(b.raw.prepare("SELECT request_json FROM operator_email_outbox WHERE state='PENDING'").get().request_json);
  assert.match(urgent.subject,/IMMEDIATE REVIEW/);assert.match(urgent.text,/Historical evidence does not establish current job status/);
 }finally{b.raw.close();}
});
test('a lower-priority finding produces no email; disabled delivery and invalid config never call a provider',async()=>{
 const deferred='Customer wants pendant lighting after the renovation is complete.';
 let a=open();try{
  await a.accept([candidate(deferred,'pendants',{classification:'follow-up revenue opportunity',opportunityType:'follow-up'})],deferred);
  assert.equal(a.outbox.status().length,0);
  a.raw.close();a=open();await a.accept();let calls=0;const fetcher=async()=>{calls++;throw Error('should_not_send');};
  await a.outbox.deliver({...env,OPERATOR_EMAIL_ENABLED:'false'},{fetcher,now:()=>clock});
  assert.equal((await a.outbox.deliver({...env,OPERATOR_EMAIL_API_KEY:''},{fetcher,now:()=>clock})).blocker,'operator_email_configuration_incomplete');assert.equal(calls,0);
  for(const patch of [{OPERATOR_EMAIL_TO:'bad\r\nBcc: other@example.test'},{OPERATOR_EMAIL_PROVIDER:'other'},{OPERATOR_CONSOLE_URL:'https://user:secret@example.test/operator'},{OPERATOR_CONSOLE_URL:'https://demo.example.test/operator?token=secret'}])assert.throws(()=>emailConfig({...env,...patch}));
 }finally{a.raw.close();}
});
test('same opportunity with synonymous key wording keeps durable identity and does not send a second alert',async()=>{
 const a=open();try{
  const [one]=await a.accept();await a.outbox.deliver(env,{now:()=>clock,fetcher:async()=>Response.json({id:'synthetic-mail-1'})});
  const [two]=await a.accept([candidate(text,'ev-charger-quote')]);
  assert.equal(two.findingId,one.findingId);assert.equal(a.outbox.status().length,1);assert.equal(a.outbox.status()[0].state,'SENT');
 }finally{a.raw.close();}
});
test('reordering the same evidence and restrictions does not produce a material-change email',async()=>{
 const a=open();try{
  const restriction='Pricing only; no installation or appointment.',note=text+' '+restriction;
  const evidence=[{noteId:'n',quote:text},{noteId:'n',quote:restriction}];
  await a.accept([candidate(text,'charger-pricing',{evidence})],note);
  await a.accept([candidate(text,'charger-pricing',{evidence:[...evidence].reverse()})],note);
  assert.equal(a.outbox.status().length,1);
 }finally{a.raw.close();}
});
test('material evidence changes create a new alert revision; stale and withdrawn pending alerts are cancelled',async()=>{
 const a=open();try{
  const detail='Customer requests a written estimate for that charger.',note=text+' '+detail;
  await a.accept([candidate()],note);const original=a.outbox.status()[0].id;
  await a.accept([candidate(text,'charger-pricing',{evidence:[{noteId:'n',quote:text},{noteId:'n',quote:detail}]})],note);
  assert.equal(a.outbox.status().find(x=>x.id===original).state,'CANCELLED');assert.equal(a.outbox.status().filter(x=>x.state==='PENDING').length,1);
  await a.accept([]);assert.equal(a.outbox.status().filter(x=>x.state==='PENDING').length,0);
  let calls=0;await a.outbox.deliver(env,{now:()=>clock,fetcher:async()=>{calls++;}});assert.equal(calls,0);
 }finally{a.raw.close();}
});
test('independent needs in one context enqueue independently and cannot be merged into one alert identity',async()=>{
 const a=open();try{
  const second='Separately, customer requests panel pricing.';
  const fs=await a.accept([candidate(),candidate(second,'panel-pricing')],text+' '+second);
  assert.equal(fs.length,2);assert.equal(new Set(fs.map(f=>f.findingId)).size,2);assert.equal(a.outbox.status().length,2);
  let calls=0;await a.outbox.deliver(env,{now:()=>clock,fetcher:async()=>Response.json({id:'synthetic-'+(++calls)})});assert.equal(calls,2);
 }finally{a.raw.close();}
});
test('send intent is persisted and flushed before provider I/O; successful delivery is not repeated',async()=>{
 const a=open();try{
  await a.accept();let flushed=false,calls=0;
  const options={now:()=>clock,flush:async()=>{assert.equal(a.outbox.status()[0].state,'SENDING');flushed=true;},fetcher:async(url,init)=>{
   calls++;assert(flushed);assert.equal(url,'https://api.resend.com/emails');assert.equal(init.redirect,'manual');assert.equal(init.headers['Idempotency-Key'],a.outbox.status()[0].id);return Response.json({id:'synthetic-accepted'});
  }};
  await a.outbox.deliver(env,options);await a.outbox.deliver(env,options);assert.equal(calls,1);assert.equal(a.outbox.status()[0].state,'SENT');
 }finally{a.raw.close();}
});
test('restart after persisted send intent retries the identical request/idempotency key within its bounded window',async()=>{
 const dir=await mkdtemp('/tmp/ai-main-email-');let a=open(dir+'/state.sqlite');
 try{
  await a.accept();const entry=a.raw.prepare('SELECT * FROM operator_email_outbox').get();
  a.raw.prepare("UPDATE operator_email_outbox SET state='SENDING',attempts=1,first_attempt_at=?").run(clock);
  a.raw.close();a=open(dir+'/state.sqlite');a.outbox.recover(clock+1000);
  assert.equal(a.outbox.status()[0].state,'UNKNOWN');let calls=0;
  await a.outbox.deliver(env,{now:()=>clock+1000,fetcher:async(_url,init)=>{calls++;assert.equal(init.headers['Idempotency-Key'],entry.id);assert.equal(init.body,entry.request_json);return Response.json({id:'synthetic-existing-mail'});}});
  assert.equal(calls,1);assert.equal(a.outbox.status()[0].providerId,'synthetic-existing-mail');
 }finally{a.raw.close();await rm(dir,{recursive:true,force:true});}
});
test('an accepting fake provider loses its response; restart and identical-key retry produce only one accepted message',async()=>{
 const dir=await mkdtemp('/tmp/ai-main-email-lost-response-');let a=open(dir+'/state.sqlite');
 const accepted=new Map();let attempts=0;
 const fakeProvider=async(_url,init)=>{
  attempts++;const key=init.headers['Idempotency-Key'];
  if(!accepted.has(key)){accepted.set(key,{request:init.body,id:'synthetic-one-mail'});throw Error('deliberately_lost_response_after_fake_acceptance');}
  assert.equal(init.body,accepted.get(key).request);return Response.json({id:accepted.get(key).id});
 };
 try{
  await a.accept();await a.outbox.deliver(env,{now:()=>clock,fetcher:fakeProvider});assert.equal(a.outbox.status()[0].state,'UNKNOWN');
  a.raw.close();a=open(dir+'/state.sqlite');a.outbox.recover(clock+60001);
  await a.outbox.deliver(env,{now:()=>clock+60001,fetcher:fakeProvider});assert.equal(a.outbox.status()[0].state,'SENT');assert.equal(attempts,2);assert.equal(accepted.size,1);
 }finally{a.raw.close();await rm(dir,{recursive:true,force:true});}
});
test('uncertain outcomes past the provider idempotency window remain blocked without another send',async()=>{
 const a=open();try{
  await a.accept();let calls=0;
  await a.outbox.deliver(env,{now:()=>clock,fetcher:async()=>{calls++;throw Error('synthetic_response_loss');}});
  assert.equal(a.outbox.status()[0].state,'UNKNOWN');
  await a.outbox.deliver(env,{now:()=>clock+24*3600000,fetcher:async()=>{calls++;}});
  assert.equal(calls,1);assert.equal(a.outbox.status()[0].state,'BLOCKED');assert.match(a.outbox.status()[0].errorCode,/manual_resolution/);
 }finally{a.raw.close();}
});
test('temporary errors back off; credential rejection and recipient changes block without leaking provider response bodies',async()=>{
 for(const status of [429,503,401,302]){
  const a=open();try{
   await a.accept();await a.outbox.deliver(env,{now:()=>clock,fetcher:async()=>new Response('synthetic-secret-never-record',{status})});
   assert.equal(a.outbox.status()[0].state,[401,302].includes(status)?'BLOCKED':'RETRY');assert(!JSON.stringify(a.outbox.status()).includes('synthetic-secret'));
   let calls=0;await a.outbox.deliver(env,{now:()=>clock+1,fetcher:async()=>{calls++;}});assert.equal(calls,0);
  }finally{a.raw.close();}
 }
 const a=open();try{await a.accept();let calls=0;await a.outbox.deliver({...env,OPERATOR_EMAIL_TO:'other@example.test'},{now:()=>clock,fetcher:async()=>{calls++;}});assert.equal(calls,0);assert.equal(a.outbox.status()[0].errorCode,'email_route_changed');}finally{a.raw.close();}
});
test('failed or in-progress evaluation cannot send a previously queued alert',async()=>{
 const a=open();try{
  await a.accept();const ticket=a.ledger.beginEvaluation(env);let calls=0;
  await a.outbox.deliver(env,{now:()=>clock,fetcher:async()=>{calls++;}});assert.equal(calls,0);
  a.ledger.failEvaluation(ticket);assert.equal(a.outbox.status()[0].state,'CANCELLED');
 }finally{a.raw.close();}
});
test('a persisted HIGH review triggers an alert; unchanged reevaluation respects the operator priority and keeps execution unapproved',async()=>{
 const a=open();try{
  const quote='Customer wants pendant lighting after the renovation is complete.';
  const [f]=await a.accept([candidate(quote,'pendants',{classification:'follow-up revenue opportunity',opportunityType:'follow-up'})],quote);
  assert.equal(a.outbox.status().length,0);
  const actor={role:'Approver',subject:'synthetic-operator',kind:'LOCAL_SYNTHETIC'};
  const input={findingId:f.findingId,sourceHash:f.sourceHash,candidateHash:f.candidateHash,decision:'REVIEW',attestHumanReview:true,spec:{priority:'HIGH',actionPurpose:'internal_verification',intent:'verify_current_state',timing:{kind:'internal_task'},taskDueAt:new Date(Date.now()+3600000).toISOString(),attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}}};
  const source={readContext:async()=>({serviceHistory:[{noteId:'n',timestamp:'2026-11-12T12:00:00Z',note:quote}]})};
  const checked=await a.ledger.review(input,actor,env,source);a.ledger.finishReview(input,actor,checked,env);
  assert.equal(a.outbox.status().length,1);
  await a.accept([candidate(quote,'pendants',{classification:'follow-up revenue opportunity',opportunityType:'follow-up'})],quote);
  assert.equal(a.outbox.status().length,1);assert.equal(a.raw.prepare('SELECT count(*) n FROM cert_approvals').get().n,0);
  assert.equal(a.raw.prepare('SELECT state FROM cert_operations').get().state,'PREPARED');
 }finally{a.raw.close();}
});
test('Immediate Review still alerts when an operator chooses lower task priority; audit retention clears bodies without losing deduplication',async()=>{
 const a=open();try{
  const quote='While the crew is on site, customer asks for three added outlets and pricing before work continues.';
  const [f]=await a.accept([candidate(quote,'outlets',{classification:'scope-change opportunity',opportunityType:'scope change'})],quote);
  a.outbox.observe(f,a.ledger.contextKey(env),env,clock,'MEDIUM');
  assert.equal(a.outbox.status().filter(r=>r.state==='PENDING').length,1);
  await a.outbox.deliver(env,{now:()=>clock,fetcher:async()=>Response.json({id:'synthetic-immediate'})});
  a.outbox.prune(365,clock+366*86400000);
  assert(a.raw.prepare('SELECT request_json FROM operator_email_outbox').all().every(r=>r.request_json==='{}'));
  const count=a.outbox.status().length;a.outbox.observe(f,a.ledger.contextKey(env),env,clock,'MEDIUM');assert.equal(a.outbox.status().length,count);
 }finally{a.raw.close();}
});
