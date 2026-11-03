import { checkedJsonFetch,missingCredential } from './staging/blockers.js';
// Staging-only prompt correction; original v0.2 module and captures stay intact.
import contract from './findings-request-v0.3.3.json' with {type:'json'};
import { prepareHistory,materializeFindings } from './findings.js';
import {inspectFinding} from './staging/review-policy.js';
import {internalProposal,INTERNAL_PROPOSAL_VERSION} from './staging/internal-task-policy.js';
export const PROMPT_VERSION='reasoning-v0.3.3';
export const SCHEMA_VERSION='findings-v0.2'; // Output fields/schema are unchanged.
export async function materializeCorrected(raw,history,contextKey,evaluationTime=new Date().toISOString()){
  const result=await materializeFindings(raw,history,contextKey);
  const findings=result.findings.map(f=>({...f,proposedAction:internalProposal(f,history,inspectFinding(f,history,result.findings,evaluationTime),contextKey,evaluationTime)}));
  return {...result,findings,promptVersion:PROMPT_VERSION,proposalVersion:INTERNAL_PROPOSAL_VERSION};
}
export async function reasonCorrected(env,context,contextKey,evaluationTime=new Date().toISOString()){
  if(!env.EVAL_OPENAI_API_KEY)throw missingCredential('EVAL_OPENAI_API_KEY');
  if(!Number.isFinite(Date.parse(evaluationTime)))throw Error('evaluation_clock_required');
  const history=await prepareHistory(context);
  let endpoint='https://api.openai.com/v1/responses';
  if(env.LOCAL_MODEL_FIXTURE_URL){
    const url=new URL(env.LOCAL_MODEL_FIXTURE_URL);
    if(env.CERTIFICATION_MODE!=='local'||url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname))throw Error('local_model_fixture_forbidden');
    endpoint=url.origin+'/model/responses';
  }
  const body=await checkedJsonFetch(endpoint,{
    method:'POST',headers:{Authorization:'Bearer '+env.EVAL_OPENAI_API_KEY,'Content-Type':'application/json'},
    signal:AbortSignal.timeout(60000),
    body:JSON.stringify({...contract,input:JSON.stringify({evaluationTime,customer:context.customer,serviceHistory:history})}),
  },'EVAL_OPENAI_API_KEY','Responses inference');
  const text=(body.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
  if(!text)throw Error('missing_findings_output');
  return materializeCorrected(JSON.parse(text),history,contextKey,evaluationTime);
}
