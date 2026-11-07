// Deterministic source closure, not model self-repair or human adjudication.
// Append a bare adjacent qualifier only when the cited note has exactly one need.
// Multi-need or instruction-bearing boundaries stay conservative and reviewable.
export const EVIDENCE_POLICY='source-clause-closure-v1';
const qualifier=/^(?:do not|don't|must not|no (?:more|further)|hold|pause|stop|only|unless|without|until|before|after|once|when)\b/i;
const instruction=/\b(?:ignore (?:previous|all)|system\s*:|mark (?:this )?approved|change (?:the )?deal stage)\b/i;
export function sourceSentences(text){
 return [...text.matchAll(/\S[\s\S]*?(?:[.!?](?=\s|$)|\n|$)/g)].map(m=>{const quote=m[0].trim(),start=m.index+m[0].indexOf(quote);return {quote,start,end:start+quote.length};}).filter(x=>x.quote);
}
export function completeEvidence(raw,history){
 const trace=[];
 const findings=raw.findings.map(f=>({...f,evidence:f.evidence.map(e=>({...e}))}));
 for(const n of history){
  const sentences=sourceSentences(n.note);
  const cited=raw.findings.map((f,i)=>({i,spans:f.evidence.filter(e=>e.noteId===n.noteId).map(e=>{const start=n.note.indexOf(e.quote);return {start,end:start+e.quote.length,quote:e.quote};})})).filter(f=>f.spans.length);
  const owners=s=>cited.filter(f=>f.spans.some(e=>e.start<s.end&&e.end>s.start));
  for(const {i,spans} of cited){
   const extra=[];
   for(const e of spans){
    const touched=sentences.filter(s=>s.start<e.end&&s.end>e.start);
    if(touched.length&&touched.every(s=>owners(s).length===1&&!instruction.test(s.quote))){
     extra.push(...touched);
     // No semantic guessing across another need or a non-qualifier sentence.
     if(cited.length===1){let at=sentences.indexOf(touched.at(-1))+1;while(at<sentences.length&&qualifier.test(sentences[at].quote)&&!instruction.test(sentences[at].quote)){extra.push(sentences[at++]);}}
    }
   }
   const all=[...findings[i].evidence.filter(e=>e.noteId!==n.noteId),...spans.filter(e=>!extra.some(s=>s.start<=e.start&&s.end>=e.end)).map(e=>({noteId:n.noteId,quote:e.quote})),...extra.map(s=>({noteId:n.noteId,quote:s.quote}))];
   findings[i].evidence=[...new Map(all.map(e=>[e.noteId+'\0'+e.quote,e])).values()];
   for(const s of extra)if(!spans.some(e=>e.start===s.start&&e.end===s.end))trace.push({findingKey:findings[i].opportunityKey,noteId:n.noteId,start:s.start,end:s.end,reason:'UNAMBIGUOUS_SOURCE_CLAUSE_COMPLETION'});
  }
 }
 return {raw:{findings},trace,policyVersion:EVIDENCE_POLICY};
}
