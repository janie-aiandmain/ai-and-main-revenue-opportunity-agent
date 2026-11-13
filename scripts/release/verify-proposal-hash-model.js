// Local accounting/capture verification. No provider or CRM access.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {hash} from '../regression/findings-core.js';
import {gradeWorkflowCase} from '../regression/workflow-core.js';
const dir='docs/review/proposal-hash-validation',load=async p=>JSON.parse(await readFile(p,'utf8'));
const [report,plan,authorization,analysis]=await Promise.all([load(dir+'/fresh-model.json'),load(dir+'/plan.json'),load(dir+'/authorization.json'),load(dir+'/analysis.json')]);
const lines=async p=>(await readFile(p,'utf8')).split('\n').filter(Boolean).map(JSON.parse);
const [reserved,wire]=await Promise.all([lines(dir+'/reservations.jsonl'),lines(dir+'/provider-captures.jsonl')]);
assert.equal(report.authorizationHash,hash(authorization));assert.equal(report.planHash,hash(plan));assert.equal(report.summary.attempted,reserved.length);assert.equal(report.summary.cumulativeReservedCalls,242+reserved.length);
assert.equal(reserved.length,32);assert.equal(wire.length,32);assert.equal(report.rows.length,32);assert.equal(new Set(wire.map(r=>r.providerResponseId)).size,32);
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','release-restrictions-v1'].map(n=>load('fixtures/'+n+'.json')));
const cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,{...c,context:c.context||{customer:'Synthetic restriction '+c.id,serviceHistory:[{timestamp:c.timestamp,note:c.note}]}}])));
for(const [i,row]of report.rows.entries()){
 const reservation=reserved[i],capture=wire.find(c=>c.callId===row.callId);assert(capture);
 assert.equal(reservation.sequence,i+1);assert.equal(reservation.callId,row.callId);assert.equal(reservation.requestBodyHash,capture.requestBodyHash);assert.equal(capture.rawModelOutput,row.rawModelOutput);assert.equal(capture.httpStatus,200);
 assert(Date.parse(reservation.reservedBeforeRequestAt)<=Date.parse(capture.receivedAt));assert.equal(row.humanSemanticVerdict,'PENDING');assert.equal(row.finalExecutionApproval,false);
 const replayed=await gradeWorkflowCase(cases.get(row.id),JSON.parse(capture.rawModelOutput),report.evaluationTime);assert.equal(replayed.outputHash,row.outputHash);assert.equal(replayed.passed,row.passed);
}
const checkpoint='60da9e019b7cf20009ba5742061560e60aa75676',format=execFileSync('git',['rev-parse','--show-object-format'],{encoding:'utf8'}).trim(),protectedFiles={};
for(const entry of execFileSync('git',['ls-tree','-r','-z',checkpoint],{encoding:'utf8',maxBuffer:8*1024*1024}).split('\0').filter(Boolean)){
 const [header,path]=entry.split('\t'),[,type,objectId]=header.split(' ');
 if(type!=='blob'||!(/^(?:docs\/|fixtures\/|src\/|wrangler[^/]*\.jsonc$)/.test(path)||/reservations.*\.jsonl$/.test(path)))continue;
 const bytes=await readFile(path);assert.equal(createHash(format).update('blob '+bytes.length+'\0').update(bytes).digest('hex'),objectId,'protected_file_changed: '+path);protectedFiles[path]=createHash('sha256').update(bytes).digest('hex');
}
const proof={kind:'FRESH_CONTINUATION_ACCOUNTING_AND_IMMUTABILITY_PROOF',runtimeCheckpoint:checkpoint,evaluationSourceCommit:report.sourceCommit,protectedFilesUnchanged:Object.keys(protectedFiles).length,protectedSha256:protectedFiles,priorReservedCalls:242,newReservedCalls:reserved.length,providerReceipts:wire.length,cumulativeReservedCalls:242+reserved.length,cumulativeCallCeiling:null,freshCapturedOutputsReplayed:32,allFreshVerdictsPending:true,analysisReportHash:hash(analysis),localNeeds:analysis.summary.analysisIdentityCount,extraLocalIdentities:analysis.summary.extraAnalysisIdentities,modelOutputGenerationChanged:false,hubspotCalls:0,emailCalls:0,deployments:0};
await writeFile(dir+'/accounting-proof.json',JSON.stringify(proof,null,2)+'\n');
try{await readFile(dir+'/human-decisions.json');}catch(e){if(e.code!=='ENOENT')throw e;await writeFile(dir+'/human-decisions.json',JSON.stringify({schemaVersion:'append-only-semantic-review-events-v1',sourceReportHash:hash(report),scope:'HUMAN_SEMANTIC_ONLY',events:[],finalExecutionApproval:false,releaseAcceptance:false},null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify({proof:'PASS',newReservedCalls:reserved.length,cumulativeReservedCalls:242+reserved.length,protectedFilesUnchanged:Object.keys(protectedFiles).length,cumulativeCallCeiling:null}));
