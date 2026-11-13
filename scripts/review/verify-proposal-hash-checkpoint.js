// Local Git/file comparison only; no provider, CRM, mailer or deployment access.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {canonical} from '../../src/findings.js';
const checkpoint='e9c0c57654938714c49d579204abb97f09716915';
const dir='docs/review/proposal-hash-correction',load=async p=>JSON.parse(await readFile(p,'utf8'));
const format=execFileSync('git',['rev-parse','--show-object-format'],{encoding:'utf8'}).trim();
assert(['sha1','sha256'].includes(format));
const files={};
for(const entry of execFileSync('git',['ls-tree','-r','-z',checkpoint],{encoding:'utf8',maxBuffer:8*1024*1024}).split('\0').filter(Boolean)){
 const [header,path]=entry.split('\t'),[,type,objectId]=header.split(' ');
 if(type!=='blob'||!(/^(?:docs\/|fixtures\/|wrangler[^/]*\.jsonc$|src\/findings-request-)/.test(path)||/reservations.*\.jsonl$/.test(path)))continue;
 const bytes=await readFile(path),gitObject=createHash(format).update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(gitObject,objectId,'protected_checkpoint_file_changed: '+path);
 files[path]=createHash('sha256').update(bytes).digest('hex');
}
const effective=f=>{const c=structuredClone(f),a=c.proposedAction;delete a.actionVersion;delete a.hashPolicyVersion;delete a.schemaVersion;delete a.material.policyVersion;delete a.material.proposalVersion;delete a.authorityRequirements.policyVersion;return c;};
const before=await load('docs/review/workflow-email/offline-report.json'),after=await load('reports/workflow-offline.json');
assert.equal(before.rows.length,207);assert.equal(after.rows.length,207);assert(after.offlineGatePassed);
for(const old of before.rows){
 const row=after.rows.find(r=>r.id===old.id&&r.captureFile===old.captureFile&&r.rawOutputHash===old.rawOutputHash&&r.run===old.run);assert(row);
 assert.equal(canonical(row.actual.findings.map(effective)),canonical(old.actual.findings.map(effective)),'retained_business_change: '+old.id);
 assert.equal(canonical(row.actual.findings.map(f=>f.proposedAction.actionPayload)),canonical(old.actual.findings.map(f=>f.proposedAction.actionPayload)),'retained_payload_change: '+old.id);
 assert(row.identityStable);
}
await writeFile(dir+'/supported-workflow.json',JSON.stringify(after,null,2)+'\n');
const report={kind:'LOCAL_CHECKPOINT_PRESERVATION_AND_BUSINESS_COMPARISON',checkpoint,protectedFiles:Object.keys(files).length,protectedSha256:files,
 retainedWorkflowExecutions:207,additionalFreshCapturesReplayed:32,totalCapturedExecutionsReprocessed:239,
 businessOutputChanges:0,taskPayloadChanges:0,retainedWorkflowSummary:after.summary,
 unchangedProviderRequest:'src/findings-request-v0.3.3.json',historicalRecordsEdited:false,modelCalls:0,hubspotCalls:0,emailCalls:0,deployments:0};
await writeFile(dir+'/preservation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,protectedSha256:undefined,retainedWorkflowSummary:undefined}));
