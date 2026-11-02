import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { CorrectionSandbox } from '../sandbox/correction-store.js';
import { prepareHistory } from '../src/findings.js';
import { reviewedProjection,localDate,sourceDayEnd,TASK_CLASS } from '../src/correction-policy.js';
const now='2026-11-02T12:00:00Z',ctx='sandbox:customer:1';
const source=[{noteId:'n1',timestamp:now,note:'Customer requests pricing for three outlets in the garage. Separately, customer requests pricing for pendant lighting in the kitchen.'}];
const candidate=(key='garage-outlets',quote='Customer requests pricing for three outlets in the garage.')=>({opportunityKey:key,classification:'scope-change opportunity',opportunityType:'scope change',confidence:'high',evidence:[{noteId:'n1',quote}],reasoningSummary:'Synthetic.',recommendedNextAction:'Review a garage outlet estimate.',humanReviewRequired:true});
const spec=()=>({actionClass:TASK_CLASS,targetContext:ctx,classification:'scope-change opportunity',opportunityType:'scope change',intent:'scope_change_estimate',scope:{service:'outlet_addition',location:'garage',quantity:3},priority:'MEDIUM',evidence:candidate().evidence,timing:{kind:'none'},constraints:[],humanApprovalRequired:true});
const review=r=>({kind:'SANDBOX_SIMULATION',reference:'synthetic-semantic-review',disposition:'EQUIVALENT_OR_MATERIAL_AS_PROJECTED',candidateHash:r.candidateHash,sourceHash:r.sourceHash});
async function lab(fn){const dir=await mkdtemp(tmpdir()+'/correction-');const path=dir+'/lab.sqlite';const db=new CorrectionSandbox(path);try{await fn(db,path);}finally{db.close();await rm(dir,{recursive:true,force:true});}}
function publish(db,f=candidate(),s=spec(),history=source){const r=db.reconcile(ctx,history,[f])[0];return {...r,...db.publishSandboxReview(r.opportunityId,s,history,review(r))};}

test('source-anchored identity survives synonymous keys and preserves genuinely separate needs',async()=>lab(db=>{
 const a=publish(db);
 for(const key of ['garage-outlet-addition','garage-three-outlets']) assert.equal(publish(db,candidate(key)).opportunityId,a.opportunityId);
 const lighting=candidate('garage-outlets','customer requests pricing for pendant lighting in the kitchen.');
 const both=db.reconcile(ctx,source,[candidate('same-label-a'),lighting],{newNeedReviews:[db.newNeedReviewSandbox(ctx,source,lighting,'synthetic-distinct-lighting-need')]});
 assert.equal(new Set(both.map(x=>x.opportunityId)).size,2);
 assert.equal(db.counts().opportunities,2);
}));
test('reviewed semantic paraphrases keep one exact payload/version; unknown changes suspend approval',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);
 const changed={...candidate('three-garage-outlets'),recommendedNextAction:'Have a reviewer obtain the estimate for garage outlets.'};
 const r=db.reconcile(ctx,source,[changed])[0];
 assert.throws(()=>db.executeSandbox(approval,now,source),/invalid/);
 const b=db.publishSandboxReview(r.opportunityId,spec(),source,review(r));
 assert.equal(a.actionVersion,b.actionVersion);assert.deepEqual(a.payload,b.payload);
 assert.equal(db.executeSandbox(approval,now,source).created,true);
}));
test('repeated processing, retry, restart and separate connections create one sandbox task',async()=>lab((db,path)=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);
 const first=db.executeSandbox(approval,now,source);
 for(let i=0;i<5;i++){publish(db,candidate(i%2?'garage-three-outlets':'garage-outlet-addition'));assert.equal(db.executeSandbox(approval,now,source).taskId,first.taskId);}
 const second=new CorrectionSandbox(path);try{assert.equal(second.executeSandbox(approval,now,source).created,false);}finally{second.close();}
 assert.equal(db.counts().tasks,1);assert.equal(db.counts().opportunities,1);
}));
test('classification, scope, timing, evidence or priority changes invalidate prior approval',async()=>{
 for(const mutate of [s=>{s.classification='strong cross-sell opportunity';s.opportunityType='cross-sell';},s=>{s.scope.quantity=4;},s=>{s.priority='HIGH';},s=>{s.timing={kind:'absolute',dueAt:'2026-11-03T12:00:00Z',basisRef:'synthetic-reviewed-date'};},s=>{s.evidence=[{noteId:'n1',quote:'pricing for three outlets in the garage'}];}]) await lab(db=>{
  const a=publish(db),approval=db.approveSandbox(a.opportunityId,now),s=spec();mutate(s);
  const b=publish(db,candidate(),s);assert.notEqual(a.actionVersion,b.actionVersion);
  assert.throws(()=>db.executeSandbox(approval,now,source),/invalid/);assert.equal(db.counts().tasks,0);
 });
});
test('material A-B-A changes never resurrect an old approval',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);
 publish(db,candidate(),{...spec(),priority:'HIGH'});const again=publish(db);
 assert.equal(again.actionVersion,a.actionVersion);assert.throws(()=>db.executeSandbox(approval,now,source),/invalid/);
}));
test('a changed opportunity with an existing task requires reconciliation, not another create',async()=>lab(db=>{
 const a=publish(db),one=db.approveSandbox(a.opportunityId,now);db.executeSandbox(one,now,source);
 const b=publish(db,candidate(),{...spec(),priority:'HIGH'}),two=db.approveSandbox(b.opportunityId,now);
 assert.throws(()=>db.executeSandbox(two,now,source),/manual reconciliation/);assert.equal(db.counts().tasks,1);
}));
test('source changes, missing findings and ambiguous evaluations cannot reuse approval',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);
 const edited=[{...source[0],note:source[0].note.replace('three outlets','four outlets')}];
 assert.throws(()=>db.reconcile(ctx,edited,[candidate('four-outlets',edited[0].note.slice(0,57))]));
 assert.throws(()=>db.executeSandbox(approval,now,edited),/invalid/);
 assert.throws(()=>db.executeSandbox(approval,now,source),/invalid/);
}));
test('withdrawn/reappearing findings require a new approval even with identical material content',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);db.reconcile(ctx,source,[]);
 publish(db);assert.throws(()=>db.executeSandbox(approval,now,source),/invalid/);
}));
test('ambiguous identity bridges and duplicate evidence do not silently merge needs',async()=>lab(db=>{
 const f2=candidate('kitchen-lighting','customer requests pricing for pendant lighting in the kitchen.');
 db.reconcile(ctx,source,[candidate(),f2]);
 assert.throws(()=>db.reconcile(ctx,source,[candidate('combined',source[0].note)]),/bridge/);
 assert.throws(()=>db.reconcile(ctx,source,[candidate(),candidate('synonym')]),/Ambiguous batch/);
 assert.equal(db.counts().opportunities,2);
}));
test('approval expiry is exactly 24 hours; future-issued and unreviewed approvals cannot execute',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);
 assert.throws(()=>db.executeSandbox(approval,'2026-11-03T12:00:00Z',source),/expired/);
 assert.throws(()=>db.executeSandbox(approval,'2026-11-02T11:59:59Z',source),/invalid/);
 assert.throws(()=>db.approveSandbox(a.opportunityId,now,{ttlMs:86400001}));
}));
test('source-relative deadlines, event gates and evidence completeness are enforced',async()=>{
 assert.equal(localDate('2026-10-23T14:00:00Z','America/New_York'),'2026-10-23');
 assert.equal(localDate('2026-11-02T02:00:00Z','America/New_York'),'2026-11-01');
 assert.equal(sourceDayEnd('2026-10-23','America/New_York'),'2026-10-24T03:59:59.999Z');
 assert.equal(sourceDayEnd('2026-11-01','America/New_York'),'2026-11-02T04:59:59.999Z');
 const history=[{noteId:'n1',timestamp:'2026-10-23T14:00:00Z',note:'Customer reports a flickering fixture and asks for a manager today. Do not send another invoice until resolved.'}];
 const s={...spec(),classification:'retention or service-recovery opportunity',opportunityType:'retention',intent:'service_recovery',evidence:[{noteId:'n1',quote:history[0].note}],timing:{kind:'source_day',noteId:'n1',timezone:'America/New_York',day:'2026-10-23'}};
 await lab(db=>{
  const r=db.reconcile(ctx,history,[{...candidate(),evidence:s.evidence}])[0];db.publishSandboxReview(r.opportunityId,s,history,review(r));
  assert.throws(()=>db.approveSandbox(r.opportunityId,now),/not current/);
 });
 assert.throws(()=>reviewedProjection({...s,timing:{kind:'none'}},history),/deadline/);
 assert.throws(()=>reviewedProjection({...s,evidence:[{noteId:'n1',quote:'Customer reports a flickering fixture and asks for a manager today.'}]},history),/incomplete/);
 const deferred=[{noteId:'n1',timestamp:now,note:'Customer wants pendant lighting after the renovation is complete.'}];
 const d={...spec(),intent:'deferred_follow_up',evidence:[{noteId:'n1',quote:deferred[0].note}],timing:{kind:'after_event',eventRef:'renovation_complete',sourceNoteId:'n1'}};
 await lab(db=>{const r=db.reconcile(ctx,deferred,[{...candidate(),evidence:d.evidence}])[0];db.publishSandboxReview(r.opportunityId,d,deferred,review(r));assert.throws(()=>db.approveSandbox(r.opportunityId,now),/not confirmed/);});
});
test('prohibited CRM actions and unbound semantic reviews are rejected',async()=>lab(db=>{
 assert.throws(()=>reviewedProjection({...spec(),actionClass:'hubspot.deal.create'},source),/authority/);
 const r=db.reconcile(ctx,source,[candidate()])[0];
 assert.throws(()=>db.publishSandboxReview(r.opportunityId,spec(),source,{...review(r),candidateHash:'wrong'}),/unbound/);
 assert.throws(()=>db.approveSandbox(r.opportunityId,now),/Unreviewed/);
}));
test('the same external outcome is attributed once; conflicts and cross-opportunity reuse are rejected',async()=>lab(db=>{
 const a=publish(db),event={externalRef:'sandbox:invoice:1',opportunityId:a.opportunityId,amountMinor:25000,currency:'USD',metric:'influenced',evidenceRef:'synthetic-crm-outcome:1'};
 assert.equal(db.recordSandboxOutcome(event).recorded,true);
 for(let i=0;i<5;i++) assert.equal(db.recordSandboxOutcome(event).recorded,false);
 assert.throws(()=>db.recordSandboxOutcome({...event,metric:'rescued'}),/double attribution/);
 assert.throws(()=>db.recordSandboxOutcome({...event,amountMinor:50000}),/double attribution/);
 const op2=db.reconcile('sandbox:other',source,[candidate()])[0];
 assert.throws(()=>db.recordSandboxOutcome({...event,opportunityId:op2.opportunityId}),/double attribution/);
 assert.equal(db.counts().outcomes,1);assert.equal(db.counts().revenueByCurrency.USD,25000);
}));

test('concurrent sandbox processes create one task and one attribution, durably',async()=>lab(async(db,path)=>{
 const {spawn}=await import('node:child_process');const {writeFile}=await import('node:fs/promises');const {fileURLToPath}=await import('node:url');
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now),worker=fileURLToPath(new URL('../sandbox/effect-worker.js',import.meta.url));
 async function parallel(mode,payload){
  const input=path+'.'+mode+'.json';await writeFile(input,JSON.stringify(payload));
  return Promise.all(Array.from({length:4},()=>new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[worker,path,mode,input],{stdio:['ignore','pipe','pipe'],env:{}});let out='',err='';child.stdout.on('data',x=>out+=x);child.stderr.on('data',x=>err+=x);child.on('error',reject);child.on('close',code=>code===0?resolve(JSON.parse(out)):reject(Error(err)));
  })));
 }
 const tasks=await parallel('task',{approval,now,history:source});assert.equal(tasks.filter(r=>r.created).length,1);assert.equal(new Set(tasks.map(r=>r.taskId)).size,1);
 const events=await parallel('outcome',{externalRef:'sandbox:concurrent:revenue:1',opportunityId:a.opportunityId,amountMinor:50000,currency:'USD',metric:'influenced',evidenceRef:'synthetic-only'});assert.equal(events.filter(r=>r.recorded).length,1);
 assert.equal(db.counts().tasks,1);assert.equal(db.counts().outcomes,1);assert.equal(db.counts().revenueByCurrency.USD,50000);
}));

test('same service in distinct locations remains two opportunities even with identical model keys',async()=>lab(db=>{
 const history=[{noteId:'n1',timestamp:now,note:'Customer requests pricing for garage outlets. Separately requests pricing for kitchen outlets.'}];
 const a={...candidate('outlets'),evidence:[{noteId:'n1',quote:'Customer requests pricing for garage outlets.'}]};
 const b={...candidate('outlets'),evidence:[{noteId:'n1',quote:'Separately requests pricing for kitchen outlets.'}]};
 const result=db.reconcile(ctx,history,[a,b]);assert.equal(new Set(result.map(r=>r.opportunityId)).size,2);
}));
test('the captured ST04 evidence omission is rejected and a complete source-relative proposal cannot silently execute late',async()=>{
 const report=JSON.parse(await readFile(new URL('../docs/validation/findings-v0.2-five-runs.json',import.meta.url),'utf8'));
 const corpus=JSON.parse(await readFile(new URL('../fixtures/enterprise-v2.json',import.meta.url),'utf8'));
 const c=corpus.cases.find(c=>c.id==='ST04'),history=await prepareHistory(c.context);
 const row=report.rows.find(r=>r.id==='ST04'&&r.actual.findings.some(f=>!f.evidence.some(e=>/invoic/i.test(e.quote))));
 assert.ok(row);
 const f=row.actual.findings[0],s={...spec(),classification:f.classification,opportunityType:f.opportunityType,intent:'service_recovery',evidence:f.evidence,timing:{kind:'source_day',noteId:history[0].noteId,timezone:null,day:null}};
 assert.throws(()=>reviewedProjection(s,history),/incomplete/);
 await lab(db=>{
  const r=db.reconcile(ctx,history,[f])[0],complete={...s,evidence:[{noteId:history[0].noteId,quote:history[0].note}]};
  db.publishSandboxReview(r.opportunityId,complete,history,review(r));
  assert.throws(()=>db.approveSandbox(r.opportunityId,now),/timezone/);
 });
});
test('customer this-week intent is not invented as a task deadline or silently renewed',async()=>lab(db=>{
 const history=[{noteId:'n1',timestamp:now,note:'Customer requests pricing for surge protection so they can decide this week.'}];
 const f={...candidate(),evidence:[{noteId:'n1',quote:history[0].note}]};
 assert.throws(()=>reviewedProjection({...spec(),evidence:f.evidence},history),/decision window/);
 const s={...spec(),evidence:f.evidence,customerDecisionWindow:{noteId:'n1',status:'unresolved',reviewRef:null,validThrough:null}};
 const r=db.reconcile(ctx,history,[f])[0];db.publishSandboxReview(r.opportunityId,s,history,review(r));
 assert.throws(()=>db.approveSandbox(r.opportunityId,now),/decision window/);
}));

test('an unreviewed raw classification A-B-A transition revokes the prior grant',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);
 db.reconcile(ctx,source,[{...candidate(),classification:'strong cross-sell opportunity',opportunityType:'cross-sell'}]);
 publish(db);assert.throws(()=>db.executeSandbox(approval,now,source),/invalid/);
}));
test('a failed ambiguous evaluation cannot be cleared with an old semantic-review receipt',async()=>lab(db=>{
 const first=db.reconcile(ctx,source,[candidate()])[0];db.publishSandboxReview(first.opportunityId,spec(),source,review(first));
 const approval=db.approveSandbox(first.opportunityId,now);
 assert.throws(()=>db.reconcile(ctx,source,[candidate(),candidate('alias')]),/Ambiguous/);
 assert.throws(()=>db.publishSandboxReview(first.opportunityId,spec(),source,review(first)),/stale/);
 assert.throws(()=>db.executeSandbox(approval,now,source),/invalid/);
}));

test('new source references cannot silently allocate a duplicate opportunity or reuse prior approval',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);db.executeSandbox(approval,now,source);
 const newer=[...source,{noteId:'n2',timestamp:'2026-11-02T13:00:00Z',note:'Customer again requests a garage outlet estimate.'}];
 const next={...candidate('garage-estimate'),evidence:[{noteId:'n2',quote:newer[1].note}]};
 assert.throws(()=>db.reconcile(ctx,newer,[next]),/identity review/);
 assert.equal(db.counts().opportunities,1);assert.equal(db.counts().tasks,1);
 assert.throws(()=>db.executeSandbox(approval,'2026-11-02T13:00:00Z',newer),/invalid/);
}));

test('a consumed approval without a confirmed effect fails closed instead of recreating work',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);db.executeSandbox(approval,now,source);
 db.db.prepare('DELETE FROM sandbox_tasks WHERE op_id=?').run(a.opportunityId);
 assert.throws(()=>db.executeSandbox(approval,now,source),/reconcile/);
 assert.equal(db.counts().tasks,0);
}));

test('the persisted executable payload must still match the exact approved action version',async()=>lab(db=>{
 const a=publish(db),approval=db.approveSandbox(a.opportunityId,now);
 const row=db.db.prepare('SELECT projection FROM opportunities WHERE id=?').get(a.opportunityId),tampered=JSON.parse(row.projection);tampered.payload.properties.hs_task_body='An unapproved replacement action';
 db.db.prepare('UPDATE opportunities SET projection=? WHERE id=?').run(JSON.stringify(tampered),a.opportunityId);
 assert.throws(()=>db.executeSandbox(approval,now,source),/integrity/);assert.equal(db.counts().tasks,0);
}));
test('canonical approval data cannot lose undefined or nonfinite values on persistence',()=>{
 assert.throws(()=>reviewedProjection({...spec(),scope:{quantity:NaN}},source),/lossless/);
 assert.throws(()=>reviewedProjection({...spec(),scope:{quantity:undefined}},source),/lossless/);
 assert.throws(()=>reviewedProjection({...spec(),constraints:'not-an-array'},source),/list/);
});
