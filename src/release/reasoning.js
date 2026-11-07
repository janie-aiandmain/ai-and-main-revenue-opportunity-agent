import {checkedJsonFetch,missingCredential} from '../staging/blockers.js';
import contract from '../findings-request-v0.3.3.json' with {type:'json'};
import {prepareHistory,materializeFindings} from '../findings.js';
import {materializeCorrected as previous} from '../findings-v0.3.3.js';
import {completeEvidence,EVIDENCE_POLICY} from './evidence.js';
export {EVIDENCE_POLICY};
export const PROMPT_VERSION='reasoning-v0.3.3',SCHEMA_VERSION='findings-v0.2',MATERIALIZATION_VERSION='source-evidence-v0.3.4';
export async function materializeCorrected(raw,history,key,time=new Date().toISOString()){
 // Validate original model spans and distinctness before completing source clauses.
 await materializeFindings(raw,history,key);
 const closed=completeEvidence(raw,history);
 return {...await previous(closed.raw,history,key,time),materializationVersion:MATERIALIZATION_VERSION,evidencePolicyVersion:EVIDENCE_POLICY};
}
export async function reasonCorrected(env,context,key,time=new Date().toISOString()){
 if(!env.EVAL_OPENAI_API_KEY)throw missingCredential('EVAL_OPENAI_API_KEY');
 if(!Number.isFinite(Date.parse(time)))throw Error('evaluation_clock_required');
 const history=await prepareHistory(context);let endpoint='https://api.openai.com/v1/responses';
 if(env.LOCAL_MODEL_FIXTURE_URL){const u=new URL(env.LOCAL_MODEL_FIXTURE_URL);if(env.CERTIFICATION_MODE!=='local'||u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname))throw Error('local_model_fixture_forbidden');endpoint=u.origin+'/model/responses';}
 const response=await checkedJsonFetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+env.EVAL_OPENAI_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(60000),body:JSON.stringify({...contract,input:JSON.stringify({evaluationTime:time,customer:context.customer,serviceHistory:history})})},'EVAL_OPENAI_API_KEY','Responses inference');
 const text=(response.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;if(!text)throw Error('missing_findings_output');
 return materializeCorrected(JSON.parse(text),history,key,time);
}
