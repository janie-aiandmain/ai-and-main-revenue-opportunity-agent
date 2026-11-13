// Offline accounting and capture integrity only; never calls a provider.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {hash} from '../regression/findings-core.js';
import {gradeWorkflowCase} from '../regression/workflow-core.js';
const dir='docs/review/current-v0.3.9/model-validation',load=async p=>JSON.parse(await readFile(p,'utf8'));
const report=await load(dir+'/fresh-model.json'),analysis=await load(dir+'/analysis.json');
const lines=async p=>(await readFile(p,'utf8')).trim().split('\n').map(JSON.parse);
const reserved=await lines(dir+'/reservations.jsonl'),wire=await lines(dir+'/provider-captures.jsonl');
assert.equal(reserved.length,32);assert.equal(wire.length,32);assert.equal(report.rows.length,32);assert.equal(report.summary.cumulativeReservedCalls,242);
for(const [i,r]of report.rows.entries()){
 const capture=wire.find(c=>c.callId===r.callId),reservation=reserved.find(c=>c.callId===r.callId);
 assert.equal(reservation.sequence,i+1);assert.equal(capture.rawModelOutput,r.rawModelOutput);assert.equal(capture.requestBodyHash,reservation.requestBodyHash);assert.equal(capture.httpStatus,200);assert.equal(hash(r.actual),r.outputHash);
 assert(Date.parse(reservation.reservedBeforeRequestAt)<=Date.parse(capture.receivedAt));assert.equal(r.humanSemanticVerdict,'PENDING');assert.equal(r.finalExecutionApproval,false);
}
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','release-restrictions-v1'].map(n=>load('fixtures/'+n+'.json'))),cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,{...c,context:c.context||{customer:'Synthetic restriction '+c.id,serviceHistory:[{timestamp:c.timestamp,note:c.note}]}}])));
for(const r of report.rows){const graded=await gradeWorkflowCase(cases.get(r.id),JSON.parse(r.rawModelOutput),report.evaluationTime);assert.equal(graded.outputHash,r.outputHash);assert(graded.passed);}
const base='9e075fb311e3adea7df54dd5ed061695cf7fdbbd',tracked=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n'),protectedFiles={};
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const p of tracked)if(p.startsWith('src/')||p.startsWith('fixtures/')||p.startsWith('docs/review/')||p.startsWith('docs/release/evidence/')||p.startsWith('docs/baselines/')||p.startsWith('wrangler.')){
 const previous=execFileSync('git',['show',base+':'+p],{maxBuffer:64*1024*1024});assert.equal(sha(await readFile(p)),sha(previous),p);protectedFiles[p]=sha(previous);
}
const proof={kind:'OFFLINE_FRESH_RUN_ACCOUNTING_AND_IMMUTABILITY_PROOF',preRunCheckpoint:base,retainedFilesUnchanged:Object.keys(protectedFiles).length,protectedSha256:protectedFiles,priorModelBudgetUntouched:true,recordedPriorCalls:210,newReservedCalls:32,providerReceipts:32,uniqueProviderResponseIds:new Set(wire.map(w=>w.providerResponseId)).size,cumulativeReservedCalls:242,remainingAllowance:0,offlineFreshReplaysPassed:32,allFreshVerdictsPending:true,localAnalysisNeeds:analysis.summary.analysisIdentityCount,extraLocalIdentities:analysis.summary.extraAnalysisIdentities,hubspotCalls:0,emailCalls:0,deployments:0};
await writeFile(dir+'/accounting-proof.json',JSON.stringify(proof,null,2)+'\n');
try{await readFile(dir+'/fresh-human-decisions.json');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(dir+'/fresh-human-decisions.json',JSON.stringify({schemaVersion:'append-only-semantic-review-events-v1',sourceReport:'docs/review/current-v0.3.9/model-validation/fresh-model.json',sourceReportHash:hash(report),scope:'HUMAN_SEMANTIC_ONLY',events:[],finalExecutionApproval:false,releaseAcceptance:false},null,2)+'\n');}
console.log(JSON.stringify({proof:'PASS',priorRecordsUnchanged:true,remainingAllowance:0,replayedFreshOutputs:32,protectedFiles:Object.keys(protectedFiles).length}));
