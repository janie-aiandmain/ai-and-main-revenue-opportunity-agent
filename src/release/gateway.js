import {DemoHubSpot,PORTAL,CONTACT,MARKER} from '../demo/hubspot.js';
import {verifyOperator,verifyIdentity} from '../staging/auth.js';
import {identityBlocker} from '../staging/blockers.js';
import {operatorConsole} from '../staging/operator-console.js';
const json=(b,s=200)=>Response.json(b,{status:s,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
const reads=new Set(['status','metrics','preflight','session','general/findings','general/identity-candidates']);
const writes=new Set(['general/evaluate','general/identity-review','general/review','general/approve','general/execute','reconcile','resolve-uncertain']);
export async function operatorGateway(request,env){
 const path=new URL(request.url).pathname;
 if(['/writeback-task','/writeback-test','/writeback-preview'].includes(path))return json({status:'legacy_writeback_disabled'},403);
 if(!['staging','customer'].includes(env.DEPLOYMENT_ENVIRONMENT)||env.CRM_WRITEBACK_ENABLED!=='false')return json({status:'operator_configuration_closed'},503);
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return json({status:'cross_origin_request_forbidden'},403);
 if(path==='/identity'){
  if(request.method!=='GET')return json({status:'get_required'},405);
  try{const identity=await verifyIdentity(request,env);const roles=JSON.parse(env.APPROVER_SUBJECTS_JSON||'{}');return json({kind:'VERIFIED_SELF_IDENTITY_NOT_APPROVAL',subject:identity.subject,issuer:identity.issuer,audience:identity.audience,configuredRole:roles[identity.subject]||null,nextStep:'Only this non-secret subject identifier is needed for an explicit role mapping. This is not a task or release approval.'});}catch(error){const b=identityBlocker(error);return json({status:b.code,blocker:b.toJSON()},401);}
 }
 let actor;try{actor=await verifyOperator(request,env);}catch(error){const b=identityBlocker(error);return json({status:b.code,blocker:b.toJSON()},b.code==='insufficient_permission'?403:401);}
 if(path==='/operator'||path==='/')return request.method==='GET'?operatorConsole(env):json({status:'get_required'},405);
 if(!path.startsWith('/certification/'))return json({status:'legacy_diagnostic_disabled_use_operator'},404);
 const action=path.slice('/certification/'.length);if(!reads.has(action)&&!writes.has(action))return json({status:'not_found'},404);
 if(request.method!=='POST')return json({status:'post_required'},405);
 if(writes.has(action)&&!['Approver','Admin'].includes(actor.role))return json({status:'approver_required'},403);
 if(action==='general/execute'&&(env.ENABLE_GENERAL_EXECUTION!=='true'||env.GENERAL_RELEASE_APPROVED!=='true'))return json({status:'general_execution_release_blocked_at_gateway'},403);
 if(action==='resolve-uncertain'&&actor.role!=='Admin')return json({status:'admin_required'},403);
 if(action==='session')return json({role:actor.role,identityKind:actor.kind,customerWritebackEnabled:env.ENABLE_GENERAL_EXECUTION==='true'&&env.GENERAL_RELEASE_APPROVED==='true'});
 const text=await request.text();if(new TextEncoder().encode(text).length>16000)return json({status:'request_too_large'},413);
 let body;try{body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return json({status:'invalid_json'},400);}
 const binding=env.CERTIFICATION_LEDGER||env.DEMO_RECOVERY_LEDGER;
 if(!binding||!env.STAGING_PORTAL_ID||!env.STAGING_CONTACT_ID)return json({status:'durable_tenant_not_configured'},503);
 const stub=binding.get(binding.idFromName('release-portal:'+env.STAGING_PORTAL_ID+':contact:'+env.STAGING_CONTACT_ID));
 const response=await stub.fetch(new Request('https://private-ledger'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,actor})}));
 if(action==='preflight'&&env.CERTIFICATION_MODE==='remote-demo'){
  const result=await response.json();
  // Diagnose already-existing credentials in the original holder. Never extract
  // values, copy credentials, or substitute them into the ledger owner's path.
  const original={kind:'READ_ONLY_EXISTING_DEMO_CREDENTIAL_CHECK',checks:[],writes:0};
  try{const client=new DemoHubSpot(env);
   for(const [credential,writer] of [['HUBSPOT_ACCESS_TOKEN',false],['HUBSPOT_WRITE_TOKEN',true]]){
    try{const account=await(await client.get('/account-info/v3/details',writer)).json();original.checks.push({credential,status:String(account.portalId)===PORTAL?'PASS':'portal_mismatch',portalId:String(account.portalId)});}catch(e){original.checks.push({credential,status:/^hubspot_[a-z0-9_]+$/.test(e.message)?e.message:'credential_check_blocked'});}
   }
   if(original.checks.every(c=>c.status==='PASS')){const contact=await(await client.get('/crm/v3/objects/contacts/'+CONTACT+'?properties=firstname')).json();original.contactMarkerVerified=String(contact.id)===CONTACT&&contact.properties?.firstname===MARKER;}
  }catch{original.blocker='existing_demo_credentials_not_available';}
  return json({...result,originalDemoCredentialProof:original,credentialLocations:{workflow:'ai-and-main-revenue-opportunity-staging → Settings → Variables and Secrets',existingDemo:'ai-and-main-revenue-opportunity-agent → Settings → Variables and Secrets'},credentialsNotSubstituted:true},response.status);
 }
 return response;
}
