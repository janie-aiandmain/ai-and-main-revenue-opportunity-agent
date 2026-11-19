// Portable, read-only test installation. This is not customer production release.
import {operatorGateway} from '../release/gateway.js';
import {verifyOperator} from '../staging/auth.js';
import {assertCustomerPreview} from './hubspot-profile.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
const allowed=new Set(['/identity','/certification/preflight','/certification/session','/certification/general/evaluate','/certification/general/findings']);
export async function customerPreviewFetch(request,env){
 try{assertCustomerPreview(env);}catch(error){return json({status:error.message,customerReleaseApproved:false},503);}
 const path=new URL(request.url).pathname;
 if(path==='/'||path==='/operator'){
  if(request.method!=='GET')return json({status:'get_required'},405);
  try{await verifyOperator(request,env);}catch{return json({status:'verified_customer_operator_required'},401);}
  return previewConsole(env);
 }
 if(!allowed.has(path))return json({status:'customer_preview_read_only_route',customerReleaseApproved:false},403);
 return operatorGateway(request,env);
}
function previewConsole(env){
 const nonce=crypto.randomUUID(),link='https://app.hubspot.com/contacts/'+env.STAGING_PORTAL_ID+'/record/0-1/'+env.STAGING_CONTACT_ID;
 return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Revenue Rescue — Private evaluation</title><style nonce="${nonce}">body{font:17px system-ui;max-width:850px;margin:3rem auto;padding:0 1rem;color:#173042}button{font:inherit;padding:.8rem;margin:.3rem}article{border:1px solid #bccad1;border-radius:12px;padding:1rem;margin:1rem 0}blockquote{border-left:3px solid #497387;padding-left:1rem}#message{white-space:pre-wrap}</style><h1>Revenue Rescue</h1><p>Private HubSpot evaluation · synthetic test record only</p><p>This installation reads one approved test record and shows findings for review. Notes, tasks, email and customer actions are disabled.</p><p><a href="${link}" target="_blank" rel="noopener">Open the designated test record in HubSpot</a></p><button id="check">Check connection</button><button id="evaluate">Evaluate test notes</button><button id="refresh">Refresh findings</button><p id="message" role="status" aria-live="polite"></p><main id="findings"></main><script nonce="${nonce}">
 const message=document.getElementById('message'),root=document.getElementById('findings');
 async function call(action){const r=await fetch('/certification/'+action,{method:'POST',headers:{'content-type':'application/json'},body:'{}'}),d=await r.json();if(!r.ok)throw Error(d.status||'Request blocked');return d;}
 function text(tag,value,parent){const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;}
 async function refresh(){const d=await call('general/findings');root.replaceChildren();for(const f of d.findings){const a=text('article','',root),m=f.modelFinding;text('h2',m.classification,a);text('p','Finding '+f.findingId+' · human review '+f.reviewState,a);text('p',m.recommendedNextAction,a);for(const e of m.evidence){const dated=m.proposedAction?.material?.evidence?.find(x=>x.noteId===e.noteId&&x.quote===e.quote);text('p','Source '+e.noteId+' · '+(dated?.timestamp||e.timestamp||'timestamp unavailable — inspect source before review'),a);text('blockquote',e.quote,a);}text('p','No action approved or executed.',a);}if(!d.findings.length)text('p','No findings are currently saved.',root);}
 for(const [id,fn]of [['check',async()=>{message.textContent=JSON.stringify(await call('preflight'),null,2);}],['evaluate',async()=>{message.textContent='Evaluating test notes. This uses the configured model and may incur API charges.';await call('general/evaluate');await refresh();message.textContent='Evaluation complete. Findings require human review; no CRM action occurred.';}],['refresh',refresh]])document.getElementById(id).onclick=async()=>{const b=document.getElementById(id);b.disabled=true;try{await fn();}catch(e){message.textContent=e.message;}finally{b.disabled=false;}};
 refresh().catch(e=>{message.textContent=e.message;});
 </script></html>`,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",'x-content-type-options':'nosniff'}});
}
export default {fetch:customerPreviewFetch};
