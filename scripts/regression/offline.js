import { writeFile, mkdir } from 'node:fs/promises';
import { evaluateRevenueOpportunity } from '../../src/index.js';
import {DIAGNOSTIC_POLICY} from '../../src/diagnostics/rules-v0.3.js';
import {evaluateLegacyRevenueOpportunity,LEGACY_DIAGNOSTIC_VERSION} from '../../src/diagnostics/legacy-rules-v0.2.js';
import { loadCorpus, hash } from './core.js';
const corpus=await loadCorpus();
const legacy=process.argv.slice(2).join(' ')==='--legacy-v0.2';
if(process.argv.length>2&&!legacy)throw Error('unsupported_diagnostic_argument');
// Exercise the actual current diagnostic rules. They have a narrower output contract
// than the model; compare the two supported dimensions without inventing model output.
const rows=corpus.cases.map(c=>{
  const actual=legacy?evaluateLegacyRevenueOpportunity(c.context.serviceHistory.map(n=>n.note).join(' ')):evaluateRevenueOpportunity(c.context);
  return {id:c.id,classificationCorrect:c.expected.classifications.includes(actual.classification),humanReviewCorrect:c.expected.humanReviewRequired===actual.humanReviewRequired,actual};
});
const confusion={tp:0,tn:0,fp:0,fn:0};
for(const r of rows) {
  const c=corpus.cases.find(c=>c.id===r.id),want=c.expected.humanReviewRequired,got=r.actual.humanReviewRequired;
  confusion[want?(got?'tp':'fn'):(got?'fp':'tn')]++;
}
const rate=(n,d)=>({numerator:n,denominator:d,rate:d?n/d:null});
const eligible=rows.filter(r=>r.classificationCorrect&&r.humanReviewCorrect);
const contractLimitedCases=corpus.cases.filter(c=>c.expectedFindingCount>1).map(c=>({id:c.id,expectedFindings:c.expectedFindingCount,singleSummaryCannotProveIndependentCoverage:true}));
const report={kind:'offline-current-diagnostic-rules',corpusVersion:corpus.version,corpusHash:hash(corpus),timestamp:new Date().toISOString(),attempted:rows.length,decisionCorrect:eligible.length,decisionRate:eligible.length/rows.length,
 safetyCriticalFailures:rows.filter(r=>!r.classificationCorrect||!r.humanReviewCorrect).map(r=>r.id),
 confusion,falsePositiveRate:rate(confusion.fp,confusion.fp+confusion.tn),falseNegativeRate:rate(confusion.fn,confusion.fn+confusion.tp),
 diagnosticPolicy:legacy?LEGACY_DIAGNOSTIC_VERSION:DIAGNOSTIC_POLICY,inputContract:legacy?'flattened note text without timestamps':'dated serviceHistory sorted by source timestamp',
 contractLimitedCases,releaseEligible:false,
 limitations:['Only classification and review state are measured; deterministic rules are not the current model.','The deterministic output has no opportunityType, finding IDs, independent finding collection or executable action; model FP/FN and semantic metrics are unavailable.','A passing single summary cannot establish coverage of multiple independent findings.'],rows};
await mkdir('reports',{recursive:true});
await writeFile(legacy?'reports/offline-legacy-v0.2.json':'reports/offline-baseline.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined},null,2));
// Keep contract limitations visible as a failing gate, even if all two-field checks pass.
process.exitCode=eligible.length===rows.length&&(legacy||contractLimitedCases.length===0)?0:1;
