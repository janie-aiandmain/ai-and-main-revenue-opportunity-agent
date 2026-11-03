// Replay captured model outputs only. No API calls or semantic sign-off.
import { mkdtemp,rm,readFile,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { CorrectionSandbox } from '../sandbox/correction-store.js';
import { prepareHistory } from '../src/findings.js';
import { loadFindingsCorpus,gradeFindings } from '../scripts/regression/findings-core.js';
import { alignSlots } from '../scripts/regression/stability-core.js';
const corpus=await loadFindingsCorpus();
const prior=JSON.parse(await readFile('docs/validation/findings-v0.2-five-runs.json','utf8'));
const fresh=JSON.parse(await readFile('docs/certification/fresh-model-v0.2.json','utf8'));
const dir=await mkdtemp(tmpdir()+'/fresh-identity-');
const db=new CorrectionSandbox(dir+'/registry.sqlite');
const results=[];
try {
  for(const c of corpus.cases){
    const history=await prepareHistory(c.context),rows=prior.rows.filter(r=>r.id===c.id);
    let first;
    for(const r of rows){
      const assigned=db.reconcile('synthetic:'+c.id,history,r.actual.findings);
      if(!first){const byId=new Map(r.actual.findings.map((f,i)=>[f.findingId,assigned[i].opportunityId]));first=alignSlots(c,r.actual.findings).slots.map(f=>byId.get(f.findingId));}
    }
    const row=fresh.rows.find(r=>r.id===c.id),grade=await gradeFindings(c,row.actual);
    assert.equal(grade.decisionPassed,true);
    const assigned=db.reconcile('synthetic:'+c.id,history,row.actual.findings),byId=new Map(row.actual.findings.map((f,i)=>[f.findingId,assigned[i].opportunityId]));
    const aligned=alignSlots(c,row.actual.findings);assert.equal(aligned.complete,true);
    const slots=aligned.slots.map((f,i)=>({slot:i+1,rawModelKey:f.opportunityKey,rawModelFindingId:f.findingId,priorOpportunityId:first[i],freshOpportunityId:byId.get(f.findingId),identityReused:first[i]===byId.get(f.findingId)}));
    assert.ok(slots.every(s=>s.identityReused));assert.equal(new Set(slots.map(s=>s.freshOpportunityId)).size,c.expectedFindingCount);
    results.push({id:c.id,automaticGrade:grade,slots,humanReview:'PENDING',effectsExecuted:0});
  }
  const record={kind:'OFFLINE_FROZEN_PLUS_FRESH_RECONCILIATION_NOT_MODEL_STABILITY_OR_HUMAN_REVIEW',priorExecutions:155,freshExecutions:31,independentContexts:31,positiveSlots:12,reusedOpportunitySlots:results.flatMap(r=>r.slots).filter(s=>s.identityReused).length,registryOpportunities:db.counts().opportunities,newModelCalls:0,crmCalls:0,results};
  assert.equal(record.registryOpportunities,12);
  await writeFile('docs/certification/fresh-identity-replay.json',JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({cases:results.length,reusedOpportunitySlots:record.reusedOpportunitySlots,distinctOpportunities:record.registryOpportunities,newModelCalls:0}));
}finally{db.close();await rm(dir,{recursive:true,force:true});}
