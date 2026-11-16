// Setup: mkdir -p /tmp/ai-main-label-before; git archive 7cb4682 src | tar -x -C /tmp/ai-main-label-before; add package.json with type module in that directory.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {materializeCorrected as before} from '/tmp/ai-main-label-before/src/release/reasoning.js';
import {materializeCorrected as after} from '../../../../src/release/reasoning.js';
import {prepareHistory,canonical} from '../../../../src/findings.js';
import {GeneralFindingLedger} from '../../../../src/staging/general-ledger.js';
import {DatabaseSync} from 'node:sqlite';
import {hash} from '../../../../scripts/regression/findings-core.js';
const dir='docs/review/demo-closeout/synthetic-label-correction',load=async p=>JSON.parse(await readFile(p,'utf8')),fixture=await load('fixtures/hosted-synthetic-label-v1.json'),capture=await load(fixture.capturePath);
const raw={findings:capture.candidates.map(({finding:{findingId,proposedAction,...f}})=>f)},h=await prepareHistory(fixture.context);
const old=await before(raw,h,'synthetic:label-regression',fixture.evaluationTime),fresh=await after(raw,h,'synthetic:label-regression',fixture.evaluationTime);
const prior=await load('docs/review/demo-closeout/model-validation/fresh-model.json'),unchanged=[];
for(const r of prior.rows){const input=JSON.parse(r.rawModelOutput),history=await prepareHistory(r.sourceContext),a=await before(input,history,'synthetic:'+r.id,prior.evaluationTime),b=await after(input,history,'synthetic:'+r.id,prior.evaluationTime);
 const decision=x=>x.findings.map(f=>({key:f.opportunityKey,id:f.findingId,classification:f.classification,type:f.opportunityType,evidence:f.evidence,recommendation:f.recommendedNextAction,actionPayload:f.proposedAction.actionPayload,material:f.proposedAction.material,authority:f.proposedAction.authorityRequirements}));
 assert.equal(canonical(decision(a)),canonical(decision(b)),'retained_output_changed');unchanged.push({caseId:r.id,repeat:r.repeat,businessOutputAndPayloadUnchanged:true});}
const db=new DatabaseSync(':memory:'),adapter={exec:q=>db.exec(q),prepare:q=>db.prepare(q),transaction:fn=>fn()},l=new GeneralFindingLedger(adapter,{}),env={STAGING_PORTAL_ID:'synthetic',STAGING_CONTACT_ID:'synthetic'},ticket=l.beginEvaluation(env);const newHash=db.prepare('SELECT contract_hash FROM general_contexts WHERE context_key=?').get(ticket.key).contract_hash;db.close();
const identityDb=new DatabaseSync(':memory:'),identityAdapter={exec:q=>identityDb.exec(q),prepare:q=>identityDb.prepare(q),transaction:fn=>{identityDb.exec('BEGIN');try{const v=fn();identityDb.exec('COMMIT');return v;}catch(e){identityDb.exec('ROLLBACK');throw e;}}};
const identityLedger=new GeneralFindingLedger(identityAdapter,{}),identitiesBefore=identityLedger.reconcile('synthetic:label-identity',h,old.findings),identitiesAfter=identityLedger.reconcile('synthetic:label-identity',h,fresh.findings);
assert.deepEqual(identitiesAfter.map(i=>i.opportunityId),identitiesBefore.map(i=>i.opportunityId));
const identityProof={needs:3,idsBefore:identitiesBefore.map(i=>i.opportunityId),idsAfter:identitiesAfter.map(i=>i.opportunityId),additionalIdentities:identityDb.prepare('SELECT count(*) AS n FROM opportunities').get().n-3,taskOperations:identityDb.prepare('SELECT count(*) AS n FROM cert_operations').get().n};identityDb.close();
const comparison=fresh.findings.map(f=>{const prev=old.findings.find(x=>x.opportunityKey===f.opportunityKey);return {key:f.opportunityKey,oldQualityFailures:prev.proposedAction.qualityFailures,newQualityFailures:f.proposedAction.qualityFailures,oldActionVersion:prev.proposedAction.actionVersion,newActionVersion:f.proposedAction.actionVersion,outputHash:hash(f),priorHumanApprovalTransferred:false};});
const report={kind:'OFFLINE_CAPTURE_REPLAY_NOT_FRESH_INFERENCE',beforeCommit:'7cb4682be116dfb6e86ad097642f18422c6e3ef7',fixtureProvenance:fixture.provenance,beforeFailures:old.findings.flatMap(f=>f.proposedAction.qualityFailures).length,afterFailures:fresh.findings.flatMap(f=>f.proposedAction.qualityFailures).length,comparison,retainedLatestCaptures:unchanged,retainedBusinessRegressions:0,identityProof,approvalContractHash:{before:(await load('docs/review/demo-closeout/contracts.json')).approvalContractHash,after:newHash},revisedOutput:fresh,humanSemanticReview:'PENDING',finalExecutionApproval:false,hubspotCalls:0,modelCalls:0,emailProviderCalls:0,deployments:0};
await writeFile(dir+'/capture-replay.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({beforeFailures:report.beforeFailures,afterFailures:report.afterFailures,unchangedRetainedOutputs:unchanged.length,newApprovalContractHash:newHash}));
