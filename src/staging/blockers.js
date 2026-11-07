// Safe diagnostic metadata only. Never serialize tokens, headers or upstream text.
export class StagingBlocker extends Error {
  constructor(code,{credential,check,setupStep,httpStatus,host,requiredPermissions,retryAfterSeconds}={}){
    super(code);this.name='StagingBlocker';this.code=code;
    const actions={2:'Verify the isolated non-production portal/account switcher; never substitute production.',3:'Verify the designated synthetic contact ID and exact AI_MAIN_CERTIFICATION_ONLY marker.',4:'Inspect the existing staging credential permissions with the account owner; stop if required abilities exceed approved scope.',5:'Log in through the correct Access application and verify its issuer/audience configuration.',6:'Map the verified Access subject to an explicitly approved Viewer, Approver or Admin role.',9:'Enter or replace the correct non-production credential securely in the named staging secret binding.',11:'Allow the exact host in the relevant runtime network policy and refresh that environment; do not bypass the proxy.',12:'Inspect the safe read-only preflight receipt; do not enable task writes.'};
    this.details={code,...(credential?{credential}:{}),...(check?{check}:{}),...(setupStep?{setupStep,setupAction:actions[setupStep]}:{}),...(httpStatus?{httpStatus}:{}),...(host?{host}:{}),...(requiredPermissions?.length?{requiredPermissions}:{}),...(Number.isFinite(retryAfterSeconds)?{retryAfterSeconds}:{}),permissionsExpanded:false};
  }
  toJSON(){return this.details;}
}
export const missingCredential=name=>new StagingBlocker('missing_credential',{credential:name,check:'secure_binding',setupStep:9});
export async function checkedJsonFetch(url,options,credential,check){
  let response;
  try{response=await fetch(url,{...options,redirect:'manual'});}catch(error){if(['TimeoutError','AbortError'].includes(error.name))throw new StagingBlocker('upstream_timeout',{credential,host:new URL(url).hostname,check:'request_timed_out_no_automatic_create_retry',setupStep:12});throw new StagingBlocker('blocked_network_access',{credential,host:new URL(url).hostname,check:'no_http_response',setupStep:11});}
  if(response.status>=300&&response.status<400)throw new StagingBlocker('upstream_redirect_rejected',{credential,host:new URL(url).hostname,check:'redirect_not_followed',httpStatus:response.status,setupStep:12});
  if(response.status===429){const raw=response.headers.get('retry-after'),seconds=raw&&/^\d+$/.test(raw)?Number(raw):null;throw new StagingBlocker('rate_limited',{credential,check,httpStatus:429,setupStep:12,...(Number.isFinite(seconds)?{retryAfterSeconds:Math.min(seconds,86400)}:{})});}
  if(response.status===401)throw new StagingBlocker('rejected_credential',{credential,check,httpStatus:401,setupStep:9});
  if(response.status===404&&new URL(url).pathname.startsWith('/crm/v3/objects/contacts/'))throw new StagingBlocker('contact_mismatch',{credential,check:'designated_contact_not_found',httpStatus:404,setupStep:3});
  if(response.status===403){
    const body=await response.json().catch(()=>null);
    const requiredPermissions=(body?.errors||[]).flatMap(e=>e.context?.requiredScopes||[]).filter(s=>typeof s==='string'&&/^(?:crm\.[a-z0-9_.]+|oauth|account-info\.security\.read)$/.test(s));
    throw new StagingBlocker('insufficient_permission',{credential,check,httpStatus:403,setupStep:4,requiredPermissions});
  }
  if(!response.ok)throw new StagingBlocker('upstream_unavailable',{credential,check,httpStatus:response.status,setupStep:11});
  try{return await response.json();}catch{throw new StagingBlocker('invalid_upstream_response',{credential,check,setupStep:12});}
}
export function identityBlocker(error){
  if(error instanceof StagingBlocker)return error;
  if(error.message==='authentication_required')return new StagingBlocker('missing_credential',{credential:'Access JWT',check:'identity_assertion',setupStep:5});
  if(error.message==='role_denied')return new StagingBlocker('insufficient_permission',{credential:'Access JWT',check:'subject_role_mapping',setupStep:6});
  if(['identity_not_configured','invalid_identity_configuration'].includes(error.message))return new StagingBlocker('missing_configuration',{check:'Access issuer/audience/subject mapping',setupStep:5});
  const known=new Set(['identity_algorithm_or_key_id','identity_issuer_mismatch','identity_audience_mismatch','identity_subject_missing','identity_expired','identity_not_yet_valid','identity_key_missing','invalid_identity_signature','ambiguous_identity']);
  return new StagingBlocker('rejected_credential',{credential:'Access JWT',check:known.has(error.message)?error.message:'signature_issuer_audience_expiry',setupStep:5});
}
