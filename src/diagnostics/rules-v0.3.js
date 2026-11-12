// Read-only, single-summary diagnostic. Never an executable finding or approval.
export const DIAGNOSTIC_POLICY='deterministic diagnostic rules v0.3';
const clean=value=>String(value||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').trim();
const ignored=new Set(('a an the customer client homeowner they their them us we our it this that is are was were has have had now still also explicitly said says say reports report confirms confirm requests request requested asks ask asked wants want wanted pricing price quote quotes cost estimate estimates for of to and or in on at with by from no not need needs needed longer any more further additional work follow up before after until once when during current active job already completed complete installed install installing interested interest does did do been being another other provider contractor company').split(' '));
for(const word of ['decline','declined','but','then','else','anything','expressed','express','statement','discussion','discussed'])ignored.add(word);
const terms=text=>new Set((text.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>!ignored.has(w)).map(w=>w==='lighting'||w==='lights'?'light':w.endsWith('s')?w.slice(0,-1):w).filter(w=>!ignored.has(w)&&w.length>1));
const overlap=(a,b)=>[...a].some(t=>b.has(t));
const related=(a,b)=>!a.size||!b.size||[...a].every(t=>b.has(t))||[...b].every(t=>a.has(t));
const deny=/\b(?:declin\w*|not interested|(?:does|did|do) not (?:want|need|ask|request)|no longer (?:want|need)|no (?:additional|further|more) (?:work|quote|follow.up)|no follow.up|no request|nothing else|(?:issue|problem) (?:is )?resolved|everything (?:works|is working well))\b/i;
const fulfilled=/\b(?:another|other)\s+(?:provider|contractor|company)\b.{0,50}\bcompleted\b|\bcompleted\b.{0,30}\b(?:another|other)\s+(?:provider|contractor|company)\b/i;
const instruction=/^(?:internal (?:note )?text|system(?: admin)?(?: override)?|ignore\b|return\b|mark\b|change\b)/i;
const actor=/^(?:(?:separately|actual)\s*[, :]\s*|actual\s+)?(?:the\s+)?(?:customer|client|homeowner)\b\s*/i;
const request=/^(?:(?:now|still|also|explicitly)\s+)*(?:(?:says?|said|reports?|confirms?)\s+(?:that\s+)?(?:they\s+)?)?(?:asks?|asked|requests?|requested|wants?|wanted)\b/i;
const thirdParty=/\b(?:neighbor|neighbour|friend|brother|sister|referral|third.party)\b/i;
const scope=/\bbefore\b.{0,55}\b(?:work|continu|proceed|start|install)|\b(?:active|current) job\b|\bcrew\b.{0,40}\bon site\b/i;
const defer=/\b(?:after|once|when|until)\b.{0,100}\b(?:complete|finish|done|renovation|remodel|project|permit|approval|parts)|\b(?:later|follow.up then|finish.{0,35}first)\b/i;
const recovery=/\b(?:unhappy|dissatisfied|complain\w*|flicker\w*|fault|service recovery|not working|broken)\b/i;
const actions={
 'scope-change opportunity':'Internally verify current job status and pricing before additional work. No work, scheduling or customer contact is authorized.',
 'retention or service-recovery opportunity':'Internally verify current issue status and preserve all source restrictions. Do not assume the complaint remains unresolved. No customer contact or billing action is authorized.',
 'follow-up revenue opportunity':'Internally verify the stated prerequisite and current consent. Do not schedule follow-up or contact the customer.',
 'strong cross-sell opportunity':'Internally verify current customer interest and the exact requested scope. No customer contact, scheduling, work, billing or CRM mutation is authorized.',
 'no opportunity':'No revenue action. Wait for new customer evidence.',
 'no clear opportunity':'No automated action. Internal review may resolve ambiguous source evidence.'
};
export function evaluateRevenueOpportunity(input){
 const structured=input&&typeof input==='object',source=structured?input.serviceHistory:[{timestamp:null,note:input}];
 if(!Array.isArray(source))throw Error('diagnostic_service_history_required');
 const notes=source.map(n=>({note:clean(n.note),timestamp:n.timestamp??null}));
 const dated=notes.every(n=>Number.isFinite(Date.parse(n.timestamp)));
 if(structured&&dated)notes.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
 const evidence=notes.map(n=>(n.timestamp?'['+n.timestamp+'] ':'')+n.note).filter(Boolean).join('\n')||'No service-note content was available for evaluation.';
 const result=(classification,why=evidence)=>({classification,confidence:classification==='no opportunity'&&!notes.some(n=>n.note)?'low':'medium',evidence:why,recommendedNextAction:actions[classification],humanReviewRequired:!classification.startsWith('no ')});
 if(!notes.some(n=>n.note))return result('no opportunity');
 if(structured&&!dated)return result('no clear opportunity');
 // Missing timestamps in the old string form never establish chronological order.
 const events=[];
 for(const n of notes){
  let customerContext=false;
  for(const clause of n.note.match(/[^.!?\n]+[.!?]?/g)||[]){
   const text=clause.trim();if(instruction.test(text)){customerContext=false;continue;}
   const attributed=text.replace(/^(?:while|with)\b[^.!?]{0,100},\s*(?=(?:the\s+)?customer\b)/i,'');
   const match=attributed.match(actor);
   if(!match){
    if(customerContext&&/^no (?:further|additional|more) (?:work|quote|follow.up)\b/i.test(text))events.push({negative:true,terms:new Set(),timestamp:n.timestamp,text});
    customerContext=false;
    continue;
   }
   const predicate=attributed.slice(match[0].length);
   if(thirdParty.test(predicate)){customerContext=false;continue;}
   customerContext=true;
   const service=terms(predicate);
   if(deny.test(predicate)||fulfilled.test(predicate)){events.push({negative:true,terms:service,timestamp:n.timestamp,text});continue;}
   let classification;
   if(/^(?:reports?|is|says?|said|confirms?)\b/i.test(predicate)&&recovery.test(predicate))classification='retention or service-recovery opportunity';
   else if(request.test(predicate)&&!/\b(?:might|maybe|someday|hypothetical|example)\b|\b(?:whether|if)\b.{0,30}\bshould\b/i.test(predicate)&&/\b(?:pric\w*|quot\w*|cost|install\w*|add|additional service|follow.up|lighting|lights)\b/i.test(predicate))classification=scope.test(text)?'scope-change opportunity':defer.test(predicate)?'follow-up revenue opportunity':'strong cross-sell opportunity';
   if(classification)events.push({negative:false,classification,terms:service,timestamp:n.timestamp,text});
  }
 }
 const active=[],negative=[];let ambiguous=false;
 for(const event of events){
  const opposite=event.negative?active:negative;
  const matching=opposite.filter(e=>related(e.terms,event.terms));
  if(opposite.some(e=>overlap(e.terms,event.terms)&&!related(e.terms,event.terms)))ambiguous=true;
  if(matching.some(e=>e.timestamp===event.timestamp))ambiguous=true;
  if(event.negative){
   // An unscoped withdrawal cannot cancel several independent requests by inference.
   if(!event.terms.size&&active.length>1){ambiguous=true;continue;}
   for(const old of matching)active.splice(active.indexOf(old),1);
   negative.push(event);
  }else{
   for(const old of matching)negative.splice(negative.indexOf(old),1);
   for(let i=active.length-1;i>=0;i--)if(related(active[i].terms,event.terms)&&active[i].classification===event.classification)active.splice(i,1);
   active.push(event);
  }
 }
 if(ambiguous)return result('no clear opportunity');
 if(active.length){
  const priority=['retention or service-recovery opportunity','scope-change opportunity','follow-up revenue opportunity','strong cross-sell opportunity'];
  const selected=[...active].sort((a,b)=>priority.indexOf(a.classification)-priority.indexOf(b.classification))[0];
  return result(selected.classification);
 }
 return result(negative.length?'no opportunity':'no clear opportunity');
}
