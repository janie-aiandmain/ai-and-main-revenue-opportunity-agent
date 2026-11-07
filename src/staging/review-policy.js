// Conservative, versioned checks. These do not replace human semantic review.
import { sourceAnchors,reviewedProjection,materialExecutable,TASK_CLASS,sourceDayEnd } from '../correction-policy-v2.js';
import {internalProjection,explicitSourceDates} from './internal-task-policy.js';
export const REVIEW_POLICY='finding-review-v2.6';
const restriction=/\b(?:do not|don't|must not|never|no|hold|pause|stop|only|unless|without|until|before|after|once|when)\b/i;
const relative=/\b(?:today|tomorrow|this week|by (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|end of (?:the )?day)\b/i;
const deferred=/\b(?:after|once|when|until)\b.{0,100}\b(?:complete|finished|done|ends?|renovation|remodel|permit|approval|parts)\b/i;
const beforeWork=/\bbefore\b.{0,50}\b(?:work|proceed|start|continu|install)/i;
const step=/\b(?:schedul\w*|book\w*|assessment|inspection|consultation|appointment|site visit)\b/i;
const sourceStep=/\b(?:customer|client|homeowner)\b.{0,70}\b(?:asks?|requests?|wants?)\b.{0,70}\b(?:schedul\w*|book\w*|assessment|inspection|consultation|appointment|site visit)\b/i;
const sentences=text=>text.match(/[^.!?]+[.!?]?/g)?.map(s=>s.trim()).filter(Boolean)||[];
export function inspectFinding(finding,history,otherFindings=[],now=new Date().toISOString()){
  sourceAnchors(history,finding.evidence);
  const qualityFailures=[],executionBlocks=[],quotes=finding.evidence.map(e=>e.quote).join('\n');
  const used=history.filter(n=>finding.evidence.some(e=>e.noteId===n.noteId));
  for(const originalNote of used){
    const belongs=(clause,f)=>f.evidence.some(e=>e.noteId===originalNote.noteId&&(clause.includes(e.quote)||e.quote.includes(clause)));
    const relevant=sentences(originalNote.note).filter(clause=>belongs(clause,finding)||!otherFindings.some(f=>f!==finding&&belongs(clause,f)));
    const n={...originalNote,note:relevant.join(' ')};
    for(const clause of sentences(n.note).filter(s=>restriction.test(s))){
      const fragment=clause.slice(clause.search(restriction)).replace(/[.!?]$/,'');
      const belongsElsewhere=otherFindings.filter(f=>f!==finding).some(f=>f.evidence.some(e=>e.noteId===n.noteId&&e.quote.includes(fragment)));
      if(!belongsElsewhere&&!quotes.includes(fragment))qualityFailures.push({code:'restriction_evidence_incomplete',noteId:n.noteId,quote:clause});
      if(/\buntil\b.*\bresolv/i.test(clause)&&/\buntil\b[^.;]*\breview/i.test(finding.recommendedNextAction)&&!/\buntil\b[^.;]*\bresolv/i.test(finding.recommendedNextAction))qualityFailures.push({code:'restriction_condition_weakened',noteId:n.noteId});
    }
    if(relative.test(n.note)&&n.timestamp.slice(0,10)!==now.slice(0,10)){
      executionBlocks.push({code:'historical_or_unresolved_deadline',noteId:n.noteId});
      if(relative.test(finding.recommendedNextAction)&&!(finding.recommendedNextAction.includes(n.timestamp.slice(0,10))&&/historical|not renewed|not renew|original (?:window|request)/i.test(finding.recommendedNextAction)))qualityFailures.push({code:'historical_deadline_repeated_in_action',noteId:n.noteId});
    }
    for(const date of explicitSourceDates(n.note)){
      executionBlocks.push({code:'absolute_source_date_requires_review',noteId:n.noteId,sourceDate:date.date,sourceWording:date.wording});
      if(!quotes.includes(date.wording))qualityFailures.push({code:'absolute_deadline_evidence_incomplete',noteId:n.noteId});
    }
    if(deferred.test(n.note))executionBlocks.push({code:'deferred_event_requires_source_confirmation',noteId:n.noteId});
    if(beforeWork.test(n.note))executionBlocks.push({code:'before_work_state_requires_source_confirmation',noteId:n.noteId});
  }
  const assertedAction=finding.recommendedNextAction.replace(/\b(?:do not|don't|must not|shall not|should not|never|no)\b[^.;]+/gi,'');
  if(finding.opportunityType==='retention'&&/\b(?:still|currently|remains?)\b.{0,40}\bunresolved\b|\bunresolved (?:fixture|complaint|issue)\b/i.test(assertedAction)&&!/verify (?:whether|if).{0,100}unresolved/i.test(finding.recommendedNextAction))qualityFailures.push({code:'unverified_current_unresolved_state'});
  const positiveAction=finding.recommendedNextAction.replace(/\b(?:do not|don't|must not|shall not|should not|never|no)\b[^.;]+/gi,'');
  if(/(?:^|[.!?;:]\s*|\b(?:and|then)\s+)(?:contact|call|email|bill|invoice|charge|perform)\b|\b(?:contact|call|email|bill|invoice|charge|perform)\s+(?:(?:the|a|this|our)\s+)?(?:customer|client|homeowner|work|service|account|them)\b|\bwith (?:the )?customer\b|\b(?:change|update|move)\b.{0,30}\b(?:deal|stage|pipeline)\b/i.test(positiveAction))qualityFailures.push({code:'customer_or_crm_authority_not_internal'});
  if(step.test(positiveAction)&&!sourceStep.test(quotes))qualityFailures.push({code:'unrequested_scheduling_or_assessment'});
  return {policyVersion:REVIEW_POLICY,qualityFailures,executionBlocks,humanReview:'PENDING'};
}
export function generalProjection(finding,history,spec,contextKey,now=new Date().toISOString(),allFindings=[]){
  const allowed=['intent','priority','timing','taskDueAt','evidence','constraints','attestations','actionPurpose'];
  if(!spec||Object.keys(spec).some(k=>!allowed.includes(k)))throw Error('unsupported_review_fields');
  if(!spec.attestations||['sourceRead','evidenceComplete','scopeBounded','timingVerified'].some(k=>spec.attestations[k]!==true))throw Error('complete_operator_review_required');
  if(spec.evidence!==undefined)throw Error('correct_finding_evidence_via_fresh_evaluation');
  if(spec.constraints!==undefined)throw Error('constraints_must_come_from_source');
  const inspection=inspectFinding(finding,history,allFindings,now);
  if(inspection.qualityFailures.length)throw Error('candidate_quality_blocked');
  const used=history.filter(n=>finding.evidence.some(e=>e.noteId===n.noteId));
  if(typeof spec.taskDueAt!=='string'||!/[T].*(?:Z|[+-]\d{2}:\d{2})$/.test(spec.taskDueAt)||!Number.isFinite(Date.parse(spec.taskDueAt))||Date.parse(spec.taskDueAt)<=Date.parse(now))throw Error('explicit_future_task_due_timestamp_required');
  if(spec.actionPurpose!==undefined){
    if(!['internal_verification','internal_preparation'].includes(spec.actionPurpose))throw Error('customer_action_not_authorized_by_internal_task');
    if(spec.intent!==(spec.actionPurpose==='internal_verification'?'verify_current_state':'prepare_quote'))throw Error('internal_purpose_intent_mismatch');
    if(!spec.timing||Object.keys(spec.timing).length!==1||spec.timing.kind!=='internal_task')throw Error('internal_task_timing_must_not_override_customer_gate');
    const projection=internalProjection(finding,history,inspection,{priority:spec.priority,taskDueAt:new Date(spec.taskDueAt).toISOString()},contextKey,now,spec.actionPurpose);
    materialExecutable(projection.material,now);
    return {...projection,material:{...projection.material,reviewPolicy:REVIEW_POLICY}};
  }
  const timing=spec.timing;
  if(!timing||timing.overrideRef)throw Error('source_timing_required_no_silent_override');
  for(const n of used){
    if(relative.test(n.note)&&n.timestamp.slice(0,10)!==now.slice(0,10))throw Error('historical_deadline_requires_new_source_intent');
    if(relative.test(n.note)&&!(timing.kind==='source_day'&&timing.noteId===n.noteId&&/\btoday\b/i.test(n.note)))throw Error('relative_deadline_requires_source_day_or_new_dated_source');
    if(/\b(?:by|before|deadline|no later than)\b/i.test(n.note)&&[...n.note.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].some(m=>m[1]<now.slice(0,10)))throw Error('historical_absolute_deadline_requires_new_source_intent');
    if(explicitSourceDates(n.note).length)throw Error('absolute_source_date_requires_internal_verification');
    if(deferred.test(n.note)){
      if(timing.kind!=='after_event'||timing.sourceNoteId!==n.noteId||!timing.completionEvidenceRef)throw Error('deferred_event_unverified');
      const completion=history.find(s=>s.noteId===timing.completionEvidenceRef);
      if(!completion||Date.parse(completion.timestamp)<Date.parse(n.timestamp)||!/(?:customer|client|homeowner).*(?:confirms?|reports?).*(?:complete|finished|done)/i.test(completion.note))throw Error('source_completion_evidence_required');
    }
    if(beforeWork.test(n.note)&&!(timing.kind==='before_event'&&timing.sourceNoteId===n.noteId&&timing.eventAlreadyOccurred===false))throw Error('before_work_state_unverified');
    if(beforeWork.test(n.note)){const state=history.find(s=>s.noteId===timing.currentStateEvidenceRef);if(!state||state.timestamp.slice(0,10)!==now.slice(0,10)||!/(?:not|has not).{0,20}(?:started|continued|proceeded)/i.test(state.note))throw Error('current_before_work_source_evidence_required');}
  }
  if(timing.kind==='absolute'&&Date.parse(spec.taskDueAt)>Date.parse(timing.dueAt))throw Error('task_due_after_customer_deadline');
  if(timing.kind==='source_day'&&timing.day&&timing.timezone&&Date.parse(spec.taskDueAt)>Date.parse(sourceDayEnd(timing.day,timing.timezone)))throw Error('task_due_after_source_day');
  const intents={'strong cross-sell opportunity':['prepare_quote'],'follow-up revenue opportunity':['deferred_follow_up','prepare_quote'],'scope-change opportunity':['scope_change_estimate'],'retention or service-recovery opportunity':['service_recovery']};
  if(!intents[finding.classification]?.includes(spec.intent))throw Error('review_intent_conflicts_with_finding');
  // Completeness was checked against full source above; projection is finding-local.
  const scoped=history.map(n=>({...n,note:finding.evidence.filter(e=>e.noteId===n.noteId).map(e=>e.quote).join(' ')}));
  const projection=reviewedProjection({actionClass:TASK_CLASS,targetContext:contextKey,classification:finding.classification,opportunityType:finding.opportunityType,intent:spec.intent,scope:{sourceRequests:finding.evidence.map(e=>e.quote)},priority:spec.priority,timing,evidence:finding.evidence,constraints:[],humanApprovalRequired:true},scoped);
  projection.payload.properties.hs_timestamp=new Date(spec.taskDueAt).toISOString();
  projection.payload.properties.hs_task_body=projection.payload.properties.hs_task_body.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  projection.material.operatorTaskDueAt=new Date(spec.taskDueAt).toISOString();
  materialExecutable(projection.material,now);
  return {...projection,material:{...projection.material,reviewPolicy:REVIEW_POLICY}};
}
