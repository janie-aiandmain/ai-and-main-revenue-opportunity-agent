import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { reasonAboutRevenueFindings } from '../../src/findings.js';
import { loadFindingsCorpus, gradeFindings, summarizeFindings, hash } from './findings-core.js';
const args=process.argv.slice(2);
const permitted=['--live','--non-production'];
if(args.some(x=>!permitted.includes(x)) || !args.includes('--live') || !args.includes('--non-production')) {
  console.error('Opt-in required: npm run regression:findings -- --live --non-production (test credential only)');process.exit(2);
}
const corpus=await loadFindingsCorpus();
const snapshot=JSON.parse(await readFile(new URL('../../fixtures/production-request-v0.2.json',import.meta.url),'utf8'));
const meta={kind:'model-multi-findings',timestamp:new Date().toISOString(),corpusVersion:corpus.version,corpusHash:hash(corpus),requestHash:hash(snapshot),model:snapshot.model,reasoning:snapshot.reasoning,graderVersion:'grader-v2',promptVersion:'reasoning-v0.2',schemaVersion:'findings-v0.2',promptHash:hash(snapshot.instructions),schemaHash:hash(snapshot.text.format.schema),runsPerCase:1};
await mkdir('reports',{recursive:true});
if(!process.env.EVAL_OPENAI_API_KEY) {
  const blocked={...meta,status:'blocked_missing_nonproduction_credential',attempted:0,plannedCases:corpus.cases.length,metrics:null,safetyCriticalFailures:null,falsePositiveRate:null,falseNegativeRate:null};
  await writeFile('reports/model-findings-v0.2.json',JSON.stringify(blocked,null,2)+'\n');
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
   const actual=await reasonAboutRevenueFindings({OPENAI_API_KEY:process.env.EVAL_OPENAI_API_KEY},c.context,'synthetic:'+c.id);
   rows.push({id:c.id,run:1,timestamp:new Date().toISOString(),...telemetry,actual,outputHash:hash(actual),grade:await gradeFindings(c,actual)});
  } catch(error) {
   // Never serialize arbitrary upstream errors, request headers or response bodies.
   const safe=/^upstream_http_\d+$/.test(error.message)?error.message:'model_request_or_output_failed';
   rows.push({id:c.id,run:1,...telemetry,error:safe});
  }
  await writeFile('reports/model-findings-v0.2.json',JSON.stringify({...meta,status:'running',rows},null,2)+'\n');
  console.log(JSON.stringify({id:c.id,completed:rows.length,planned:corpus.cases.length,error:rows.at(-1).error??null}));
  if (['upstream_http_400','upstream_http_401','upstream_http_403','upstream_http_404','upstream_http_429'].includes(rows.at(-1).error)) break;
 }
} finally {globalThis.fetch=originalFetch;}
const summary=summarizeFindings(corpus,rows);
const report={...meta,status:summary.validResults ? 'executed_requires_semantic_review' : 'blocked_no_valid_model_results',summary,rows};
await writeFile('reports/model-findings-v0.2.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
// Human semantic adjudication is not implemented for v2 yet; do not emit a release pass.
process.exitCode=1;
