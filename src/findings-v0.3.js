// Staging-only prompt correction; original v0.2 module and captures stay intact.
import contract from './findings-request-v0.3.json' with {type:'json'};
import { prepareHistory,materializeFindings } from './findings.js';
export const PROMPT_VERSION='reasoning-v0.3';
export const SCHEMA_VERSION='findings-v0.2'; // Output fields/schema are unchanged.
export async function materializeCorrected(raw,history,contextKey){
  return {...await materializeFindings(raw,history,contextKey),promptVersion:PROMPT_VERSION};
}
export async function reasonCorrected(env,context,contextKey,evaluationTime=new Date().toISOString()){
  if(!Number.isFinite(Date.parse(evaluationTime)))throw Error('evaluation_clock_required');
  const history=await prepareHistory(context);
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:'Bearer '+env.EVAL_OPENAI_API_KEY,'Content-Type':'application/json'},
    signal:AbortSignal.timeout(60000),
    body:JSON.stringify({...contract,input:JSON.stringify({evaluationTime,customer:context.customer,serviceHistory:history})}),
  });
  if(!response.ok)throw Error('model_http_'+response.status);
  const body=await response.json();
  const text=(body.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
  if(!text)throw Error('missing_findings_output');
  return materializeCorrected(JSON.parse(text),history,contextKey);
}
