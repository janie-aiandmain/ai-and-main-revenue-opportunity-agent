const decode=s=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));
export async function verifyOperator(request,env){
  const header=request.headers.get('Authorization');
  if(!header?.startsWith('Bearer ')) throw Error('authentication_required');
  if(!env.ACCESS_ISSUER||!env.ACCESS_AUDIENCE||!env.APPROVER_SUBJECTS_JSON) throw Error('identity_not_configured');
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
    const response=await fetch(new URL('/cdn-cgi/access/certs',issuer),{signal:AbortSignal.timeout(10000)});if(!response.ok) throw Error('identity_keys_unavailable');jwks=await response.json();
  }
  const jwk=jwks?.keys?.find(k=>k.kid===h.kid&&k.kty==='RSA');if(!jwk) throw Error('identity_key_missing');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const signature=Uint8Array.from(atob(parts[2].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,new TextEncoder().encode(parts[0]+'.'+parts[1]))) throw Error('invalid_identity_signature');
  const roles=JSON.parse(env.APPROVER_SUBJECTS_JSON),role=roles[p.sub];
  if(!['Viewer','Approver','Admin'].includes(role)) throw Error('role_denied');
  if(env.CERTIFICATION_MODE!=='local'&&p.iss==='https://certification.invalid') throw Error('test_identity_forbidden');
  return {subject:p.sub,role,kind:env.CERTIFICATION_MODE==='local'?'LOCAL_SYNTHETIC':'EXTERNAL_VERIFIED'};
}
