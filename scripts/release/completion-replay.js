// Offline only. Original provider captures, expectations and verdicts are read-only.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {materializeCorrected,MATERIALIZATION_VERSION,PROMPT_VERSION,SCHEMA_VERSION} from '../../src/release/reasoning.js';
import {prepareHistory,canonical} from '../../src/findings.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
import {gradeFindings,hash} from '../regression/findings-core.js';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
if(MATERIALIZATION_VERSION!=='source-evidence-v0.3.7')throw Error('historical_output_directory_protected_use_scripts_review_replay_checkpoint_js');
const output='docs/review/completion-correction';await mkdir(output,{recursive:true});
const before=await load('docs/release/evidence/release-final-policy-replay.json');
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','absolute-timing-boundaries-v1','release-restrictions-v1','release-negative-qualifiers-v1'].map(n=>load('fixtures/'+n+'.json')));
const cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,{...c,context:c.context||{customer:'Synthetic release restriction',serviceHistory:[{timestamp:c.timestamp,note:c.note}]}}])));
const captures=new Map(),rows=[];
// Policy/version hashes intentionally change every draft. Compare behavior separately.
function behavior(actual){return actual.findings.map(f=>({key:f.opportunityKey,id:f.findingId,classification:f.classification,type:f.opportunityType,confidence:f.confidence,evidence:f.evidence,recommendation:f.recommendedNextAction,review:f.humanReviewRequired,purpose:f.proposedAction.actionPurpose,timing:f.proposedAction.material.sourceTimingConstraints,gates:f.proposedAction.material.customerActionGates,restrictions:f.proposedAction.material.sourceRestrictions,task:f.proposedAction.actionPayload}));}
for(const old of before.rows){
 if(!captures.has(old.captureFile))captures.set(old.captureFile,await load('docs/release/evidence/'+old.captureFile));
 const original=captures.get(old.captureFile).rows.find(r=>r.id===old.id&&r.rawModelOutput&&hash(JSON.parse(r.rawModelOutput))===old.rawOutputHash);
 assert(original,'missing exact immutable provider capture');
 const c=cases.get(old.id),history=await prepareHistory(c.context),time=old.sourceTime;
 const actual=await materializeCorrected(JSON.parse(original.rawModelOutput),history,'synthetic:'+c.id,time);
 const quality=actual.findings.flatMap(f=>inspectFinding(f,history,actual.findings,time).qualityFailures);
 const grade=c.expectedFindings?await gradeFindings(c,actual,{materializer:(r,h,k)=>materializeCorrected(r,h,k,time)}):null;
 const decisionPassed=grade?grade.decisionPassed:c.types?canonical(actual.findings.map(f=>f.opportunityType).sort())===canonical([...c.types].sort()):(actual.findings.length>0)===c.expectedActionable;
 const quoted=actual.findings.flatMap(f=>f.evidence.map(e=>e.quote)).join('\n');
 const missing=(typeof c.required==='string'?[c.required]:c.required||[]).filter(q=>!quoted.includes(q));
 const uv11Passed=c.id!=='UV11'||actual.findings.every(f=>f.proposedAction.actionPurpose==='internal_verification'&&f.proposedAction.material.documentedCompletion?.sourceTimestamp==='2025-02-13T10:00:00Z'&&f.proposedAction.material.sourceTimingConstraints.some(t=>t.wording==='now'&&t.status==='HISTORICAL_NOT_RENEWED')&&!f.proposedAction.material.customerActionPermitted);
 rows.push({id:old.id,run:old.run,captureFile:old.captureFile,sourceTime:time,rawOutputHash:old.rawOutputHash,actual,outputHash:hash(actual),decisionPassed,quality,missingRequiredEvidence:missing,uv11PolicyPassed:uv11Passed,behaviorChanged:canonical(behavior(old.actual))!==canonical(behavior(actual)),passed:decisionPassed&&!quality.length&&!missing.length&&uv11Passed,humanReview:'PENDING',finalExecutionApproval:false});
}
const originalRows=rows.filter(r=>suites[0].cases.some(c=>c.id===r.id)),confusion={tp:0,tn:0,fp:0,fn:0};
for(const r of originalRows){const want=cases.get(r.id).expectedFindings.length>0,got=r.actual.findings.length>0;confusion[want?(got?'tp':'fn'):(got?'fp':'tn')]++;}
const consistency=[];
for(const id of new Set(rows.map(r=>r.id))){const group=rows.filter(r=>r.id===id);if(group.length<3)continue;
 const signature=r=>canonical(r.actual.findings.map(f=>({classification:f.classification,type:f.opportunityType,purpose:f.proposedAction.actionPurpose,review:f.humanReviewRequired,noteIds:f.evidence.map(e=>e.noteId).sort()})).sort((a,b)=>a.type.localeCompare(b.type)));
 consistency.push({id,captures:group.length,decisionStable:new Set(group.map(signature)).size===1,purposeStable:new Set(group.map(r=>canonical(r.actual.findings.map(f=>f.proposedAction.actionPurpose).sort()))).size===1,rawKeysStable:new Set(group.map(r=>canonical(r.actual.findings.map(f=>f.opportunityKey).sort()))).size===1,exactRecommendationsStable:new Set(group.map(r=>canonical(r.actual.findings.map(f=>f.recommendedNextAction).sort()))).size===1});
}
const changedCases=[...new Set(rows.filter(r=>r.behaviorChanged).map(r=>r.id))];
const result={kind:'OFFLINE_REPLAY_OF_205_RETAINED_CAPTURES_NOT_NEW_MODEL_CALLS',baselineCommit:'220fa9bf537cb4c1989f27afbdc193ba2d3ffe97',newModelCalls:0,hubspotCalls:0,modelPromptChanged:false,PROMPT_VERSION,SCHEMA_VERSION,MATERIALIZATION_VERSION,rows,summary:{captures:rows.length,uniqueCases:cases.size,passed:rows.filter(r=>r.passed).length,failures:rows.filter(r=>!r.passed).map(r=>({id:r.id,quality:r.quality,missing:r.missingRequiredEvidence,decision:r.decisionPassed,policy:r.uv11PolicyPassed})),changedCases,unaffectedCasesBehaviorUnchanged:changedCases.every(id=>id==='UV11'),originalCorpusExecutions:originalRows.length,originalCorpusDecisionPasses:originalRows.filter(r=>r.decisionPassed).length,confusion,consistency,decisionConsistencyRate:consistency.filter(r=>r.decisionStable).length/consistency.length,newHumanApprovals:0}};
await writeFile(output+'/replay.json',JSON.stringify(result,null,2)+'\n');
const baselineProposals=await load('docs/release/evidence/revised-proposals.json');
const revised=baselineProposals.proposals.map(p=>{const row=rows.find(r=>r.id===p.caseId&&r.captureFile===p.providerCapture&&r.rawOutputHash===p.rawOutputHash),finding=row.actual.findings.find(f=>f.opportunityKey===p.finding.opportunityKey);assert(finding);return {...p,materializedOutputHash:row.outputHash,finding,reviewItemHash:hash({caseId:p.caseId,outputHash:row.outputHash,finding}),humanSemanticVerdict:'PENDING_FOR_THIS_OUTPUT',finalExecutionApproval:false};});
const packet={kind:'NEW_REVIEW_DRAFTS_NO_INHERITED_HUMAN_APPROVAL',MATERIALIZATION_VERSION,proposals:revised,UV11:rows.filter(r=>r.id==='UV11')};
try{const fresh=await load(output+'/fresh-model.json');assert.equal(fresh.materializationVersion,MATERIALIZATION_VERSION);packet.UV11Fresh=fresh.rows;}catch(error){if(error.code!=='ENOENT')throw error;}
await writeFile(output+'/revised-proposals.json',JSON.stringify(packet,null,2)+'\n');
console.log(JSON.stringify(result.summary,null,2));
if(result.summary.failures.length||!result.summary.unaffectedCasesBehaviorUnchanged)process.exitCode=1;
