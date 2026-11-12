import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {completedPricingClassification} from '../src/staging/completion-policy.js';
const digest=b=>createHash('sha256').update(b).digest('hex');
test('the explicit Cross-sell choice is a source-bound policy event, not semantic or execution approval',async()=>{
 const ledger=JSON.parse(await readFile('docs/review/semantic-diagnostic-cycle/human-decisions.json','utf8'));
 assert.equal(ledger.events.length,1);const event=ledger.events[0];
 assert.equal(event.verbatimUserResponse,'Cross-sell');assert.equal(event.scope,'CLASSIFICATION_POLICY_ONLY');
 assert.equal(event.reviewPacketSha256,digest(await readFile(event.reviewPacket)));
 assert.equal(event.referencedOutputHashes.length,5);assert.equal(event.humanSemanticVerdict,null);
 assert.equal(event.finalExecutionApproval,false);assert.equal(event.releaseApproval,false);
 assert.deepEqual(ledger.semanticVerdicts,[]);
});
test('all checkpoint fixtures, raw captures, previous semantic decisions and review artifacts remain unchanged',async()=>{
 const files=JSON.parse(await readFile('docs/review/semantic-diagnostic-cycle/preserved-checkpoint-sha256.json','utf8'));
 for(const [path,hash]of Object.entries(files))assert.equal(digest(await readFile(path)),hash,path);
});
test('the selected label policy cannot rewrite unrelated, deferred, scope-change or service-recovery findings',()=>{
 const positive={classification:'follow-up revenue opportunity',opportunityType:'follow-up'};
 assert.deepEqual(completedPricingClassification(positive,{}),positive);
 for(const f of [{classification:'scope-change opportunity',opportunityType:'scope change'},{classification:'retention or service-recovery opportunity',opportunityType:'retention'},{classification:'no opportunity',opportunityType:'none'}])assert.deepEqual(completedPricingClassification(f,{documentedCompletion:{}}),f);
});
test('the historical replay command fails before overwriting an earlier policy evidence directory',async()=>{
 const result=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['scripts/release/completion-replay.js'],{stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('error',reject);p.on('close',code=>resolve({code,output}));});
 assert.notEqual(result.code,0);assert.match(result.output,/historical_output_directory_protected/);
});
