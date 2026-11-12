// Replay retained raw captures against current source, without overwriting history.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {materializeCorrected,MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
import {prepareHistory,canonical} from '../../src/findings.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
import {gradeFindings,hash} from '../regression/findings-core.js';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
if(MATERIALIZATION_VERSION!=='source-evidence-v0.3.8')throw Error('historical_output_directory_protected_use_scripts_review_scope_replay_js');
const dir='docs/review/semantic-diagnostic-cycle';await mkdir(dir,{recursive:true});
const baseline=await load('docs/review/completion-correction/replay.json');
const latest=await load('docs/review/completion-correction/fresh-model.json');
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','absolute-timing-boundaries-v1','release-restrictions-v1','release-negative-qualifiers-v1'].map(s=>load('fixtures/'+s+'.json')));
const cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,{...c,context:c.context||{customer:'Synthetic restriction',serviceHistory:[{timestamp:c.timestamp,note:c.note}]}}])));
const inputs=[...baseline.rows,...latest.rows.map(r=>({...r,captureFile:'completion-correction/fresh-model.json',sourceTime:latest.evaluationTime,run:r.repeat,rawOutputHash:hash(JSON.parse(r.rawModelOutput))}))];
const captures=new Map(),rows=[];
for(const old of inputs){
 let rawText=old.rawModelOutput;
 if(!rawText){if(!captures.has(old.captureFile))captures.set(old.captureFile,await load('docs/release/evidence/'+old.captureFile));rawText=captures.get(old.captureFile).rows.find(r=>r.id===old.id&&r.rawModelOutput&&hash(JSON.parse(r.rawModelOutput))===old.rawOutputHash)?.rawModelOutput;}
 assert(rawText,'original_raw_capture_required');
 const raw=JSON.parse(rawText),c=cases.get(old.id),h=await prepareHistory(c.context),time=old.sourceTime;
 const actual=await materializeCorrected(raw,h,'synthetic:'+c.id,time),quality=actual.findings.flatMap(f=>inspectFinding(f,h,actual.findings,time).qualityFailures);
 const grade=c.expectedFindings?await gradeFindings(c,actual,{materializer:(r,h,k)=>materializeCorrected(r,h,k,time)}):null;
 const decisionPassed=grade?grade.decisionPassed:c.types?canonical(actual.findings.map(f=>f.opportunityType).sort())===canonical([...c.types].sort()):(actual.findings.length>0)===c.expectedActionable;
 const quotes=actual.findings.flatMap(f=>f.evidence.map(e=>e.quote)).join('\n');
 const missing=(typeof c.required==='string'?[c.required]:c.required||[]).filter(q=>!quotes.includes(q));
 const canonicalClassPassed=c.id!=='UV11'||actual.findings.every(f=>f.classification==='strong cross-sell opportunity'&&f.opportunityType==='cross-sell'&&f.proposedAction.actionPurpose==='internal_verification'&&f.proposedAction.material.documentedCompletion?.sourceTimestamp==='2025-02-13T10:00:00Z'&&!f.proposedAction.material.customerActionPermitted);
 rows.push({id:old.id,run:old.run,captureFile:old.captureFile,sourceTime:time,rawOutputHash:hash(raw),rawLabels:raw.findings.map(f=>({opportunityKey:f.opportunityKey,classification:f.classification,opportunityType:f.opportunityType})),actual,outputHash:hash(actual),decisionPassed,quality,missingRequiredEvidence:missing,canonicalClassPassed,findingBodyChanged:canonical(actual.findings)!==canonical(old.actual.findings),passed:decisionPassed&&!quality.length&&!missing.length&&canonicalClassPassed,humanSemanticVerdict:'PENDING',finalExecutionApproval:false});
}
const original=rows.filter(r=>suites[0].cases.some(c=>c.id===r.id)),confusion={tp:0,tn:0,fp:0,fn:0};
for(const r of original){const want=cases.get(r.id).expectedFindings.length>0,got=r.actual.findings.length>0;confusion[want?(got?'tp':'fn'):(got?'fp':'tn')]++;}
const changed=[...new Set(rows.filter(r=>r.findingBodyChanged).map(r=>r.id))];
const report={kind:'OFFLINE_REPLAY_OF_RETAINED_RAW_CAPTURES_NOT_FRESH_MODEL_EVALUATIONS',baselineCommit:'6b2560479de513f41f20fa9f52778ec0454f8a0f',materializationVersion:MATERIALIZATION_VERSION,providerPromptChanged:false,modelCalls:0,hubspotCalls:0,freshModelValidation:'PENDING_EXHAUSTED_210_CALL_BUDGET',rows,summary:{captures:rows.length,uniqueCases:new Set(rows.map(r=>r.id)).size,passed:rows.filter(r=>r.passed).length,failures:rows.filter(r=>!r.passed).map(r=>({id:r.id,quality:r.quality,missing:r.missingRequiredEvidence})),originalCorpusExecutions:original.length,originalCorpusDecisionPasses:original.filter(r=>r.decisionPassed).length,confusion,changedFindingCases:changed,unrelatedFindingBodiesUnchanged:changed.every(id=>id==='UV11'),newHumanApprovals:0}};
await writeFile(dir+'/retained-capture-replay.json',JSON.stringify(report,null,2)+'\n');
const priorPacket=await load('docs/review/completion-correction/revised-proposals.json');
const items=priorPacket.proposals.map(p=>{const r=rows.find(r=>r.id===p.caseId&&r.captureFile===p.providerCapture&&r.rawOutputHash===p.rawOutputHash),finding=r.actual.findings.find(f=>f.opportunityKey===p.finding.opportunityKey);assert(finding);return {caseId:p.caseId,sourceContext:p.sourceContext,providerCapture:r.captureFile,rawOutputHash:r.rawOutputHash,outputHash:r.outputHash,finding,reviewItemHash:hash({caseId:p.caseId,outputHash:r.outputHash,finding}),humanVerdict:'PENDING',notes:'',finalExecutionApproval:false};});
const uv11=rows.filter(r=>r.id==='UV11').map(r=>({caseId:r.id,sourceContext:cases.get(r.id).context,providerCapture:r.captureFile,run:r.run,rawOutputHash:r.rawOutputHash,rawLabels:r.rawLabels,outputHash:r.outputHash,finding:r.actual.findings[0],reviewItemHash:hash({caseId:r.id,outputHash:r.outputHash,finding:r.actual.findings[0]}),humanVerdict:'PENDING',notes:'',finalExecutionApproval:false}));
await writeFile(dir+'/review-packet.json',JSON.stringify({kind:'EXACT_REVISED_DRAFTS_PENDING_HUMAN_REVIEW',baselineCommit:report.baselineCommit,MATERIALIZATION_VERSION,items,UV11:uv11},null,2)+'\n');
console.log(JSON.stringify(report.summary));
if(report.summary.failures.length||!report.summary.unrelatedFindingBodiesUnchanged)process.exitCode=1;
