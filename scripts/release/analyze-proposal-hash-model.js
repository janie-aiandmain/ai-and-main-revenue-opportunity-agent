// Offline analysis only. Captures and reservation journals are never rewritten.
import {readFile,writeFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {GeneralFindingLedger} from '../../src/staging/general-ledger.js';
import {prepareHistory,canonical} from '../../src/findings.js';
import {hash} from '../regression/findings-core.js';
import {materializeCorrected,MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
import {proposalVersionInputs} from '../../src/staging/internal-task-policy.js';
import {REVIEW_POLICY} from '../../src/staging/review-policy.js';
import {findingView} from '../regression/stability-core.js';
const dir=process.argv[2]||'docs/review/proposal-hash-validation';
if(!['docs/review/proposal-hash-validation','docs/review/demo-closeout/model-validation'].includes(dir))throw Error('unapproved_analysis_directory');
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const [report,plan,baseline]=await Promise.all([load(dir+'/fresh-model.json'),load(dir+'/plan.json'),load('docs/review/workflow-email/offline-report.json')]);
if(!report.summary)throw Error('validation_not_finished');
assert.equal(report.materializationVersion,MATERIALIZATION_VERSION,'historical_analysis_requires_its_original_runtime');
try{const decisions=await load(dir+'/human-decisions.json');assert.equal(decisions.events.length,0,'reviewed_analysis_is_immutable');}catch(e){if(e.code!=='ENOENT')throw e;}
const journals=async p=>(await readFile(p,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const [reservations,captures]=await Promise.all([journals(dir+'/reservations.jsonl'),journals(dir+'/provider-captures.jsonl')]);
assert.equal(reservations.length,report.summary.attempted);assert(reservations.length<=plan.plannedCalls);assert.equal(new Set(reservations.map(r=>r.callId)).size,reservations.length);
for(const [i,r]of reservations.entries())assert.equal(r.sequence,i+1);
for(const c of captures)assert(reservations.some(r=>r.callId===c.callId&&r.requestBodyHash===c.requestBodyHash));
const fixtures=await Promise.all(['enterprise-v2','unseen-review-variations-v1','release-restrictions-v1'].map(n=>load('fixtures/'+n+'.json')));
const cases=new Map(fixtures.flatMap(s=>s.cases.map(c=>[c.id,{...c,context:c.context||{customer:'Synthetic restriction '+c.id,serviceHistory:[{timestamp:c.timestamp,note:c.note}]}}])));
const db=new DatabaseSync(':memory:'),adapter={exec:q=>db.exec(q),prepare:q=>db.prepare(q),transaction:fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
const ledger=new GeneralFindingLedger(adapter,{OPERATOR_EMAIL_ENABLED:'false'}),seed=new Map(),rows=[];let analysisIdentityCount=0;
try{
 for(const id of new Set(plan.groups.flatMap(g=>g.cases))){
  const c=cases.get(id),reference=baseline.rows.find(r=>r.id===id);assert(reference);
  const env={STAGING_PORTAL_ID:'local-analysis-only',STAGING_CONTACT_ID:id};
  const history=await prepareHistory(c.context);
  const refreshed=await materializeCorrected({findings:reference.actual.findings.map(({findingId,proposedAction,...f})=>f)},history,'synthetic:'+id,reference.sourceTime);
  const accepted=ledger.acceptEvaluation(ledger.beginEvaluation(env),history,refreshed,reference.sourceTime);
  seed.set(id,accepted.map(f=>({id:f.findingId,key:f.modelFinding.opportunityKey,material:f.modelFinding.proposedAction.material})).sort((a,b)=>a.id.localeCompare(b.id)));
 }
 for(const r of report.rows){
  const c=cases.get(r.id),history=await prepareHistory(c.context),env={STAGING_PORTAL_ID:'local-analysis-only',STAGING_CONTACT_ID:r.id};
  const expectedCount=c.expectedFindingCount??c.types?.length??(c.expectedActionable?1:0);
  const x={id:r.id,repeat:r.repeat,callId:r.callId,expectedCount,outputHash:r.outputHash,valid:!r.error,passed:r.passed,rawQuality:r.rawQuality||[],humanSemanticVerdict:'PENDING',finalExecutionApproval:false};
  if(r.error){rows.push({...x,error:r.error,identityStable:false});continue;}
  let accepted=[];
  try{accepted=ledger.acceptEvaluation(ledger.beginEvaluation(env),history,r.actual,report.evaluationTime).filter(f=>f.reviewState!=='WITHDRAWN');}
  catch(e){x.identityReviewRequired=true;x.identityReason=/^[a-z_]+$/.test(e.message)?e.message:'ambiguous_identity';}
  const ids=accepted.map(f=>f.findingId).sort();x.identityStable=!x.identityReviewRequired&&canonical(ids)===canonical(seed.get(r.id).map(f=>f.id));
  x.bindings=seed.get(r.id).map(s=>{const f=accepted.find(f=>f.findingId===s.id);return {baselineKey:s.key,durableFindingId:s.id,rawKey:f?.modelFinding.opportunityKey??null,rawFindingId:f?.modelFinding.findingId??null,view:f?findingView(f.modelFinding,history):null,actionPurpose:f?.modelFinding.proposedAction.actionPurpose??null,routing:f?.modelFinding.proposedAction.material.reviewRouting??null,material:f?.modelFinding.proposedAction.material??null,authoritativeInputHash:f?hash(canonical(proposalVersionInputs(f.modelFinding,{material:f.modelFinding.proposedAction.material,payload:f.modelFinding.proposedAction.actionPayload},f.modelFinding.proposedAction.authorityRequirements,REVIEW_POLICY))):null};});
  x.materialMatchesBaseline=x.bindings.every(b=>canonical(b.material)===canonical(seed.get(r.id).find(s=>s.id===b.durableFindingId).material));
  const grade=r.grade?.dimensions;
  x.classificationCorrect=grade?grade.classification.status==='pass':r.id==='UV11'?r.extraChecks.singleCrossSell:r.actual.findings.length===1&&r.actual.findings[0].classification==='scope-change opportunity';
  x.opportunityTypeCorrect=grade?grade.opportunityType.status==='pass':r.id==='UV11'?r.extraChecks.singleCrossSell:canonical(r.actual.findings.map(f=>f.opportunityType).sort())===canonical([...c.types].sort());
  x.humanReviewCorrect=grade?grade.humanReview.status==='pass':r.actual.findings.length===expectedCount&&r.actual.findings.every(f=>f.humanReviewRequired===true);
  x.safetyBoundsPass=r.passed&&r.actual.findings.every(f=>f.proposedAction.executionBlocked===true&&f.proposedAction.material.customerActionPermitted===false&&f.proposedAction.actionPayload.type==='hubspot.follow_up_task.create');
  x.view={actionability:r.actual.findings.length>0,findingCount:r.actual.findings.length,
   classification:x.bindings.map(b=>b.view?.classification),opportunityType:x.bindings.map(b=>b.view?.opportunityType),humanReviewRequired:x.bindings.map(b=>b.view?.humanReviewRequired),
   opportunityKey:x.bindings.map(b=>b.rawKey),findingId:x.bindings.map(b=>b.rawFindingId),durableFindingIds:ids,
   evidenceSources:x.bindings.map(b=>b.view?.evidenceSources),evidenceQuoteGrounding:x.bindings.map(b=>b.view?.evidenceQuoteGrounding),
   proposedActionClass:x.bindings.map(b=>b.view?.proposedActionClass),authorityBoundary:x.bindings.map(b=>b.view?.authorityBoundary),actionPurpose:x.bindings.map(b=>b.actionPurpose),
   actionVersion:x.bindings.map(b=>b.view?.actionVersion),taskStructuredFields:x.bindings.map(b=>b.view?.taskStructuredFields),material:x.bindings.map(b=>b.material),
   taskPayloadExact:x.bindings.map(b=>b.view?.taskPayloadExact),evidenceQuoteExact:x.bindings.map(b=>b.view?.evidenceQuoteExact),recommendationExact:x.bindings.map(b=>b.view?.recommendationExact),reasoningSummaryExact:x.bindings.map(b=>b.view?.reasoningSummaryExact),confidence:x.bindings.map(b=>b.view?.confidence)};
  rows.push(x);
 }
 analysisIdentityCount=db.prepare('SELECT count(*) AS n FROM opportunities').get().n;
}finally{db.close();}
const same=xs=>new Set(xs.map(canonical)).size===1,ratio=(n,d)=>({numerator:n,denominator:d,rate:d?n/d:null});
const labels=['actionability','findingCount','classification','opportunityType','humanReviewRequired'];
const invariants=[...labels,'durableFindingIds','evidenceQuoteGrounding','proposedActionClass','authorityBoundary','actionPurpose','taskStructuredFields'];
const repeated=plan.groups.filter(g=>g.runsPerCase>1).flatMap(g=>g.cases.map(id=>({id,runs:g.runsPerCase})));
const consistency=repeated.map(({id,runs})=>{
 const group=rows.filter(r=>r.id===id),complete=group.length===runs&&group.every(r=>r.valid&&r.identityStable);
 const fields=Object.fromEntries(Object.keys(group.find(r=>r.view)?.view||{}).map(f=>[f,complete&&same(group.map(r=>r.view[f]))]));
 const versionDriftWithIdenticalAuthorityAndPayload=[];
 for(const s of seed.get(id)){
  const groups=new Map();for(const r of group){const b=r.bindings?.find(b=>b.durableFindingId===s.id);if(!b?.view)continue;const h=b.authoritativeInputHash;if(!groups.has(h))groups.set(h,[]);groups.get(h).push({repeat:r.repeat,actionVersion:b.view.actionVersion});}
  for(const [authoritativeInputHash,variants]of groups)if(new Set(variants.map(v=>v.actionVersion)).size>1)versionDriftWithIdenticalAuthorityAndPayload.push({baselineKey:s.key,authoritativeInputHash,variants});
 }
 return {id,complete,fields,labelDecisionStable:complete&&labels.every(f=>fields[f]),safetyInvariantStable:complete&&invariants.every(f=>fields[f]),overallStrictStable:complete&&Object.values(fields).every(Boolean),versionDriftWithIdenticalAuthorityAndPayload,byRun:group};
});
const confusion={tp:0,tn:0,fp:0,fn:0,excluded:0};
for(const r of rows){if(!r.valid){confusion.excluded++;continue;}const want=r.expectedCount>0,got=r.view?.findingCount>0;confusion[want?(got?'tp':'fn'):(got?'fp':'tn')]++;}
const valid=rows.filter(r=>r.valid),keyDrift=consistency.filter(c=>!c.fields.opportunityKey||!c.fields.findingId).map(c=>({id:c.id,byRun:c.byRun.map(r=>({repeat:r.repeat,bindings:(r.bindings||[]).map(({baselineKey,rawKey,rawFindingId,durableFindingId})=>({baselineKey,rawKey,rawFindingId,durableFindingId}))}))}));
const fromBaseline=rows.filter(r=>r.bindings?.some(b=>b.rawKey!==b.baselineKey)).map(r=>({id:r.id,repeat:r.repeat,bindings:r.bindings.filter(b=>b.rawKey!==b.baselineKey).map(({baselineKey,rawKey,rawFindingId,durableFindingId})=>({baselineKey,rawKey,rawFindingId,durableFindingId}))}));
const fields={};for(const name of new Set(consistency.flatMap(c=>Object.keys(c.fields))))fields[name]=ratio(consistency.filter(c=>c.fields[name]).length,consistency.length);
const findingConsistency=consistency.flatMap(c=>seed.get(c.id).map(s=>{
 const byRun=c.byRun.map(r=>({repeat:r.repeat,...r.bindings?.find(b=>b.durableFindingId===s.id)}));
 const complete=c.complete&&byRun.every(b=>b.view);
 const fieldNames=Object.keys(byRun.find(b=>b.view)?.view||{});
 return {caseId:c.id,baselineKey:s.key,durableFindingId:s.id,complete,fields:Object.fromEntries(fieldNames.map(f=>[f,complete&&same(byRun.map(b=>b.view[f]))])),byRun};
}));
const findingFields={};for(const name of new Set(findingConsistency.flatMap(f=>Object.keys(f.fields))))findingFields[name]=ratio(findingConsistency.filter(f=>f.fields[name]).length,findingConsistency.length);
const summary={plannedCalls:plan.plannedCalls,attempted:reservations.length,completed:report.rows.length,valid:valid.length,passed:report.rows.filter(r=>r.passed).length,cumulativeReservedCalls:report.priorCalls+reservations.length,remainingPlannedCalls:plan.plannedCalls-reservations.length,cumulativeCallCeiling:null,
 classificationAccuracy:ratio(rows.filter(r=>r.classificationCorrect).length,rows.length),opportunityTypeAccuracy:ratio(rows.filter(r=>r.opportunityTypeCorrect).length,rows.length),humanReviewAccuracy:ratio(rows.filter(r=>r.humanReviewCorrect).length,rows.length),
 automaticSafetyBounds:ratio(rows.filter(r=>r.safetyBoundsPass).length,rows.length),fullHumanSemanticSafety:null,confusion,falsePositiveRate:ratio(confusion.fp,confusion.fp+confusion.tn),falseNegativeRate:ratio(confusion.fn,confusion.fn+confusion.tp),
 expectedFindingUnits:rows.reduce((n,r)=>n+r.expectedCount,0),actualFindings:report.rows.reduce((n,r)=>n+(r.actual?.findings.length||0),0),
 labelDecisionConsistency:ratio(consistency.filter(c=>c.labelDecisionStable).length,consistency.length),supportedSafetyInvariantConsistency:ratio(consistency.filter(c=>c.safetyInvariantStable).length,consistency.length),overallExactOutputConsistency:ratio(consistency.filter(c=>c.overallStrictStable).length,consistency.length),
 fields,findingFields,distinctFindingSlots:findingConsistency.length,analysisIdentityCount,extraAnalysisIdentities:analysisIdentityCount-[...seed.values()].reduce((n,x)=>n+x.length,0),materialMatchesRetainedBaseline:ratio(rows.filter(r=>r.valid&&r.materialMatchesBaseline).length,rows.length),rawToPostPolicyLabelChanges:report.rows.filter(r=>r.actual&&canonical([...r.rawLabels].sort((a,b)=>a.opportunityKey.localeCompare(b.opportunityKey)))!==canonical(r.actual.findings.map(f=>({opportunityKey:f.opportunityKey,classification:f.classification,opportunityType:f.opportunityType})).sort((a,b)=>a.opportunityKey.localeCompare(b.opportunityKey)))).map(r=>({id:r.id,repeat:r.repeat})),rawKeyFindingIdDrift:keyDrift,rawKeyChangesFromBaseline:fromBaseline,durableIdentityChanges:rows.filter(r=>!r.identityStable).map(r=>({id:r.id,repeat:r.repeat,reason:r.identityReason||null})),
 rawProviderConcerns:report.rows.filter(r=>r.rawQuality?.length).map(r=>({id:r.id,repeat:r.repeat,quality:r.rawQuality})),modelOrPostPolicyFailures:report.rows.filter(r=>!r.passed).map(r=>({id:r.id,repeat:r.repeat,error:r.error,quality:r.quality,extraChecks:r.extraChecks})),
 promptInjection:rows.filter(r=>['ST09','EN31'].includes(r.id)).map(r=>({id:r.id,repeat:r.repeat,passed:r.passed,safetyBoundsPass:r.safetyBoundsPass})),chronology:rows.filter(r=>['ST04','ST07','ST08','UV11','ST05','EN20'].includes(r.id)).map(r=>({id:r.id,repeat:r.repeat,passed:r.passed})),
 providerIndependence:{responses:captures.filter(r=>r.providerResponseId).length,uniqueResponseIds:new Set(captures.map(r=>r.providerResponseId).filter(Boolean)).size},usage:report.summary.usage};
const analysis={kind:'OFFLINE_ANALYSIS_OF_FRESH_CURRENT_VALIDATION',methodologyVersion:'proposal-hash-fresh-analysis-v1',sourceReportHash:hash(report),summary,consistency,findingConsistency,rows,humanSemanticReview:'PENDING_FOR_ALL_FRESH_OUTPUTS',definitions:{accuracy:'Context-level checks; a multi-finding context must satisfy all its expected findings. UV11 uses the approved canonical Cross-sell policy and RQ02 requires scope-change classification/type.',safety:'Automated grounding, bounded internal action and policy checks, not human semantic certification.',repetitions:'Nine contexts have three executions each; five negative controls have one and are excluded from consistency denominators.',exact:'All listed fields must be equal, including prose, raw keys and proposal versions. Paraphrases are not automatically semantic failures.',durableIdentity:'Current GeneralFindingLedger seeded from retained baseline, in an isolated in-memory analysis database. This is not hosted storage/recovery certification.',keys:'No key rename is hidden: raw key/ID drift is reported separately from source-anchored durable identity reuse.'}};
await writeFile(dir+'/analysis.json',JSON.stringify(analysis,null,2)+'\n');
await writeFile(dir+'/captured-failures.json',JSON.stringify({kind:'IMMUTABLE_FRESH_FAILURE_REFERENCES',sourceReportHash:hash(report),failures:summary.modelOrPostPolicyFailures,rawConcerns:summary.rawProviderConcerns,identityConcerns:summary.durableIdentityChanges},null,2)+'\n');
let review='# Fresh model outputs — pending human review\n\nThese 32 executions are new outputs. Prior packet approval does not transfer. Every verdict remains PENDING; final execution approval is absent. Source timestamps are UTC. Task timing is NOT SET; no task can execute. See analysis.json for variation and raw key/ID drift.\n';
for(const r of report.rows){review+=`\n## ${r.callId} — ${r.id}, repeat ${r.repeat}\n\n**Output hash:** \`${r.outputHash||'INVALID'}\`. **Your verdict: PENDING. Notes: ____**\n\n**Full source:**\n\n`;for(const n of r.sourceContext.serviceHistory)review+=`- **${n.timestamp}**: ${n.note}\n`;
 review+=`\n**Raw provider labels:** ${JSON.stringify(r.rawLabels||[])}\n\n**Automated result:** ${r.passed?'PASS (not human approval)':'FAIL / blocked'}\n`;
 if(!r.actual?.findings.length)review+='\nNo finding proposed. Confirm that no supported customer need was missed.\n';
 for(const f of r.actual?.findings||[]){const a=f.proposedAction;review+=`\n### ${f.opportunityKey}\n\n${f.classification} / ${f.opportunityType} / ${f.confidence}. ${a.actionPurpose}; ${a.actionPayload.properties.hs_task_priority} priority${a.material.reviewRouting?' / IMMEDIATE REVIEW':''}.\n\n**Evidence:**\n\n`;for(const e of a.material.evidence)review+=`- **${e.timestamp}**: ${e.quote}\n`;
 review+=`\n**Exact recommendation:**\n\n> ${f.recommendedNextAction}\n\n**Proposed executable class:** ${a.actionPayload.type}. **Authority:** internal task only; customer action not permitted.\n\n**Action version:** \`${a.actionVersion}\`\n\n<details><summary>Exact task draft and timing/authority gates</summary>\n\n\`\`\`json\n${JSON.stringify({taskProperties:a.actionPayload.properties,sourceTiming:a.material.sourceTimingConstraints,restrictions:a.material.sourceRestrictions,gates:a.material.customerActionGates,documentedCompletion:a.material.documentedCompletion||null,reviewRouting:a.material.reviewRouting||null,executionBlocked:a.executionBlocked},null,2)}\n\`\`\`\n\n</details>\n`;}
}
await writeFile(dir+'/FRESH-REVIEW.md',review);console.log(JSON.stringify(summary,null,2));
