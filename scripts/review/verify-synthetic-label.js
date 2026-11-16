// Current source review integrity, not human semantic or execution approval.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {hash} from '../regression/findings-core.js';
import {contractHash} from '../../src/staging/general-ledger.js';
import {MATERIALIZATION_VERSION,EVIDENCE_POLICY} from '../../src/release/reasoning.js';
const dir='docs/review/demo-closeout/synthetic-label-correction',load=async p=>JSON.parse(await readFile(p,'utf8'));
const [plan,packet,report,replay,contracts]=await Promise.all(['plan.json','review-packet.json','fresh-model.json','capture-replay.json','contracts.json'].map(f=>load(dir+'/'+f)));
assert.equal(MATERIALIZATION_VERSION,plan.materializer);assert.equal(EVIDENCE_POLICY,plan.evidencePolicy);assert.equal(contractHash,contracts.after.approvalContractHash);
for(const [file,sha]of Object.entries(plan.sourceHashes))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),sha,'unreviewed_source_change');
const {packetHash,...base}=packet;assert.equal(hash(base),packetHash);assert.equal(packet.sourceCommit,report.sourceCommit);
assert.equal(packet.items.length,6);for(const item of packet.items){const {reviewItemHash,...baseItem}=item;assert.equal(hash(baseItem),reviewItemHash);assert.equal(hash(item.exactOutput),item.outputHash);assert.equal(item.reviewVerdict,'PENDING');assert.equal(item.executionApproval,false);}
assert.equal(report.summary.reservedCalls,2);assert.equal(report.summary.passed,2);assert.equal(report.summary.unrun,0);assert(report.rows.every(r=>r.passed&&Object.values(r.checks).every(Boolean)));assert(report.summary.consistency.every(c=>c.proposalConsistent));
const reservations=(await readFile(dir+'/reservations.jsonl','utf8')).trim().split('\n').map(s=>JSON.parse(s));assert.deepEqual(reservations.map(r=>r.sequence),[1,2]);
assert.equal(replay.afterFailures,0);assert.equal(replay.retainedBusinessRegressions,0);assert.equal(replay.retainedLatestCaptures.length,32);assert.equal(replay.identityProof.additionalIdentities,0);assert.deepEqual(replay.identityProof.idsBefore,replay.identityProof.idsAfter);
console.log(JSON.stringify({kind:'CURRENT_REVIEW_PACKET_AUTOMATED_INTEGRITY_NOT_RELEASE_ACCEPTANCE',packetHash,automationPassed:true,sourceCommit:report.sourceCommit,materializer:MATERIALIZATION_VERSION,evidencePolicy:EVIDENCE_POLICY,freshCalls:2,reviewItems:6,humanSemanticVerdicts:'PENDING',executionApproved:false,releaseAccepted:false}));
