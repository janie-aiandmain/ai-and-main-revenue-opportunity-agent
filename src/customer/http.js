import {customerConfiguration,customerActor,requireRole} from './policy.js';
import {identityBlocker,StagingBlocker} from '../staging/blockers.js';
import {ownerConsole} from './owner-console.js';
const cookieName='__Host-ai-main-hubspot-state';
export const json=(body,status=200,extra={})=>Response.json(body,{status,headers:{'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...extra}});
export function safeFailure(error){
 if(error instanceof StagingBlocker)return json({status:error.code,blocker:{...error.toJSON(),setupAction:'Check the named HubSpot OAuth app/connection setting. No fallback credential or broader permission will be used.'}},409);
 const code=/^[a-z0-9_]+$/.test(error.message)?error.message:'customer_connection_blocked';return json({status:code},409);
}
function stateCookie(request){const cookies=(request.headers.get('Cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(cookieName+'='));if(cookies.length!==1)return '';return cookies[0].slice(cookieName.length+1);}
export async function customerFetch(request,env){
 let cfg;try{cfg=customerConfiguration(env);}catch(error){return safeFailure(error);}
 const u=new URL(request.url);if(u.origin!==cfg.origin)return json({status:'installation_origin_mismatch'},403);
 let actor;try{actor=await customerActor(request,env);}catch(error){const b=identityBlocker(error);return json({status:b.code,check:b.toJSON().check},401);}
 const path=u.pathname;if(['/','/setup','/operator'].includes(path))return request.method==='GET'?ownerConsole():json({status:'get_required'},405);
 const callback=path==='/hubspot/oauth/callback',route=callback?'callback':path.slice('/hubspot/'.length);
 if(!path.startsWith('/hubspot/')||!['status','connect','callback','disconnect','records','permit','remove','evaluate','findings'].includes(route))return json({status:'customer_route_not_supported'},404);
 if(callback){if(request.method!=='GET'||[...u.searchParams.keys()].some(k=>!['state','code','error','error_description'].includes(k))||['state','code','error'].some(k=>u.searchParams.getAll(k).length>1))return json({status:'oauth_callback_invalid'},400);}
 else if(route==='status'||route==='records'||route==='findings'){if(request.method!=='GET')return json({status:'get_required'},405);}
 else if(request.method!=='POST'||request.headers.get('Origin')!==cfg.origin)return json({status:'same_origin_post_required'},403);
 if(['connect','callback','disconnect','permit','remove'].includes(route)){try{requireRole(actor,['Admin']);}catch{return json({status:'installation_admin_required'},403);}}
 if(route==='evaluate'){try{requireRole(actor,['Approver','Admin']);}catch{return json({status:'approver_required'},403);}}
 let body={};
 if(request.method==='POST'){
  const size=Number(request.headers.get('Content-Length'));if(Number.isFinite(size)&&size>6000)return json({status:'request_too_large'},413);
  const reader=request.body?.getReader(),chunks=[];let total=0;
  if(reader)try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>6000){await reader.cancel();return json({status:'request_too_large'},413);}chunks.push(value);}}finally{reader.releaseLock();}
  try{body=JSON.parse(new TextDecoder().decode(new Uint8Array(await new Blob(chunks).arrayBuffer()))||'{}');}catch{return json({status:'invalid_json'},400);}
  const fields=route==='permit'?['recordLink']:['remove','evaluate'].includes(route)?['contactId']:[];
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!fields.includes(k)))return json({status:'unsupported_fields'},400);
 }
 if(route==='findings')body={contactId:u.searchParams.get('contactId')};
 if(callback)body={state:u.searchParams.get('state'),code:u.searchParams.get('code'),error:u.searchParams.get('error'),browserCookie:stateCookie(request)};
 const binding=env.HUBSPOT_CUSTOMER_LEDGER;if(!binding)return json({status:'private_installation_storage_missing'},503);
 const stub=binding.get(binding.idFromName('hubspot-installation:'+cfg.installationId));
 let response;try{response=await stub.fetch(new Request('https://private-installation/'+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({body,actor})}));}catch{return json({status:'installation_request_interrupted_refresh_state',createAttempted:false},503);}
 if(route==='connect'&&response.ok){const d=await response.json();return json({authorizationUrl:d.authorizationUrl},200,{'set-cookie':cookieName+'='+d.browserCookie+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600'});}
 if(callback){const receipt=await response.json();const target=cfg.origin+'/setup'+(response.ok?'?connected=1':'?connectionError='+encodeURIComponent(receipt.status||'connection_blocked'));return new Response(null,{status:303,headers:{location:target,'cache-control':'no-store','referrer-policy':'no-referrer','set-cookie':cookieName+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}});}
 return response;
}
