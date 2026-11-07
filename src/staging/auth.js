import { StagingBlocker } from './blockers.js';
const decode=s=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));
export async function verifyIdentity(request,env){
  const bearer=request.headers.get('Authorization');
  const access=request.headers.get('Cf-Access-Jwt-Assertion');
  if(bearer&&access&&bearer!=='Bearer '+access)throw Error('ambiguous_identity');
  const header=bearer||(access?'Bearer '+access:null);
  if(!header?.startsWith('Bearer ')) throw Error('authentication_required');
  if(!env.ACCESS_ISSUER||!env.ACCESS_AUDIENCE) throw Error('identity_not_configured');
  const parts=header.slice(7).split('.');if(parts.length!==3) throw Error('invalid_identity');
  const [h,p]=parts.slice(0,2).map(decode);
  if(h.alg!=='RS256'||!h.kid||p.iss!==env.ACCESS_ISSUER||!(Array.isArray(p.aud)?p.aud:[p.aud]).includes(env.ACCESS_AUDIENCE)||!p.sub||!Number.isFinite(p.exp)||p.exp<=Date.now()/1000||p.nbf&&p.nbf>Date.now()/1000) throw Error('invalid_identity');
  let jwks;
  if(env.CERTIFICATION_MODE==='local'){
    if(env.ACCESS_ISSUER!=='https://certification.invalid') throw Error('invalid_local_issuer');
    jwks=JSON.parse(env.LOCAL_TEST_JWKS_JSON||'null');
  }else{
    const issuer=new URL(env.ACCESS_ISSUER);
    if(issuer.protocol!=='https:'||!issuer.hostname.endsWith('.cloudflareaccess.com')||env.LOCAL_TEST_JWKS_JSON) throw Error('invalid_identity_configuration');
    let response;try{response=await fetch(new URL('/cdn-cgi/access/certs',issuer),{signal:AbortSignal.timeout(10000)});}catch{throw new StagingBlocker('blocked_network_access',{host:issuer.hostname,check:'Access public signing keys',setupStep:11});}if(!response.ok)throw new StagingBlocker('upstream_unavailable',{host:issuer.hostname,httpStatus:response.status,check:'Access public signing keys',setupStep:5});jwks=await response.json();
  }
  const jwk=jwks?.keys?.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk) throw Error('identity_key_missing');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signature=Uint8Array.from(atob(parts[2].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,new TextEncoder().encode(parts[0]+'.'+parts[1]))) throw Error('invalid_identity_signature');
  if(env.CERTIFICATION_MODE!=='local'&&p.iss==='https://certification.invalid') throw Error('test_identity_forbidden');
  return {subject:p.sub,issuer:p.iss,audience:env.ACCESS_AUDIENCE,kind:env.CERTIFICATION_MODE==='local'?'LOCAL_SYNTHETIC':'EXTERNAL_VERIFIED'};
}
export async function verifyOperator(request,env){
  const identity=await verifyIdentity(request,env);
  if(!env.APPROVER_SUBJECTS_JSON)throw Error('identity_not_configured');
  const roles=JSON.parse(env.APPROVER_SUBJECTS_JSON),role=roles[identity.subject];
  if(!['Viewer','Approver','Admin'].includes(role))throw Error('role_denied');
  return {subject:identity.subject,role,kind:identity.kind};
}
