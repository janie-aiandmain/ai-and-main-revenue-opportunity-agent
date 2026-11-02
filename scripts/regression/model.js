import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { reasonAboutRevenueOpportunity } from '../../src/reasoning.js';
import { loadCorpus, grade, summarize, hash } from './core.js';
const args=process.argv.slice(2);
const permitted=['--live','--non-production'];
if(args.some(x=>!permitted.includes(x)) || !args.includes('--live') || !args.includes('--non-production')) {
  console.error('Opt-in required: npm run regression:model -- --live --non-production (test credential only)');process.exit(2);
}
const corpus=await loadCorpus();
const snapshot=JSON.parse(await readFile(new URL('../../fixtures/production-request-v0.1.json',import.meta.url),'utf8'));
const meta={kind:'model-current-prompt',timestamp:new Date().toISOString(),corpusVersion:corpus.version,corpusHash:hash(corpus),requestHash:hash(snapshot),model:snapshot.model,reasoning:snapshot.reasoning,graderVersion:'grader-v1',promptVersion:'reasoning-v0.1',schemaVersion:'evaluation-v0.1',promptHash:hash(snapshot.instructions),schemaHash:hash(snapshot.text.format.schema),runsPerCase:1};
await mkdir('reports',{recursive:true});
if(!process.env.EVAL_OPENAI_API_KEY) {
  const blocked={...meta,status:'blocked_missing_nonproduction_credential',attempted:0,plannedCases:corpus.cases.length,metrics:null,safetyCriticalFailures:null,falsePositiveRate:null,falseNegativeRate:null};
  await writeFile('reports/model-baseline.json',JSON.stringify(blocked,null,2)+'\n');
  console.error('Model baseline blocked: configure non-production EVAL_OPENAI_API_KEY securely. Zero model calls.');process.exit(2);
}
// No HubSpot credential is read. Only this fixed HTTPS destination is permitted.
const originalFetch=globalThis.fetch;
let telemetry={};
globalThis.fetch=async(url,options)=>{
  if(url!=='https://api.openai.com/v1/responses') throw Error('unexpected_destination');
  const body=JSON.parse(options.body), {input,...settings}=body;
  if(hash(settings)!==hash(snapshot)) throw Error('production_request_drift');
  const response=await originalFetch(url,{...options,signal:AbortSignal.timeout(60000)});
  if(!response.ok) {
    const payload=await response.json().catch(()=>null);
    const known=['invalid_api_key','model_not_found','insufficient_quota','permission_denied'];
    telemetry={upstreamCode:known.includes(payload?.error?.code)?payload.error.code:null};
    throw Error('upstream_http_'+response.status);
  }
  const json=await response.clone().json();
  telemetry={returnedModel:json.model??null,usage:json.usage??null};
  return response;
};
const rows=[];
try {
 for(const c of corpus.cases) {
  telemetry={};
  try {
   const actual=await reasonAboutRevenueOpportunity({OPENAI_API_KEY:process.env.EVAL_OPENAI_API_KEY},c.context);
   rows.push({id:c.id,run:1,timestamp:new Date().toISOString(),...telemetry,actual,outputHash:hash(actual),grade:grade(c,actual)});
  } catch(error) {
   // Never serialize arbitrary upstream errors, request headers or response bodies.
   const safe=/^upstream_http_\d+$/.test(error.message)?error.message:'model_request_or_output_failed';
   rows.push({id:c.id,run:1,...telemetry,error:safe});
  }
  console.log(JSON.stringify({id:c.id,completed:rows.length,planned:corpus.cases.length,error:rows.at(-1).error??null}));
  if (['upstream_http_400','upstream_http_401','upstream_http_403','upstream_http_404','upstream_http_429','model_request_or_output_failed'].includes(rows.at(-1).error)) break;
 }
} finally {globalThis.fetch=originalFetch;}
const summary=summarize(corpus,rows,'model-current-prompt');
const report={...meta,status:summary.validResults ? 'executed_requires_semantic_review' : 'blocked_no_valid_model_results',summary,rows};
await writeFile('reports/model-baseline.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,attempted:summary.attempted,validResults:summary.validResults,errors:summary.errors,scoredDecisionCorrectness:summary.scoredDecisionCorrectness,falsePositiveRate:summary.falsePositiveRate,falseNegativeRate:summary.falseNegativeRate,safetyCriticalFailures:summary.safetyCriticalFailures},null,2));
process.exitCode=summary.suitePassed?0:1;
