// Operator attention only. A source-reported job state never grants work authority.
export const SCOPE_REVIEW_POLICY='in-progress-scope-review-v1';
const active=/\b(?:crew|team|technicians?)\b.{0,40}\bon[ -]?site\b|\b(?:active|current|ongoing|in[ -]progress)\s+(?:job|work|project)\b|\b(?:work|job|project)\b.{0,25}\b(?:underway|in progress|already started)\b|\bbefore\s+(?:the\s+)?work\s+continues\b/i;
const inactive=/\b(?:not|no longer|never)\b.{0,25}\b(?:on[ -]?site|in progress|active|underway|started)\b|\b(?:job|work|project)\b.{0,30}\b(?:completed|cancelled|canceled|finished|closed)\b|\b(?:crew|team)\b.{0,25}\b(?:left|departed)\b/i;
const intent=/\b(?:customer|client|homeowner)\s+(?:(?:still|now|also)\s+)?(?:asks?|asked|requests?|requested|wants?|wanted)\b/i;
const noIntent=/\b(?:customer|client|homeowner)\b.{0,60}\b(?:did not|does not|has not|never|no longer)\b.{0,30}\b(?:ask|request|want)\w*|\bno (?:customer )?request\b/i;
const instruction=/\b(?:ignore (?:previous|all)|system\s*:|mark (?:this )?approved|change (?:the )?deal stage)\b/i;
export function scopeReviewRouting(finding,evidence,history,now){
 if(finding.classification!=='scope-change opportunity'||finding.opportunityType!=='scope change')return null;
 const facts=evidence.filter(e=>active.test(e.quote)&&intent.test(e.quote)&&!noIntent.test(e.quote)&&!inactive.test(e.quote)&&!instruction.test(e.quote)&&Number.isFinite(Date.parse(e.timestamp))&&Date.parse(e.timestamp)<=Date.parse(now));
 if(!facts.length)return null;
 // Do not revive an old active-job cue after a newer source reports closure.
 const latest=Math.max(...facts.map(e=>Date.parse(e.timestamp)));
 if(history.some(n=>Date.parse(n.timestamp)>latest&&inactive.test(n.note)))return null;
 return {policyVersion:SCOPE_REVIEW_POLICY,queue:'immediate_review',label:'Immediate review: in-progress scope request',priority:'HIGH',contextTag:facts.some(e=>/\b(?:crew|team|technicians?)\b.{0,40}\bon[ -]?site\b/i.test(e.quote))?'team_onsite':'in_progress_work',sourceFacts:facts.map(e=>({noteId:e.noteId,sourceTimestamp:e.timestamp,quote:e.quote})),currentJobStatus:'UNVERIFIED',customerActionPermitted:false};
}
