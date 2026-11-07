// Task preparation only. Internal verification does not satisfy customer-action gates.
import {sourceAnchors,TASK_CLASS} from '../correction-policy.js';
import {canonical} from '../findings.js';
import {createHash} from 'node:crypto';
export const INTERNAL_TASK_POLICY='internal-task-policy-v1.2';
export const INTERNAL_PROPOSAL_VERSION='internal-task-proposal-v2.2';
const digest=v=>'sha256:'+createHash('sha256').update(canonical(v)).digest('hex');
const relative=/\b(?:today|tomorrow|this week|by (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|end of (?:the )?day)\b/ig;
const before=/\bbefore\b.{0,60}\b(?:work|continu|proceed|start|install)/i;
const deferred=/\b(?:after|once|when|until)\b.{0,100}\b(?:complete|finished|done|renovation|remodel|permit|approval|parts)/i;
export function explicitSourceDates(text){
 return [...text.matchAll(/\b(?:by|before|after|until|on|deadline|no later than)\b[^.!?\n]{0,80}?\b(20\d{2}-\d{2}-\d{2})\b/ig)].map(m=>({wording:m[0],date:m[1]}));
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function internalPlan(finding,history,inspection,now){
 const evidence=sourceAnchors(history,finding.evidence).map(a=>({noteId:a.noteId,timestamp:a.timestamp,quote:a.sourceText.slice(a.start,a.end)}));
 const text=evidence.map(e=>e.quote).join('\n'),hasTiming=evidence.some(e=>new RegExp(relative.source,'i').test(e.quote)||explicitSourceDates(e.quote).length>0);
 const preparation=['strong cross-sell opportunity','follow-up revenue opportunity'].includes(finding.classification)&&/\b(?:pric\w*|quot\w*|estimate|cost)\b/i.test(text)&&!inspection.executionBlocks.length&&!hasTiming&&!deferred.test(text)&&!before.test(text);
 const actionPurpose=preparation?'internal_preparation':'internal_verification';
 let instruction=preparation?'Internally prepare the requested pricing only, for human review. Do not contact the customer or add service steps.':'Internally verify the current request and relevant records. Do not contact the customer or authorize work.';
 if(before.test(text))instruction='Internally verify the current job status and whether additional work has already started. Preserve pricing before additional work. Do not authorize work, scheduling or customer contact.';
 else if(deferred.test(text))instruction='Internally verify documented event completion and current consent. Customer follow-up remains conditional on both; if evidence is missing, leave it blocked. No customer contact or scheduling.';
 else if(finding.opportunityType==='retention')instruction='Internally verify the current status of the reported service issue and current customer request. Do not assume the complaint remains unresolved. No customer contact or billing action.';
 else if(hasTiming)instruction='Internally verify current interest and timing using current records. The source decision window or relative request is historical or unresolved and is not renewed. No customer contact.';
 const sourceTiming=evidence.flatMap(e=>[...e.quote.matchAll(new RegExp(relative.source,'ig'))].map(m=>({noteId:e.noteId,sourceTimestamp:e.timestamp,wording:m[0],status:e.timestamp.slice(0,10)<now.slice(0,10)?'HISTORICAL_NOT_RENEWED':'SOURCE_RELATIVE_UNRESOLVED',customerTimezone:'UNKNOWN',taskDeadline:false})));
 for(const e of evidence)for(const date of explicitSourceDates(e.quote))sourceTiming.push({noteId:e.noteId,sourceTimestamp:e.timestamp,wording:date.wording,date:date.date,status:date.date<now.slice(0,10)?'HISTORICAL_ABSOLUTE_DATE_NOT_RENEWED':'ABSOLUTE_SOURCE_DATE_REQUIRES_REVIEW',customerTimezone:'UNKNOWN',taskDeadline:false});
 const gates=inspection.executionBlocks.map(b=>({...b,appliesTo:'customer_action',satisfiedByInternalVerification:false}));
 const restrictions=evidence.filter(e=>/\b(?:do not|don.t|never|no|must not|unless|until|before|after|once|when|only|without)\b/i.test(e.quote));
 return {actionPurpose,instruction,evidence,sourceTiming,customerActionGates:gates,sourceRestrictions:restrictions,customerActionPermitted:false};
}
export function internalProjection(finding,history,inspection,{priority,taskDueAt},contextKey,now,requestedPurpose){
 const plan=internalPlan(finding,history,inspection,now);
 if(!['HIGH','MEDIUM','LOW'].includes(priority))throw Error('internal_task_priority_required');
 if(!['internal_verification','internal_preparation'].includes(requestedPurpose))throw Error('explicit_internal_purpose_required');
 if(requestedPurpose==='internal_preparation'&&plan.actionPurpose!=='internal_preparation')throw Error('internal_verification_required_before_preparation');
 if(!Number.isFinite(Date.parse(now))||plan.evidence.some(e=>!Number.isFinite(Date.parse(e.timestamp))||Date.parse(e.timestamp)>Date.parse(now)))throw Error('invalid_or_future_source_evidence');
 const instruction=requestedPurpose===plan.actionPurpose?plan.instruction:'Internally verify the current pricing request and its scope. No customer contact or additional service steps.';
 const material={policyVersion:INTERNAL_TASK_POLICY,proposalVersion:INTERNAL_PROPOSAL_VERSION,actionClass:TASK_CLASS,targetContext:contextKey,classification:finding.classification,opportunityType:finding.opportunityType,intent:requestedPurpose==='internal_verification'?'verify_current_state':'prepare_quote',actionPurpose:requestedPurpose,scope:{sourceRequests:plan.evidence.map(e=>e.quote)},priority,evidence:plan.evidence,timing:{kind:'none'},operatorTaskDueAt:taskDueAt??null,sourceTimingConstraints:plan.sourceTiming,customerActionGates:plan.customerActionGates,sourceRestrictions:plan.sourceRestrictions,customerActionPermitted:false,humanApprovalRequired:true};
 const body=[instruction,'Action purpose: '+requestedPurpose+'. This task is internal only; it grants no customer action.','Source evidence (verbatim text, with original UTC timestamps):',...plan.evidence.map(e=>'['+e.timestamp+'; '+e.noteId+'] '+e.quote),'Source-relative timing: '+canonical(plan.sourceTiming),'Customer-action gates (not satisfied by this task): '+canonical(plan.customerActionGates),'Exact source restrictions: '+plan.sourceRestrictions.map(e=>e.quote).join('\n'),'Internal task due: '+(taskDueAt||'NOT SET — final task approval blocked')+'. Operator-selected task timing does not renew a customer deadline.','Authority: separately approved HubSpot follow-up task creation only. No customer communications, billing, work, appointment, contact, note, deal or pipeline changes.'].join('\n');
 const payload={type:TASK_CLASS,target:{contextKey},properties:{hs_task_subject:(requestedPurpose==='internal_verification'?'Internal verification: ':'Internal pricing preparation: ')+finding.opportunityKey.replaceAll('-',' '),hs_task_body:escape(body),hs_task_priority:priority,hs_task_status:'NOT_STARTED',hs_task_type:'TODO',...(taskDueAt?{hs_timestamp:new Date(taskDueAt).toISOString()}:{})}};
 return {material,payload};
}
export function internalProposal(finding,history,inspection,contextKey,now){
 const purpose=internalPlan(finding,history,inspection,now).actionPurpose;
 const priority=['strong cross-sell opportunity','retention or service-recovery opportunity'].includes(finding.classification)?'HIGH':'MEDIUM';
 const projection=internalProjection(finding,history,inspection,{priority},contextKey,now,purpose);
 const authorityRequirements={policyVersion:INTERNAL_TASK_POLICY,humanApprovalRequired:true,allowedMutation:TASK_CLASS,customerActionPermitted:false};
 const {proposedAction,...raw}=finding;
 return {schemaVersion:INTERNAL_PROPOSAL_VERSION,actionPurpose:purpose,actionPayload:projection.payload,material:projection.material,authorityRequirements,qualityFailures:inspection.qualityFailures,preparationBlocked:inspection.qualityFailures.length>0,executionBlocked:true,missingFinalFields:['operatorTaskDueAt','CRM association','operation correlation','exact final-payload approval'],actionVersion:digest({proposalVersion:INTERNAL_PROPOSAL_VERSION,finding:raw,...projection,authorityRequirements})};
}
