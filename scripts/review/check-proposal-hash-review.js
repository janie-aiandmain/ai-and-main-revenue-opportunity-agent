// Verify the current correction packet without overwriting historical evidence.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
import {INTERNAL_PROPOSAL_VERSION,INTERNAL_PROPOSAL_HASH_POLICY} from '../../src/staging/internal-task-policy.js';
import {gradeWorkflowCase} from '../regression/workflow-core.js';
import {hash} from '../regression/findings-core.js';
globalThis.fetch=async()=>{throw Error('offline_review_network_forbidden');};
const load=async p=>JSON.parse(await readFile(p,'utf8')),dir='docs/review/proposal-hash-correction';
const [packet,before,ledger]=await Promise.all([load(dir+'/replay.json'),load('docs/review/current-v0.3.9/model-validation/fresh-model.json'),load(dir+'/human-decisions.json')]);
assert.equal(packet.materializer,MATERIALIZATION_VERSION);assert.equal(packet.proposalVersion,INTERNAL_PROPOSAL_VERSION);assert.equal(packet.hashPolicy,INTERNAL_PROPOSAL_HASH_POLICY);
assert.equal(packet.beforeReportHash,hash(before));assert.equal(ledger.replayReportHash,hash(packet));assert.equal(packet.rows.length,32);
for(const [p,sha]of Object.entries(packet.sourceHashes))assert.equal(createHash('sha256').update(await readFile(p)).digest('hex'),sha,p);
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','release-restrictions-v1'].map(n=>load('fixtures/'+n+'.json'))),cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,c])));
for(const row of packet.rows){
 const old=before.rows.find(r=>r.callId===row.callId);assert(old);const current=await gradeWorkflowCase({...cases.get(row.id),context:row.sourceContext},JSON.parse(old.rawModelOutput),row.sourceTime);
 assert.equal(current.outputHash,row.outputHash);assert(current.passed);assert.equal(row.humanSemanticVerdict,'PENDING');assert.equal(row.finalExecutionApproval,false);
}
console.log(JSON.stringify({kind:'CURRENT_CORRECTION_PACKET_CHECK',materializer:MATERIALIZATION_VERSION,proposalVersion:INTERNAL_PROPOSAL_VERSION,checked:32,modelCalls:0,humanApprovalInferred:false}));
