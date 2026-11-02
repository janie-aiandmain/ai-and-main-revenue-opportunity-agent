// Pure correction policy. No storage, network, approval issuance or CRM execution.
import { canonical } from './findings.js';
export const CORRECTION_POLICY_VERSION = 'source-anchored-task-policy-v1';
export const TASK_CLASS = 'hubspot.follow_up_task.create';
const generic = new Set('a an the customer asks asked ask requests request requested wants wanted pricing price quote for to in on of and or is are was were can we us their this that it work additional'.split(' '));
export function sourceAnchors(history, evidence) {
  if (!Array.isArray(evidence) || !evidence.length) throw Error('Evidence required');
  return evidence.map(e => {
    const source = history.find(n => n.noteId === e.noteId);
    if (!source || typeof e.quote !== 'string' || !e.quote.trim()) throw Error('Unknown evidence source');
    const start = source.note.indexOf(e.quote);
    if (start < 0 || source.note.indexOf(e.quote, start + 1) >= 0) throw Error('Evidence occurrence missing or ambiguous');
    return { noteId: e.noteId, start, end: start + e.quote.length, sourceText: source.note, timestamp: source.timestamp };
  });
}
export function strongOverlap(a, b) {
  if (a.noteId !== b.noteId || a.sourceHash !== b.sourceHash) return false;
  const start = Math.max(a.start,b.start), end = Math.min(a.end,b.end);
  if (end - start < 16) return false;
  const terms = new Set(a.text.slice(start-a.start,end-a.start).toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 1 && !generic.has(w)) || []);
  return terms.size >= 2;
}
export function localDate(instant, timezone) {
  if (!timezone || !Number.isFinite(Date.parse(instant))) throw Error('Explicit clock and business timezone required');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant)).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function sourceDayEnd(day,timezone){
  const center=Date.parse(day+'T00:00:00.000Z');
  if(!Number.isFinite(center)||!timezone) throw Error('Resolved day/timezone required');
  let low=center-36*3600000,high=center+60*3600000;
  while(high-low>1){const mid=Math.floor((low+high)/2);if(localDate(new Date(mid).toISOString(),timezone)>day)high=mid;else low=mid;}
  return new Date(high-1).toISOString();
}
export function validateTiming(timing, history) {
  if (!timing || !['none','absolute','source_day','after_event','before_event'].includes(timing.kind)) throw Error('Explicit timing contract required');
  if (timing.kind === 'none') { if (Object.keys(timing).length !== 1) throw Error('Unexpected timing fields'); return; }
  if (timing.kind === 'absolute') {
    if (!Number.isFinite(Date.parse(timing.dueAt)) || !timing.basisRef) throw Error('Reviewed absolute deadline and basis required');
  } else if (timing.kind === 'source_day') {
    const note = history.find(n=>n.noteId===timing.noteId);
    if (!note) throw Error('Source-relative note missing');
    if(timing.timezone==null&&timing.day==null) return; // unresolved proposals cannot be approved/executed
    if (timing.day !== localDate(note.timestamp,timing.timezone)) throw Error('Source-relative date must use source day, not processing day');
  } else if (!timing.eventRef || !timing.sourceNoteId || !history.some(n=>n.noteId===timing.sourceNoteId)) throw Error('Source event reference required');
}
export function timingExecutable(timing, now) {
  if (!Number.isFinite(Date.parse(now))) throw Error('Clock required');
  if (timing.kind==='absolute' && Date.parse(now)>Date.parse(timing.dueAt)) throw Error('Deadline expired: renewed human decision required');
  if (timing.kind==='source_day' && localDate(now,timing.timezone)!==timing.day) throw Error('Source-day deadline is not current');
  if (timing.kind==='after_event' && !timing.completionEvidenceRef) throw Error('Deferred event is not confirmed');
  if (timing.kind==='before_event' && timing.eventAlreadyOccurred!==false) throw Error('Before-event constraint unresolved or elapsed');
}
const intents = {
  prepare_quote:'Review the customer request and prepare pricing for human follow-up.',
  scope_change_estimate:'Review the requested scope change and obtain pricing before added work.',
  deferred_follow_up:'Review follow-up only after the documented triggering event.',
  service_recovery:'Review the service issue and arrange human service-recovery follow-up.',
};
function jsonValue(value){
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)) return;
  if(Array.isArray(value)){value.forEach(jsonValue);return;}
  if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){Object.values(value).forEach(jsonValue);return;}
  throw Error('Canonical action data must be lossless JSON');
}
export function reviewedProjection(spec, history) {
  jsonValue(spec);
  if(spec.constraints!==undefined&&(!Array.isArray(spec.constraints)||spec.constraints.some(x=>typeof x!=='string'))) throw Error('Constraint list required');
  if (!spec || !Object.hasOwn(intents,spec.intent) || !spec.scope || typeof spec.scope!=='object' || Array.isArray(spec.scope) || !Object.keys(spec.scope).length) throw Error('Reviewed bounded intent/scope required');
  if (!['strong cross-sell opportunity','follow-up revenue opportunity','scope-change opportunity','retention or service-recovery opportunity'].includes(spec.classification)) throw Error('Actionable classification required');
  if (!['cross-sell','upsell','scope change','follow-up','retention'].includes(spec.opportunityType)) throw Error('Actionable type required');
  if (!['HIGH','MEDIUM','LOW'].includes(spec.priority) || !spec.targetContext || spec.actionClass!==TASK_CLASS || spec.humanApprovalRequired!==true) throw Error('Task-only authority required');
  const anchors=sourceAnchors(history,spec.evidence);
  validateTiming(spec.timing,history);
  if (spec.timing.completionEvidenceRef && !history.some(n=>n.noteId===spec.timing.completionEvidenceRef)) throw Error('Completion evidence missing');
  const usedNotes=[...new Set(anchors.map(a=>a.noteId))].map(id=>history.find(n=>n.noteId===id));
  for(const n of usedNotes){
    if(/\btoday\b/i.test(n.note) && !(spec.timing.kind==='source_day'&&spec.timing.noteId===n.noteId) && !(spec.timing.kind==='absolute'&&spec.timing.overrideRef)) throw Error('Source-relative deadline must be resolved or explicitly overridden');
    if(/after.*renovation.*complete/i.test(n.note) && spec.timing.kind!=='after_event') throw Error('Deferred completion event must be retained');
    if(/before (?:work continues|proceeding)/i.test(n.note) && spec.timing.kind!=='before_event') throw Error('Before-work constraint must be retained');
    if(/(?:do not send|no further|hold).*invoic/i.test(n.note) && !spec.evidence.some(e=>e.noteId===n.noteId&&/invoic/i.test(e.quote))) throw Error('Billing qualifier evidence is incomplete');
  }
  const customerDecisionWindow=spec.customerDecisionWindow??null;
  const windowSource=usedNotes.find(n=>/\bthis week\b/i.test(n.note));
  if(windowSource){
    if(!customerDecisionWindow||customerDecisionWindow.noteId!==windowSource.noteId||!['unresolved','reviewed'].includes(customerDecisionWindow.status)) throw Error('Customer decision window must be explicit, not an invented task deadline');
    if(customerDecisionWindow.status==='reviewed'&&(!customerDecisionWindow.reviewRef||!Number.isFinite(Date.parse(customerDecisionWindow.validThrough)))) throw Error('Reviewed decision window requires a dated human basis');
  }else if(customerDecisionWindow) throw Error('Decision window lacks source support');
  const evidence=anchors.map(a=>({noteId:a.noteId,timestamp:a.timestamp,quote:a.sourceText.slice(a.start,a.end)})).sort((a,b)=>canonical(a).localeCompare(canonical(b)));
  const constraints=[...new Set(spec.constraints||[])].sort();
  const material={policyVersion:CORRECTION_POLICY_VERSION,actionClass:TASK_CLASS,targetContext:spec.targetContext,classification:spec.classification,opportunityType:spec.opportunityType,intent:spec.intent,scope:spec.scope,priority:spec.priority,evidence,timing:spec.timing,customerDecisionWindow,constraints,humanApprovalRequired:true};
  const payload={type:TASK_CLASS,target:{contextKey:spec.targetContext},properties:{hs_task_subject:'Human follow-up: '+spec.intent.replaceAll('_',' '),hs_task_body:[intents[spec.intent],'Scope: '+canonical(spec.scope),'Timing: '+canonical(spec.timing),'Customer decision horizon: '+canonical(customerDecisionWindow),'Customer constraints: '+constraints.join('; '),'Evidence: '+evidence.map(e=>e.quote).join('\n'),'Agent authority: follow-up task creation only. No customer communication, billing, contact, deal or pipeline mutation.'].join('\n'),hs_task_priority:spec.priority,hs_task_status:'NOT_STARTED',hs_task_type:'TODO',...(spec.timing.kind==='absolute'?{hs_timestamp:new Date(spec.timing.dueAt).toISOString()}:spec.timing.kind==='source_day'&&spec.timing.day&&spec.timing.timezone?{hs_timestamp:sourceDayEnd(spec.timing.day,spec.timing.timezone)}:{})}};
  return {material,payload};
}
export function materialExecutable(material,now){
  timingExecutable(material.timing,now);
  if(material.evidence.some(e=>Date.parse(e.timestamp)>Date.parse(now))) throw Error('Future-dated evidence requires review');
  const window=material.customerDecisionWindow;
  if(window&&(window.status!=='reviewed'||!window.reviewRef||Date.parse(now)>Date.parse(window.validThrough))) throw Error('Customer decision window unresolved or expired; refresh intent');
}
export { canonical };
