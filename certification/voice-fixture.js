// Independent local HTTP/SQLite effects, never a HubSpot or speech-model service.
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
export async function voiceFixture(path){
 const db=new DatabaseSync(path);db.exec('CREATE TABLE notes(id TEXT PRIMARY KEY,body TEXT NOT NULL); CREATE TABLE attempts(sequence INTEGER PRIMARY KEY,body TEXT NOT NULL)');
 let dropNext=false,hidden=false,transcriptions=0,reasonCalls=0,unexpectedWrites=0;
 const texts=['Synthetic test data only. The fictional customer requested pricing for exactly three additional garage outlets while the crew was onsite. Establish pricing before any additional work. No additional work scheduling customer contact or billing was authorized. No price or deadline was agreed.','Synthetic test data only. The fictional customer requested pricing for one Level 2 EV charger. Pricing information only. No appointment, installation or customer contact was authorized.'];
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://fixture'),send=(body,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
  const bytes=[];for await(const part of req)bytes.push(part);const raw=Buffer.concat(bytes);
  if(url.pathname==='/v1/audio/transcriptions'){
   if(req.headers.authorization!=='Bearer local-eval')return send({error:'wrong_fixture_provider_credential'},401);
   const form=await new Request('http://fixture',{method:'POST',headers:{'content-type':req.headers['content-type']},body:raw}).formData();if(form.get('model')!=='gpt-4o-mini-transcribe'||!form.get('file')?.size)return send({error:'invalid_speech_fixture_request'},400);
   return send({text:texts[Math.min(transcriptions++,1)]});
  }
  if(url.pathname==='/model/responses'){
   if(req.headers.authorization!=='Bearer local-eval')return send({error:'wrong_fixture_provider_credential'},401);reasonCalls++;
   const context=JSON.parse(JSON.parse(raw).input),findings=context.serviceHistory.map(n=>{const scope=n.note.includes('three additional garage outlets'),quote=scope?'The fictional customer requested pricing for exactly three additional garage outlets while the crew was onsite.':'The fictional customer requested pricing for one Level 2 EV charger.';
    const qualifiers=['AI & MAIN SYNTHETIC VOICE NOTE — TEST DATA ONLY.','Synthetic test data only.',...(scope?['Establish pricing before any additional work.','No additional work scheduling customer contact or billing was authorized.','No price or deadline was agreed.']:['Pricing information only.','No appointment, installation or customer contact was authorized.'])];
    return {opportunityKey:scope?'garage-three-outlets':'ev-charger-pricing',classification:scope?'scope-change opportunity':'strong cross-sell opportunity',opportunityType:scope?'scope change':'cross-sell',confidence:'high',evidence:[quote,...qualifiers].map(quote=>({noteId:n.noteId,quote})),reasoningSummary:'Local fixture response with all expected source restrictions; not fresh model inference.',recommendedNextAction:scope?'Internally verify current job status and preserve pricing before additional work.':'Internally prepare requested pricing only.',humanReviewRequired:true};});
   return send({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({findings})}]}]});
  }
  const writerIdentity=url.pathname==='/account-info/v3/details'&&req.headers.authorization==='Bearer local-write';
  if(!writerIdentity&&req.headers.authorization!=='Bearer '+(req.method==='POST'?'local-write':'local-read'))return send({error:'wrong_fixture_crm_credential'},401);
  if(url.pathname==='/account-info/v3/details')return send({portalId:'voice-fixture-portal'});
  if(url.pathname.startsWith('/crm/v3/objects/contacts/'))return send({id:'voice-fixture-contact',properties:{firstname:'AI_MAIN_CERTIFICATION_ONLY'}});
  if(url.pathname==='/crm/v4/associations/notes/contacts/labels')return send({results:[{category:'HUBSPOT_DEFINED',typeId:202,label:null}]});
  if(url.pathname.includes('/associations/notes'))return send({results:hidden?[]:db.prepare('SELECT id FROM notes').all().map(n=>({toObjectId:n.id}))});
  if(url.pathname==='/crm/v3/objects/notes'&&req.method==='POST'){
   const body=JSON.parse(raw);db.prepare('INSERT INTO attempts(body) VALUES(?)').run(raw.toString());const id='local-voice-note-'+(db.prepare('SELECT count(*) AS n FROM notes').get().n+1);db.prepare('INSERT INTO notes VALUES(?,?)').run(id,JSON.stringify(body));
   if(dropNext){dropNext=false;req.socket.destroy();return;}return send({id},201);
  }
  if(url.pathname.startsWith('/crm/v3/objects/notes/')){const row=db.prepare('SELECT * FROM notes WHERE id=?').get(url.pathname.split('/').at(-1));if(!row)return send({error:'not_found'},404);const body=JSON.parse(row.body);return send({id:row.id,properties:body.properties,associations:{contacts:{results:body.associations.map(a=>({id:a.to.id}))}}});}
  if(req.method!=='GET')unexpectedWrites++;return send({error:'unsupported_fixture_route'},404);
 }catch{res.writeHead(500,{'content-type':'application/json'});res.end('{"error":"local_fixture_failure"}');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {base:'http://127.0.0.1:'+server.address().port,texts,dropNext:()=>{dropNext=true;},hide:value=>{hidden=value;},summary:()=>({notes:db.prepare('SELECT count(*) AS n FROM notes').get().n,createAttempts:db.prepare('SELECT count(*) AS n FROM attempts').get().n,transcriptions,reasonCalls,unexpectedWrites}),notes:()=>db.prepare('SELECT * FROM notes').all().map(r=>({id:r.id,body:JSON.parse(r.body)})),async close(){server.closeAllConnections();await new Promise(r=>server.close(r));db.close();}};
}
