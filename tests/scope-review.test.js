import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareHistory} from '../src/findings.js';
import {materializeCorrected} from '../src/release/reasoning.js';
const time='2026-11-12T12:00:00Z';
const candidate=quote=>({opportunityKey:'extra-work',classification:'scope-change opportunity',opportunityType:'scope change',confidence:'high',evidence:[{noteId:'n',quote}],reasoningSummary:'Synthetic customer scope request.',recommendedNextAction:'Internally verify current job status and pricing before additional work. No customer contact.',humanReviewRequired:true});
async function run(text,patch={},extra=[]){const h=await prepareHistory({serviceHistory:[{noteId:'n',timestamp:'2026-10-22T14:00:00Z',note:text},...extra]});return materializeCorrected({findings:[{...candidate(text),...patch}]},h,'synthetic:scope-routing',time);}
test('ST03 and EN31 receive an immediate-review flag and HIGH priority, without invalid CRM status/type values',async()=>{
 const p=JSON.parse(await readFile('docs/review/semantic-diagnostic-cycle/review-packet.json','utf8'));
 for(const id of ['ST03','EN31']){
  const old=p.items.find(i=>i.caseId===id),h=await prepareHistory(old.sourceContext),{findingId,proposedAction,...raw}=old.finding;
  const actual=await materializeCorrected({findings:[raw]},h,'synthetic:'+id,time),f=actual.findings[0],a=f.proposedAction,r=a.material.reviewRouting;
  assert.equal(r.queue,'immediate_review');assert.equal(a.actionPayload.properties.hs_task_priority,'HIGH');
  assert.equal(a.actionPayload.properties.hs_task_status,'NOT_STARTED');assert.equal(a.actionPayload.properties.hs_task_type,'TODO');
  assert.equal(r.currentJobStatus,'UNVERIFIED');assert(r.sourceFacts.every(x=>x.sourceTimestamp.startsWith('2026-10-')));
  assert.equal(a.executionBlocked,true);assert.equal(a.material.customerActionPermitted,false);
  assert.match(a.actionPayload.properties.hs_task_body,/IMMEDIATE INTERNAL REVIEW/);assert.match(a.actionPayload.properties.hs_task_body,/pricing before additional work/);
  assert.notEqual(a.actionVersion,proposedAction.actionVersion);assert.equal(f.findingId,old.finding.findingId);
  if(id==='ST03')assert.equal(r.contextTag,'team_onsite');
 }
});
test('the rule generalizes to other active jobs instead of matching case IDs or a specific service',async()=>{
 for(const text of ['Customer asks to add a water connection during the active job and wants pricing before work continues.','While the team is on-site, customer requests an added ventilation fan and pricing before work continues.']){
  const a=(await run(text)).findings[0].proposedAction;assert.equal(a.material.reviewRouting.queue,'immediate_review');assert.equal(a.actionPayload.properties.hs_task_priority,'HIGH');
 }
});
test('future, negated, completed and non-scope work are not presented as in-progress scope requests',async()=>{
 for(const text of ['Customer requests extra outlets for a future job that has not started.','Customer requests extra outlets but the crew is no longer on site.','Customer requests extra outlets; the current job is completed.'])assert.equal((await run(text)).findings[0].proposedAction.material.reviewRouting,undefined);
 assert.equal((await run('Technician recommends extra outlets during the active job. Customer has made no request.')).findings[0].proposedAction.material.reviewRouting,undefined);
 const active='Customer requests pricing for a charger while the crew is on site.';
 assert.equal((await run(active,{classification:'strong cross-sell opportunity',opportunityType:'cross-sell'})).findings[0].proposedAction.material.reviewRouting,undefined);
});
test('newer closure evidence suppresses an old active-job routing cue without asserting present onsite status',async()=>{
 const text='Customer asks for extra outlets during the active job and requests pricing before work continues.';
 const a=(await run(text,{},[{noteId:'newer',timestamp:'2026-10-23T14:00:00Z',note:'The job is completed and the crew left.'}])).findings[0].proposedAction;
 assert.equal(a.material.reviewRouting,undefined);assert.equal(a.executionBlocked,true);
});
test('fresh source timestamps still do not prove that the crew remains onsite or authorize extra work',async()=>{
 const text='While the crew is on site, customer asks for extra outlets and pricing before work continues.';
 const h=await prepareHistory({serviceHistory:[{noteId:'n',timestamp:time,note:text}]});
 const a=(await materializeCorrected({findings:[candidate(text)]},h,'synthetic:fresh',time)).findings[0].proposedAction;
 assert.equal(a.material.reviewRouting.currentJobStatus,'UNVERIFIED');assert.equal(a.material.reviewRouting.sourceFacts[0].sourceTimestamp,time);
 assert.equal(a.material.customerActionPermitted,false);assert.equal(a.executionBlocked,true);
});
test('the same source keeps the same action version across a clock-day boundary',async()=>{
 const text='While the crew is on site, customer asks for extra outlets and pricing before work continues.';
 const h=await prepareHistory({serviceHistory:[{noteId:'n',timestamp:'2026-10-22T14:00:00Z',note:text}]});
 const a=await materializeCorrected({findings:[candidate(text)]},h,'synthetic:stable','2026-11-12T23:59:00Z');
 const b=await materializeCorrected({findings:[candidate(text)]},h,'synthetic:stable','2026-11-13T00:01:00Z');
 assert.equal(a.findings[0].proposedAction.actionVersion,b.findings[0].proposedAction.actionVersion);
});
