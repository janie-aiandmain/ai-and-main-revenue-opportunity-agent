// Verify a supplied hosted report; no CRM/model/mail calls and no test rerun.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import fixture from '../../fixtures/approval-negative-v1.json' with {type:'json'};
import {digest} from '../../src/staging/operation-ledger.js';
import {APPROVAL_NEGATIVE_POLICY,diagnosticName} from '../../src/staging/approval-negatives.js';
import {contractHash} from '../../src/staging/general-ledger.js';

const base='docs/review/demo-approval-negatives-2026-11-17',dir=base+'/hosted';
const original=await readFile(dir+'/operator-receipt-original.txt'),provenance=JSON.parse(await readFile(dir+'/provenance.json','utf8'));
const r=JSON.parse(await readFile(dir+'/operator-receipt.json','utf8')),deployed=JSON.parse(await readFile(base+'/deployment-owner.json','utf8'));
assert.equal(createHash('sha256').update(original).digest('hex'),provenance.originalSha256);
assert.equal(original.length,provenance.originalBytes);assert.deepEqual(JSON.parse('{'+original.toString('utf8')),r);
assert.equal(r.policyVersion,APPROVAL_NEGATIVE_POLICY);assert.equal(r.fixtureVersion,fixture.fixtureVersion);
assert.equal(r.fixtureHash,digest(fixture));assert.equal(r.approvalContractHash,contractHash);
assert.equal(r.sourceCommit,deployed.sourceCommit);assert.equal(r.ownerDeploymentVersion,deployed.activeVersionId);
assert.equal(r.executionEnvironment,'HOSTED_CLOUDFLARE_DURABLE_SQLITE_WITH_SYNTHETIC_FIXTURES');
assert.match(r.runId,/^negative-[a-f0-9-]{36}$/);assert.equal(r.isolatedObjectName,diagnosticName(r.runId));
assert.equal(r.isolatedObjectVerified,true);assert.equal(r.namespaceReused,true);assert.equal(r.cached,false);
assert.equal(r.invocationIdentityKind,'EXTERNAL_VERIFIED');assert.equal(r.operatorInvocation.identityKind,'EXTERNAL_VERIFIED');
assert.equal(r.operatorInvocation.role,'Approver');assert.equal(r.operatorInvocation.subjectHash,digest('68cac6f1-0127-51c9-a1b2-ee2d5b031945'));
assert.equal(r.testApprovalIdentityKind,'LOCAL_SYNTHETIC');assert.equal(r.testApprovalsAreHumanSignoff,false);assert.equal(r.operatorInvocation.humanSemanticApproval,false);
assert.equal(r.realOperatorLedgerAccessed,false);
for(const field of ['liveHubspotRequests','liveTaskCreates','modelCalls','emailProviderCalls'])assert.equal(r[field],0,field);
assert.equal(r.rows.length,fixture.cases.length);assert.equal(new Set(r.rows.map(x=>x.caseId)).size,fixture.cases.length);
for(const c of fixture.cases){
 const row=r.rows.find(x=>x.caseId===c.id);assert.ok(row,c.id);assert.equal(row.kind,c.kind);assert.equal(row.expected,c.expected);assert.equal(row.humanApproval,false);
 assert.equal(row.method,c.kind==='context_contract'?'resumeApproval':'executeGeneral');
 let passed;
 if(c.expected==='CONFIRMED_ONCE')passed=row.disposition==='CONFIRMED'&&row.remainingState==='CONFIRMED'&&row.simulatedCreateCalls===1&&row.rejection===null;
 else if(c.expected==='UNKNOWN_NO_CREATE')passed=row.disposition==='UNKNOWN'&&row.remainingState==='UNKNOWN'&&row.simulatedCreateCalls===0&&row.rejection===null&&row.trace.includes(c.expectedTrace);
 else passed=row.disposition==='REJECTED'&&row.rejection===c.expectedReason&&row.expectedRejection===c.expectedReason&&row.simulatedCreateCalls===0;
 assert.equal(passed,true,c.id+' failed independent row checks');assert.equal(row.passed,passed,c.id);
}
const recomputed={cases:r.rows.length,passed:r.rows.length,failed:0,negativeCases:r.rows.filter(x=>x.expected!=='CONFIRMED_ONCE').length,negativeSimulatedCreateEscapes:r.rows.filter(x=>x.expected!=='CONFIRMED_ONCE'&&x.simulatedCreateCalls>0).length,positiveControlSimulatedCreates:r.rows.filter(x=>x.expected==='CONFIRMED_ONCE').reduce((n,x)=>n+x.simulatedCreateCalls,0),liveTaskCreates:0,fixtureOperationalRowsRetained:0};
assert.deepEqual(r.summary,recomputed);assert.equal(r.summary.fixtureOperationalRowsRetained,0);
const result={kind:'OFFLINE_VERIFICATION_OF_OPERATOR_SUPPLIED_HOSTED_REPORT',verified:true,runId:r.runId,receiptHash:digest(r),originalSha256:provenance.originalSha256,fixtureHash:r.fixtureHash,approvalContractHash:r.approvalContractHash,sourceCommit:r.sourceCommit,ownerDeploymentVersion:r.ownerDeploymentVersion,ledgerBootId:r.ledgerBootId,operatorInvocation:r.operatorInvocation,summary:recomputed,verificationScope:'Checked report contents, expected per-case rejection/UNKNOWN traces, zero simulated escapes, contract and deployment bindings. Operator receipt is not an independently downloaded or cryptographically signed attestation.',humanSemanticApproval:false,finalExecutionApproval:false,finalDemoReleaseAcceptance:'PENDING',newHubspotCalls:0,newModelCalls:0,newEmailCalls:0};
await writeFile(dir+'/receipt-check.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
