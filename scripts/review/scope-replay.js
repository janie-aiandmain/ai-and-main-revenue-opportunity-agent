// Reprocess retained synthetic captures only; never calls a model, CRM or Worker.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {materializeCorrected,MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
import {prepareHistory,canonical} from '../../src/findings.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
import {gradeFindings,hash} from '../regression/findings-core.js';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const before=await load('docs/review/semantic-diagnostic-cycle/retained-capture-replay.json');
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','absolute-timing-boundaries-v1','release-restrictions-v1','release-negative-qualifiers-v1'].map(n=>load('fixtures/'+n+'.json')));
const cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,{...c,context:c.context||{customer:'Synthetic restriction',serviceHistory:[{timestamp:c.timestamp,note:c.note}]}}])));
const captures=new Map(),rows=[];
const effective=f=>{const c=structuredClone(f);delete c.proposedAction.actionVersion;delete c.proposedAction.schemaVersion;delete c.proposedAction.material.policyVersion;delete c.proposedAction.material.proposalVersion;delete c.proposedAction.authorityRequirements.policyVersion;return c;};
for(const old of before.rows){
 const file=old.captureFile.startsWith('completion-correction/')?'docs/review/'+old.captureFile:'docs/release/evidence/'+old.captureFile;
 if(!captures.has(file))captures.set(file,await load(file));
 const r=captures.get(file).rows.find(r=>r.id===old.id&&r.rawModelOutput&&hash(JSON.parse(r.rawModelOutput))===old.rawOutputHash);assert(r);
 const c=cases.get(old.id),history=await prepareHistory(c.context),time=old.sourceTime,actual=await materializeCorrected(JSON.parse(r.rawModelOutput),history,'synthetic:'+c.id,time);
 const quality=actual.findings.flatMap(f=>inspectFinding(f,history,actual.findings,time).qualityFailures);
 const grade=c.expectedFindings?await gradeFindings(c,actual,{materializer:(r,h,k)=>materializeCorrected(r,h,k,time)}):null;
 const decisionPassed=grade?grade.decisionPassed:c.types?canonical(actual.findings.map(f=>f.opportunityType).sort())===canonical([...c.types].sort()):(actual.findings.length>0)===c.expectedActionable;
 const text=actual.findings.flatMap(f=>f.evidence.map(e=>e.quote)).join('\n');const missing=(typeof c.required==='string'?[c.required]:c.required||[]).filter(q=>!text.includes(q));
 const routing=actual.findings.map(f=>f.proposedAction.material.reviewRouting).filter(Boolean);
 const changed=canonical(actual.findings.map(effective))!==canonical(old.actual.findings.map(effective));
 rows.push({id:old.id,captureFile:old.captureFile,run:old.run,sourceTime:time,rawOutputHash:old.rawOutputHash,actual,outputHash:hash(actual),quality,missing,decisionPassed,effectiveChange:changed,routingCount:routing.length,passed:decisionPassed&&!quality.length&&!missing.length,humanSemanticVerdict:'PENDING',finalExecutionApproval:false});
}
const summary={captures:rows.length,passed:rows.filter(r=>r.passed).length,failures:rows.filter(r=>!r.passed).map(r=>({id:r.id,quality:r.quality,missing:r.missing})),flaggedCases:[...new Set(rows.filter(r=>r.routingCount).map(r=>r.id))],effectiveChangeCases:[...new Set(rows.filter(r=>r.effectiveChange).map(r=>r.id))],unexpectedChanges:rows.filter(r=>r.effectiveChange&&!r.routingCount).map(r=>r.id)};
const out={kind:'OFFLINE_RETAINED_CAPTURE_REPLAY_NOT_FRESH_MODEL_CALLS',baselineCommit:'b9f2e12aa23aa2748e0184f995a252b0d2d25501',MATERIALIZATION_VERSION,modelCalls:0,hubspotCalls:0,freshModelValidation:'PENDING_NO_NEW_CALL_ALLOWANCE',summary,rows};
await writeFile('docs/review/in-progress-scope/replay.json',JSON.stringify(out,null,2)+'\n');
const corpus=suites[0];const oldPacket=await load('docs/review/semantic-diagnostic-cycle/review-packet.json');
const previews=['ST03','EN31'].map(id=>{const old=oldPacket.items.find(x=>x.caseId===id),row=rows.find(r=>r.id===id&&r.captureFile===old.providerCapture),finding=row.actual.findings.find(f=>f.opportunityKey===old.finding.opportunityKey);return {caseId:id,sourceContext:corpus.cases.find(c=>c.id===id).context,outputHash:row.outputHash,reviewItemHash:hash({caseId:id,outputHash:row.outputHash,finding}),finding,humanVerdict:'PENDING',finalExecutionApproval:false};});
await writeFile('docs/review/in-progress-scope/previews.json',JSON.stringify({kind:'PENDING_HIGH_PRIORITY_SCOPE_REVIEW_DRAFTS',previews},null,2)+'\n');
console.log(JSON.stringify(summary));if(summary.failures.length||summary.unexpectedChanges.length)process.exitCode=1;
