// Narrow finding oversight UI. External Access supplies identity; no token entry or CRM CRUD.
export function operatorConsole(env){
 const nonce=crypto.randomUUID();
 const crm='https://app.hubspot.com/contacts/'+encodeURIComponent(env.STAGING_PORTAL_ID||'')+'/record/0-1/'+encodeURIComponent(env.STAGING_CONTACT_ID||'');
 const html=String.raw`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AI & MAIN — Staging operator console</title>
 <style nonce="${nonce}">body{font:16px system-ui;max-width:960px;margin:2rem auto;padding:0 1rem;background:#f5f6f8;color:#152238}article{background:white;padding:1.2rem;margin:1rem 0;border:1px solid #ccd3dc;border-radius:8px}button,input,select{font:inherit;margin:.3rem;padding:.45rem}blockquote{border-left:3px solid #758ab0;padding-left:1rem;margin:1rem 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f0f2f5;padding:1rem}label{display:block}.warning{color:#8a3500}small{display:block}</style></head><body>
 <h1>AI & MAIN agent operator console</h1><p>Isolated staging · controlled prototype with tested local safeguards</p><p>This console reviews agent findings and exact task proposals. HubSpot remains the system of record.</p><p><a id="crm" target="_blank" rel="noopener noreferrer">Open designated synthetic record in HubSpot</a></p><button id="evaluate">Evaluate designated notes</button><button id="refresh">Refresh findings</button><p id="message" role="status"></p><main id="findings"></main>
 <script nonce="${nonce}">
 const crmURL=${JSON.stringify(crm).replaceAll('<','\\u003c')};document.getElementById('crm').href=crmURL;
 const message=document.getElementById('message'),root=document.getElementById('findings');
 async function api(path,body={}){const r=await fetch('/certification/'+path,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.blocker?data.blocker.code+': '+data.blocker.setupAction:data.status||'Request blocked');return data;}
 function el(tag,text,parent){const e=document.createElement(tag);if(text)e.textContent=text;if(parent)parent.append(e);return e;}
 function button(text,parent,fn){const b=el('button',text,parent);b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){message.textContent=e.message;}finally{b.disabled=false;}});return b;}
 async function refresh(){const data=await api('general/findings');root.replaceChildren();for(const f of data.findings){
  const card=el('article','',root),raw=f.modelFinding;el('h2',raw.classification,card);el('small','Finding '+f.findingId+' · '+raw.opportunityType+' · '+raw.confidence+' confidence · review '+f.reviewState,card);
  for(const evidence of raw.evidence)el('blockquote',evidence.quote,card);
  el('p','Model recommendation for review: '+raw.recommendedNextAction,card);
  const blockers=[...f.inspection.qualityFailures,...f.inspection.executionBlocks];
  if(blockers.length)el('p','Requires source clarification before a task can be prepared: '+blockers.map(x=>x.code.replaceAll('_',' ')).join('; '),card).className='warning';
  const label=el('label','',card),check=el('input','',label);check.type='checkbox';label.append(document.createTextNode(' I have reviewed the source, complete evidence, customer timing and bounded scope.'));
  const dueLabel=el('label','Explicit task due date/time (your browser timezone; preview shows the final UTC timestamp)',card),due=el('input','',dueLabel);due.type='datetime-local';
  const priorityLabel=el('label','Task priority',card),priority=el('select','',priorityLabel);for(const name of ['MEDIUM','HIGH','LOW']){const o=el('option',name,priority);o.value=name;}
  const output=el('pre','No prepared or approved task.',card);let reviewed,grant;
  for(const input of [due,priority,check])input.addEventListener('change',()=>{reviewed=null;grant=null;output.textContent='Inputs changed. Prepare and review a fresh exact task.';});
  const intent={'strong cross-sell opportunity':'prepare_quote','follow-up revenue opportunity':'deferred_follow_up','scope-change opportunity':'scope_change_estimate','retention or service-recovery opportunity':'service_recovery'}[raw.classification];
  const reviewBody=decision=>({findingId:f.findingId,sourceHash:f.sourceHash,candidateHash:f.candidateHash,decision,attestHumanReview:check.checked});
  button('Prepare for review',card,async()=>{if(!check.checked||!due.value)throw Error('Review attestation and explicit due time are required.');if(blockers.length)throw Error('Resolve the listed source/wording concerns and evaluate fresh evidence first.');reviewed=await api('general/review',{...reviewBody('REVIEW'),spec:{intent,priority:priority.value,taskDueAt:new Date(due.value).toISOString(),timing:{kind:'none'},attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}}});grant=null;output.textContent=JSON.stringify({reviewId:reviewed.reviewId,actionVersion:reviewed.actionVersion,payloadHash:reviewed.payloadHash,finalRequest:reviewed.finalRequest},null,2);});
  button('Approve exact task',card,async()=>{if(!check.checked||!reviewed)throw Error('Prepare and inspect the complete final payload first.');grant=await api('general/approve',{operationId:reviewed.operationId,reviewId:reviewed.reviewId,payloadHash:reviewed.payloadHash,actionVersion:reviewed.actionVersion});message.textContent='Exact task approved. Submission still requires the separate staging release gates.';});
  button('Submit approved task',card,async()=>{if(!grant||!reviewed)throw Error('An exact current approval is required.');const result=await api('general/execute',{operationId:reviewed.operationId,approvalId:grant.approvalId});output.textContent=JSON.stringify(result,null,2);});
  for(const decision of ['DEFER','DECLINE'])button(decision==='DEFER'?'Defer':'Decline',card,async()=>{if(!check.checked)throw Error('Review attestation is required.');await api('general/review',reviewBody(decision));grant=null;reviewed=null;await refresh();});
 }if(!data.findings.length)el('p','No findings. Evaluation reads only the designated synthetic staging context.',root);}
 document.getElementById('evaluate').addEventListener('click',async()=>{try{message.textContent='Evaluating designated synthetic notes…';await api('general/evaluate');await refresh();message.textContent='Evaluation complete. This does not approve or execute an action.';}catch(e){message.textContent=e.message;}});
 document.getElementById('refresh').addEventListener('click',()=>refresh().catch(e=>{message.textContent=e.message;}));refresh().catch(e=>{message.textContent=e.message;});
 </script></body></html>`;
 return new Response(html,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
}
