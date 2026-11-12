// A narrow source rule, not inferred event completion or current customer consent.
import {sourceAnchors} from '../correction-policy.js';
export const COMPLETION_POLICY='documented-renovation-completion-v1';
const deferral=/\b(?:after|once|when|until)\b.{0,100}\b(?:complete|finished|done|renovation|remodel)\b/i;
const confirmed=/^\s*(?:customer|client|homeowner)\s+(?:confirms?|reports?)\s+(?:the|their)\s+(renovation|remodel)\s+(?:is|was|has been)\s+(?:complete|completed|finished|done)\s+and\s+(?:asks?|requests?)\s+(?:for\s+)?([^.!?]+)[.!?]?\s*$/i;
const excluded=/\b(?:not|never|no|cancel\w*|declin\w*|pending|might|maybe|possibly|if|unless)\b/i;
const stop=new Set('a an the customer client homeowner asks asked requests requested wanted wants still for pricing price quote estimate cost follow up after once when until renovation remodel is was complete completed finished done installation installed install'.split(' '));
const terms=text=>(text.toLowerCase().match(/[a-z]+/g)||[]).map(t=>t==='lights'?'light':t).filter(t=>!stop.has(t));
export function documentedCompletion(finding,history,now){
 if(!['strong cross-sell opportunity','follow-up revenue opportunity'].includes(finding.classification)||!Number.isFinite(Date.parse(now)))return null;
 const evidence=sourceAnchors(history,finding.evidence).map(a=>({noteId:a.noteId,sourceTimestamp:a.timestamp,quote:a.sourceText.slice(a.start,a.end)}));
 const confirmations=evidence.map(e=>({e,match:e.quote.match(confirmed)})).filter(({e,match})=>match&&/\b(?:pricing|price|quote|estimate|cost)\b/i.test(match[2])&&!excluded.test(e.quote));
 // Multiple confirmations or an unrecognized/newer event statement require review.
 if(confirmations.length!==1)return null;
 const {e,match}=confirmations[0],at=Date.parse(e.sourceTimestamp);
 if(!Number.isFinite(at)||at>Date.parse(now))return null;
 if(history.some(n=>Date.parse(n.timestamp)>at&&/\b(?:renovation|remodel|cancel\w*|declin\w*|no longer)\b/i.test(n.note)))return null;
 const requestTerms=new Set(terms(match[2]).filter(t=>t!=='now'));
 const deferred=evidence.filter(x=>deferral.test(x.quote));
 const resolved=[];
 for(const old of deferred){
  const serviceTerms=terms(old.quote.split(/\b(?:after|once|when|until)\b/i)[0]);
  if(Date.parse(old.sourceTimestamp)>=at||!serviceTerms.length||!serviceTerms.every(t=>requestTerms.has(t)))return null;
  resolved.push(old.noteId);
 }
 return {policyVersion:COMPLETION_POLICY,event:match[1].toLowerCase(),status:'DOCUMENTED_AT_SOURCE_NOT_CURRENT_CONSENT',...e,resolvedDeferralNoteIds:[...new Set(resolved)]};
}
