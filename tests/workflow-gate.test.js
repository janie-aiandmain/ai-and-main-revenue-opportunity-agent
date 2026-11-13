import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gradeWorkflowCase} from '../scripts/regression/workflow-core.js';
const time='2026-11-12T12:00:00Z';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
test('primary workflow gate rejects missing or merged independent findings despite a correct contact-level label',async()=>{
 const fixtures=await load('fixtures/enterprise-v2.json'),captures=await load('docs/review/in-progress-scope/replay.json');
 for(const id of ['EN11','EN12']){
  const c=fixtures.cases.find(c=>c.id===id),row=captures.rows.find(r=>r.id===id),raw={findings:row.actual.findings.map(({findingId,proposedAction,...f})=>f)};
  assert((await gradeWorkflowCase(c,raw,time)).passed);
  const omitted=await gradeWorkflowCase(c,{findings:[raw.findings[0]]},time);assert.equal(omitted.passed,false);assert.equal(omitted.grade.dimensions.findingCoverage.status,'fail');
  const merged=structuredClone(raw);merged.findings[0].evidence.push(...merged.findings[1].evidence);merged.findings.splice(1);
  assert.equal((await gradeWorkflowCase(c,merged,time)).passed,false);
 }
});
test('primary gate cannot pass fabricated evidence, duplicated identities or customer-action authority',async()=>{
 const fixtures=await load('fixtures/enterprise-v2.json'),captures=await load('docs/review/in-progress-scope/replay.json');
 const c=fixtures.cases.find(c=>c.id==='EN11'),row=captures.rows.find(r=>r.id==='EN11'),raw={findings:row.actual.findings.map(({findingId,proposedAction,...f})=>f)};
 const invented=structuredClone(raw);invented.findings[0].evidence[0].quote='Fabricated customer demand.';await assert.rejects(gradeWorkflowCase(c,invented,time));
 const duplicate=structuredClone(raw);duplicate.findings[1].opportunityKey=duplicate.findings[0].opportunityKey;await assert.rejects(gradeWorkflowCase(c,duplicate,time));
 const contact=structuredClone(raw);contact.findings[0].recommendedNextAction='Call the customer and book installation.';
 assert.equal((await gradeWorkflowCase(c,contact,time)).passed,false);
});
