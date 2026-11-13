// Assemble immutable human-review drafts from retained synthetic captures only.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {materializeCorrected,MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
import {INTERNAL_PROPOSAL_VERSION} from '../../src/staging/internal-task-policy.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
import {prepareHistory,canonical} from '../../src/findings.js';
import {hash} from '../regression/findings-core.js';
const dir='docs/review/current-v0.3.9',check=process.argv.includes('--check');
if(process.argv.slice(2).some(a=>a!=='--check'))throw Error('unsupported_review_argument');
if(MATERIALIZATION_VERSION!=='source-evidence-v0.3.9'||INTERNAL_PROPOSAL_VERSION!=='internal-task-proposal-v2.4')throw Error('new_contract_requires_new_review_packet_directory');
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const priorPath='docs/review/semantic-diagnostic-cycle/review-packet.json',replayPath='docs/review/workflow-email/offline-report.json';
const [prior,replay]=await Promise.all([load(priorPath),load(replayPath)]);
const cache=new Map(),items=[];
const ids=['ST03','ST04','ST07','ST08','EN11-lighting','EN11-pricing','EN12-recovery','EN12-pricing','EN31'];
const uncertainties={
 ST03:'Three garage outlets. Crew presence and job/additional-work status are unknown today. Pricing must precede added work. Immediate Review means internal verification, not work approval.',
 ST04:'Current issue status and current contact request are unknown. Preserve the invoice hold exactly. Historical today is not renewed; this task cannot call the customer or alter billing.',
 ST07:'Current interest/timing are unknown. The October 26 decision window is historical and must not become a new deadline or contact authority.',
 ST08:'Two pendant lights. Renovation completion and current consent remain unverified; this internal task satisfies neither condition.',
 'EN11-lighting':'Pendant lighting is independent of surge pricing. No quantity is supplied. Completion/current consent must be verified before any customer follow-up.',
 'EN11-pricing':'Prepare surge-protection pricing internally only. No quantity is supplied; no lighting, installation, scheduling or contact authority.',
 'EN12-recovery':'Verify current fixture/issue status internally. Do not assume the fault remains unresolved or treat EV pricing as recovery work.',
 'EN12-pricing':'EV charger pricing only, separate from recovery. Charger quantity/specification and any installation/contact authority are not established.',
 EN31:'Three garage outlets. Verify current job/additional-work status and preserve pricing first. The embedded approval/stage-change instruction remains rejected.'
};
const selections=[...prior.items.map((x,i)=>({...x,reviewId:ids[i]})),...prior.UV11.map((x,i)=>({...x,reviewId:'UV11-'+(i+1)}))];
for(const selected of selections){
 const candidates=replay.rows.filter(r=>r.id===selected.caseId&&r.captureFile===selected.providerCapture&&r.rawOutputHash===selected.rawOutputHash&&(selected.run===undefined||r.run===selected.run));
 assert(candidates.length,'review_capture_reference_missing');
 assert(candidates.every(r=>r.outputHash===candidates[0].outputHash&&r.sourceTime===candidates[0].sourceTime),'ambiguous_review_capture');
 const row=candidates[0],path=row.captureFile.startsWith('completion-correction/')?'docs/review/'+row.captureFile:'docs/release/evidence/'+row.captureFile;
 if(!cache.has(path))cache.set(path,await load(path));
 const captured=cache.get(path).rows.find(r=>r.id===selected.caseId&&r.rawModelOutput&&hash(JSON.parse(r.rawModelOutput))===row.rawOutputHash);
 assert(captured,'original_provider_output_missing');
 const raw=JSON.parse(captured.rawModelOutput),history=await prepareHistory(selected.sourceContext);
 const actual=await materializeCorrected(raw,history,'synthetic:'+selected.caseId,row.sourceTime);
 assert.equal(hash(actual),row.outputHash,'current_runtime_output_differs_from_checkpoint');
 const finding=actual.findings.find(f=>f.opportunityKey===selected.finding.opportunityKey);assert(finding);
 const inspection=inspectFinding(finding,history,actual.findings,row.sourceTime);
 assert.equal(inspection.qualityFailures.length,0,'unsafe_finding_requires_correction_not_review_pass');
 const uv11=selected.caseId==='UV11';
 items.push({reviewId:selected.reviewId,caseId:selected.caseId,sourceContext:selected.sourceContext,sourceContextHash:hash(selected.sourceContext),
  providerCapture:row.captureFile,providerCaptureFile:path,providerCaptureFileSha256:createHash('sha256').update(await readFile(path)).digest('hex'),run:row.run,
  rawOutputHash:row.rawOutputHash,sourceTime:row.sourceTime,rawLabels:raw.findings.map(f=>({opportunityKey:f.opportunityKey,classification:f.classification,opportunityType:f.opportunityType})),
  outputHash:hash(actual),finding,reviewItemHash:hash({caseId:selected.caseId,outputHash:hash(actual),finding}),previousReviewItemHash:selected.reviewItemHash,
  inspection,remainingUncertainty:uv11?'Renovation completion is documented on February 13, 2025; current interest/consent is unknown. Historical now is not renewed. User chose Cross-sell only. HIGH priority needs an explicit semantic decision, since HIGH will notify after email activation.':uncertainties[selected.reviewId],
  assistantSuggestedVerdict:uv11?'CONCERN — confirm HIGH priority for historical-interest verification; internal-only wording and documented completion are preserved.':'PASS for the bounded internal draft; subject to your review of evidence, priority and limits. This is assistant advice only.',
  humanVerdict:'PENDING',notes:'',finalExecutionApproval:false,releaseAcceptance:false});
}
const sourcePaths=['src/release/reasoning.js','src/staging/internal-task-policy.js','src/staging/review-policy.js','src/staging/scope-review.js','src/staging/completion-policy.js','src/findings-request-v0.3.3.json'];
const sourceHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const contracts=await load('docs/review/in-progress-scope/contracts.json');
const packet={kind:'CURRENT_EXACT_DRAFTS_PENDING_HUMAN_SEMANTIC_REVIEW',reviewPacketVersion:'current-semantic-review-v1',runtimeSourceCheckpoint:'d0c08d3412a4110e33f9a7378012b0aa6e7a53e1',
 materializer:MATERIALIZATION_VERSION,proposalVersion:INTERNAL_PROPOSAL_VERSION,taskPolicy:contracts.internalTaskPolicy,reviewPolicy:contracts.reviewPolicy,providerPrompt:contracts.providerPrompt,schema:contracts.schema,
 sourceHashes,priorPacket:priorPath,priorPacketHash:hash(prior),retainedReplay:replayPath,retainedReplayHash:hash(replay),
 modelCalls:0,hubspotCalls:0,emailCalls:0,deployments:0,clockExplanation:'Each draft uses its retained synthetic evaluation clock. This is offline current-code materialization, not fresh inference or fresh CRM evidence.',
 decisionBinding:'Future events bind packetHash + reviewId + reviewItemHash + outputHash, attributable user wording and recording time. Original decisions do not transfer.',
 freshModelValidation:'PENDING_EXHAUSTED_210_CALL_CAP',items};
const escape=s=>String(s).replaceAll('|','\\|').replaceAll('\n','<br>');
let md=`# Current human semantic review\n\n**All 14 entries are PENDING.** Nine revised findings and five retained UV11 variants are consolidated at materializer v0.3.9 / proposal v2.4. No original decision is transferred.\n\nThis review accepts or rejects the exact **internal draft**, including priority. It does not approve a final HubSpot payload, customer contact, installation, scheduling, billing, email activation or release. Internal verification means staff check current records; pricing preparation means staff prepare requested pricing for later review.\n\nAll final task due times are **NOT SET**; final contact association, correlation and exact-payload approval remain absent. All executions stay **BLOCKED**. HIGH and Immediate Review will trigger operator email only after separate email activation; HIGH is not a customer deadline or proof of a current emergency.\n\n## How to respond\n\nReply with each review ID, **PASS / FAIL / CONCERN**, and any notes. Example: \`ST03 — PASS — Internal verification only; retain three outlets and pricing before added work.\` For UV11, identify variants individually or explicitly state that your decision covers **UV11-1 through UV11-5**, including all five listed hashes. A CONCERN or FAIL will remain unresolved until corrected/reviewed. Assistant advice and tests are never human sign-off.\n\nPacket hash (SHA-256 of JSON.stringify(packet)): \`${hash(packet)}\`. [Machine-readable complete packet](review-packet.json).\n\n## Quick review\n\n| Item | Classification / internal purpose | Priority / routing | Remaining uncertainty / limits | Your verdict / notes |\n| --- | --- | --- | --- | --- |\n`;
for(const x of items){const a=x.finding.proposedAction;md+=`| [${x.reviewId}](#${x.reviewId.toLowerCase()}) | ${escape(x.finding.classification)} / ${a.actionPurpose} | ${a.actionPayload.properties.hs_task_priority}${a.material.reviewRouting?' / IMMEDIATE REVIEW':''} | ${escape(x.remainingUncertainty)} | **PENDING**; notes: ____ |\n`;}
md+='\n## UV11 policy and priority\n\nYour Cross-sell choice is applied to every variant. The provider originally used cross-sell for three captures and follow-up for two; those raw labels are retained below. All now recommend internal current-interest verification, retain documented February 13, 2025 completion and treat “now” as historical. **No variant is given customer-action authority.** Cross-sell currently defaults to HIGH. My suggested verdict is CONCERN until you decide whether HIGH is appropriate for this historical-interest verification and its eventual email alert. Do not infer a new deadline from that priority.\n';
for(const x of items){const f=x.finding,a=f.proposedAction;md+=`\n<a id="${x.reviewId.toLowerCase()}"></a>\n\n## ${x.reviewId} — ${f.opportunityKey}\n\n**Original full source context:**\n\n`;
 for(const n of x.sourceContext.serviceHistory)md+=`- **${n.timestamp}**: ${n.note}\n`;
 md+='\n**Finding-specific evidence actually used:**\n\n';for(const e of a.material.evidence)md+=`- **${e.timestamp}** (${e.noteId}): ${e.quote}\n`;
 md+=`\n**Exact internal recommendation:**\n\n> ${f.recommendedNextAction}\n\n**Classification / type / confidence:** ${f.classification} / ${f.opportunityType} / ${f.confidence}.\n\n**Internal purpose:** ${a.actionPurpose}. **Priority:** ${a.actionPayload.properties.hs_task_priority}.${a.material.reviewRouting?' **Routing:** IMMEDIATE REVIEW; current job status UNVERIFIED.':''}\n\n**Limits / uncertainty:** ${x.remainingUncertainty}\n\n**Assistant suggestion (not your verdict):** ${x.assistantSuggestedVerdict}\n\n**Retained provider capture:** [${x.providerCapture}](../../../${x.providerCaptureFile}), run ${x.run}. Synthetic evaluation clock: ${x.sourceTime}.\n\n**Output hash:** \`${x.outputHash}\`\n\n**Review item hash:** \`${x.reviewItemHash}\`\n\n**Action version:** \`${a.actionVersion}\`\n\n**Raw labels:** ${escape(canonical(x.rawLabels))}\n\n<details><summary>Exact task draft properties, restrictions, timing and gates</summary>\n\n\`\`\`json\n${JSON.stringify({taskProperties:a.actionPayload.properties,sourceRestrictions:a.material.sourceRestrictions,timing:a.material.sourceTimingConstraints,customerActionGates:a.material.customerActionGates,documentedCompletion:a.material.documentedCompletion||null,executionBlocked:a.executionBlocked},null,2)}\n\`\`\`\n\n</details>\n\n**Your verdict: PENDING. Notes: ____** Final execution approval: absent.\n`;}
const artifacts={'review-packet.json':JSON.stringify(packet,null,2)+'\n','REVIEW.md':md};
if(!check)await mkdir(dir,{recursive:true});
for(const [name,text]of Object.entries(artifacts)){
 let existing;try{existing=await readFile(dir+'/'+name,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing!==undefined&&existing!==text)throw Error('existing_review_packet_changed_create_new_version');
 if(check)assert.equal(existing,text,'review_packet_missing_or_stale');else if(existing===undefined)await writeFile(dir+'/'+name,text);
}
console.log(JSON.stringify({kind:'OFFLINE_REVIEW_PACKET_VERIFIED',entries:items.length,packetHash:hash(packet),materializer:MATERIALIZATION_VERSION,proposalVersion:INTERNAL_PROPOSAL_VERSION,allPending:items.every(i=>i.humanVerdict==='PENDING'),modelCalls:0,checkOnly:check}));
