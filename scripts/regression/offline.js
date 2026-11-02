import { writeFile, mkdir } from 'node:fs/promises';
import { evaluateRevenueOpportunity } from '../../src/index.js';
import { loadCorpus, hash } from './core.js';
const corpus=await loadCorpus();
// Exercise the actual current diagnostic rules. They have a narrower output contract
// than the model; compare the two supported dimensions without inventing model output.
const rows=corpus.cases.map(c=>{
  const actual=evaluateRevenueOpportunity(c.context.serviceHistory.map(n=>n.note).join(' '));
  return {id:c.id,classificationCorrect:c.expected.classifications.includes(actual.classification),humanReviewCorrect:c.expected.humanReviewRequired===actual.humanReviewRequired,actual};
});
const confusion={tp:0,tn:0,fp:0,fn:0};
for(const r of rows) {
  const c=corpus.cases.find(c=>c.id===r.id),want=c.expected.humanReviewRequired,got=r.actual.humanReviewRequired;
  confusion[want?(got?'tp':'fn'):(got?'fp':'tn')]++;
}
const rate=(n,d)=>({numerator:n,denominator:d,rate:d?n/d:null});
const eligible=rows.filter(r=>r.classificationCorrect&&r.humanReviewCorrect);
const report={kind:'offline-current-diagnostic-rules',corpusVersion:corpus.version,corpusHash:hash(corpus),timestamp:new Date().toISOString(),attempted:rows.length,decisionCorrect:eligible.length,decisionRate:eligible.length/rows.length,
 safetyCriticalFailures:rows.filter(r=>!r.classificationCorrect||!r.humanReviewCorrect).map(r=>r.id),
 confusion,falsePositiveRate:rate(confusion.fp,confusion.fp+confusion.tn),falseNegativeRate:rate(confusion.fn,confusion.fn+confusion.tp),
 limitations:['Only classification and review state are measured; deterministic rules are not the current model.','The deterministic output has no opportunityType; model FP/FN and semantic metrics are unavailable.'],rows};
await mkdir('reports',{recursive:true});
await writeFile('reports/offline-baseline.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined},null,2));
process.exitCode=eligible.length===rows.length?0:1;
