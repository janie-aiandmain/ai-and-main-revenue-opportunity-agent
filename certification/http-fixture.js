import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
export async function startFixture(path){
  const db=new DatabaseSync(path);db.exec(`CREATE TABLE tasks(id TEXT PRIMARY KEY,body TEXT NOT NULL,correlation TEXT NOT NULL);CREATE TABLE attempts(id INTEGER PRIMARY KEY,correlation TEXT NOT NULL,body TEXT NOT NULL);CREATE TABLE outcomes(ref TEXT PRIMARY KEY,task_id TEXT NOT NULL,amount INTEGER NOT NULL,currency TEXT NOT NULL);`);
  let noteContext=[],modelFindings=[],modelCalls=0;
  const modes=new Map(),hidden=new Set(),held=new Set(),identityReads=[];let readsUnavailable=false;
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://fixture');const send=(body,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
    if(url.pathname==='/model/responses'){
      if(req.method!=='POST'||req.headers.authorization!=='Bearer local-eval')return send({error:'model_fixture_auth'},401);
      let text='';for await(const chunk of req)text+=chunk;const request=JSON.parse(text),input=JSON.parse(request.input);
      modelCalls++;
      if(JSON.stringify(input.serviceHistory)!==JSON.stringify(noteContext))return send({error:'fixture_model_context_mismatch'},409);
      return send({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({findings:modelFindings})}]}]});
    }
    const writerIdentityRead=req.method==='GET'&&url.pathname==='/account-info/v3/details'&&req.headers.authorization==='Bearer local-write';
    if(!writerIdentityRead&&req.headers.authorization!=='Bearer '+(req.method==='POST'?'local-write':'local-read'))return send({error:'fixture_auth'},401);
    if(url.pathname==='/account-info/v3/details'){identityReads.push({credential:writerIdentityRead?'write_identity_only':'read',portalId:'test-portal-001'});return send({portalId:'test-portal-001'});}
    if(url.pathname.startsWith('/crm/v3/objects/contacts/'))return send({id:'fixture-contact-001',properties:{firstname:'AI_MAIN_CERTIFICATION_ONLY'}});
    if(url.pathname.startsWith('/crm/v4/objects/contacts/')&&url.pathname.includes('/associations/notes'))return send({results:noteContext.map(n=>({toObjectId:n.noteId}))});
    if(url.pathname.startsWith('/crm/v4/objects/contacts/')&&url.pathname.includes('/associations/tasks')){if(readsUnavailable)return send({error:'fixture_lookup_unavailable'},503);return send({results:db.prepare('SELECT * FROM tasks').all().filter(r=>!hidden.has(r.correlation)).map(r=>({toObjectId:r.id}))});}
    if(url.pathname.startsWith('/crm/v3/objects/notes/')){
      const note=noteContext.find(n=>n.noteId===decodeURIComponent(url.pathname.split('/').at(-1)));
      return note?send({id:note.noteId,properties:{hs_timestamp:note.timestamp,hs_note_body:note.note}}):send({error:'missing_note'},404);
    }
    if(url.pathname==='/crm/v3/objects/tasks'&&req.method==='POST'){
      let text='';for await(const chunk of req)text+=chunk;const body=JSON.parse(text),correlation=body.properties.hs_task_body.match(/\[AI_MAIN_CORRELATION:([^\]]+)\]/)?.[1];
      if(!correlation)return send({error:'missing_correlation'},400);
      db.prepare('INSERT INTO attempts(correlation,body) VALUES(?,?)').run(correlation,text);
      const mode=modes.get(correlation)||'normal';
      if(mode==='drop-without-create'){req.socket.destroy();return;}
      const id='fixture-task-'+(Number(db.prepare('SELECT count(*) AS n FROM tasks').get().n)+1);
      db.prepare('INSERT INTO tasks VALUES(?,?,?)').run(id,text,correlation);
      if(mode==='create-drop'){req.socket.destroy();return;}
      if(mode==='create-hold'){held.add(res);res.on('close',()=>held.delete(res));return;}
      return send({id,properties:body.properties},201);
    }
    if(url.pathname.startsWith('/crm/v3/objects/tasks')){
      if(readsUnavailable)return send({error:'fixture_lookup_unavailable'},503);
      const rows=db.prepare('SELECT * FROM tasks').all().filter(r=>!hidden.has(r.correlation));
      const serialize=r=>{const body=JSON.parse(r.body);return {id:r.id,properties:body.properties,associations:{contacts:{results:body.associations.map(a=>({id:a.to.id}))}}};};
      if(url.pathname==='/crm/v3/objects/tasks')return send({results:rows.map(serialize)});
      const id=decodeURIComponent(url.pathname.split('/').at(-1)),task=rows.find(r=>r.id===id);return task?send(serialize(task)):send({error:'missing'},404);
    }
    if(url.pathname.startsWith('/certification/outcomes/')){
      const ref=decodeURIComponent(url.pathname.split('/').at(-1)),event=db.prepare('SELECT * FROM outcomes WHERE ref=?').get(ref);
      return event?send({verified:true,externalRef:ref,taskId:event.task_id,amountMinor:event.amount,currency:event.currency}):send({error:'missing_outcome'},404);
    }
    send({error:'not_found'},404);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {base:'http://127.0.0.1:'+server.address().port,setMode:(c,m)=>modes.set(c,m),hide:c=>hidden.add(c),reveal:c=>hidden.delete(c),setLookupUnavailable:v=>{readsUnavailable=v;},
    setContext:(notes,findings)=>{noteContext=structuredClone(notes);modelFindings=structuredClone(findings);},modelCalls:()=>modelCalls,identityChecks:()=>structuredClone(identityReads),attempts:c=>db.prepare('SELECT * FROM attempts WHERE correlation=?').all(c).length,
    tasks:c=>db.prepare('SELECT * FROM tasks WHERE correlation=?').all(c),
    allTasks:()=>db.prepare('SELECT * FROM tasks').all().map(r=>({id:r.id,correlation:r.correlation,body:JSON.parse(r.body)})),
    outcome:(ref,taskId)=>db.prepare('INSERT INTO outcomes VALUES(?,?,?,?)').run(ref,taskId,25000,'USD'),
    async close(){for(const r of held)r.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();}};
}
