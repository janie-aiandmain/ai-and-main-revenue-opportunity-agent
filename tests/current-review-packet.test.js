import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {prepareHistory} from '../src/findings.js';
import {sourceAnchors} from '../src/correction-policy.js';
import {hash} from '../scripts/regression/findings-core.js';
import {MATERIALIZATION_VERSION} from '../src/release/reasoning.js';
import {INTERNAL_PROPOSAL_VERSION} from '../src/staging/internal-task-policy.js';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const path='docs/review/current-v0.3.9/review-packet.json';
test('consolidated review binds all fourteen current drafts to exact output hashes and grounded source without inheriting old verdicts',async()=>{
 const packet=await load(path);assert.equal(packet.items.length,14);assert.equal(new Set(packet.items.map(i=>i.reviewId)).size,14);
 assert.equal(packet.materializer,MATERIALIZATION_VERSION);assert.equal(packet.proposalVersion,INTERNAL_PROPOSAL_VERSION);
 for(const i of packet.items){
  assert.equal(i.humanVerdict,'PENDING');assert.equal(i.finalExecutionApproval,false);assert.equal(i.releaseAcceptance,false);
  assert.equal(i.finding.proposedAction.schemaVersion,INTERNAL_PROPOSAL_VERSION);
  assert.equal(i.reviewItemHash,hash({caseId:i.caseId,outputHash:i.outputHash,finding:i.finding}));
  assert.notEqual(i.reviewItemHash,i.previousReviewItemHash);
  sourceAnchors(await prepareHistory(i.sourceContext),i.finding.evidence);
  assert.equal(i.finding.proposedAction.executionBlocked,true);
  assert.equal(i.finding.proposedAction.material.customerActionPermitted,false);
 }
 for(const [p,sha]of Object.entries(packet.sourceHashes))assert.equal(createHash('sha256').update(await readFile(p)).digest('hex'),sha,p);
});
test('current ST03/EN31 match the published urgent previews; UV11 preserves completion, history and the unresolved HIGH-priority decision',async()=>{
 const packet=await load(path),previews=(await load('docs/review/in-progress-scope/previews.json')).previews;
 for(const old of previews){const x=packet.items.find(i=>i.caseId===old.caseId);assert.equal(x.outputHash,old.outputHash);assert.equal(x.reviewItemHash,old.reviewItemHash);assert.equal(x.finding.proposedAction.material.reviewRouting.queue,'immediate_review');}
 const uv=packet.items.filter(i=>i.caseId==='UV11');assert.equal(uv.length,5);
 for(const i of uv){assert.equal(i.finding.opportunityType,'cross-sell');assert.equal(i.finding.proposedAction.actionPurpose,'internal_verification');assert.equal(i.finding.proposedAction.material.documentedCompletion.sourceTimestamp,'2025-02-13T10:00:00Z');assert.match(i.finding.recommendedNextAction,/historical, not renewed/);assert.match(i.assistantSuggestedVerdict,/CONCERN/);}
 const ledger=await load('docs/review/current-v0.3.9/human-decisions.json');assert.equal(ledger.packetHash,hash(packet));
 // The initial ledger deliberately has no machine-created human verdict.
 assert(ledger.events.every(e=>e.scope==='HUMAN_SEMANTIC_ONLY'&&e.finalExecutionApproval===false));
});
test('proposed inference allowance does not authorize calls or reset the exhausted historical budget',async()=>{
 const plan=await load('docs/review/current-v0.3.9/model-validation-plan.json');
 assert.equal(plan.authorized,false);assert.equal(plan.currentTrackedCalls,210);assert.equal(plan.maximumAdditionalCalls,32);
 assert.equal(plan.groups.reduce((n,g)=>n+g.cases.length*g.runsPerCase,0),32);assert.equal(plan.callsExecuted,0);
 assert.equal(plan.proposedCumulativeMaximum,242);assert.equal(plan.reservationRecordsModified,false);
});
