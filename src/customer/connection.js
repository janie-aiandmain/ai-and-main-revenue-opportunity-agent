import {oauthConfiguration,customerConfiguration,CONNECTION_POLICY,RECORD_POLICY,digest,random,requireRole,contactFromLink,publicConnection,connectionBinding} from './policy.js';
import {sealTokens,openTokens} from './token-box.js';
import {checkedJsonFetch,StagingBlocker} from '../staging/blockers.js';
const CREDENTIAL='HUBSPOT_OAUTH_CONNECTION';
export class HubSpotConnection {
 constructor(db,env,{flush=async()=>{}}={}){
  this.db=db;this.env=env;this.flush=flush;
  db.exec(`CREATE TABLE IF NOT EXISTS hubspot_connection(id TEXT PRIMARY KEY,data_json TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS hubspot_oauth_states(state_hash TEXT PRIMARY KEY,actor_hash TEXT NOT NULL,browser_hash TEXT NOT NULL,generation INTEGER NOT NULL,expires_at INTEGER NOT NULL,verifier_box TEXT NOT NULL,used INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS hubspot_permitted_records(contact_id TEXT PRIMARY KEY,generation INTEGER NOT NULL,permission_version TEXT NOT NULL,actor_hash TEXT NOT NULL,created_at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS hubspot_connection_audit(sequence INTEGER PRIMARY KEY,event TEXT NOT NULL,generation INTEGER NOT NULL,actor_hash TEXT,contact_id TEXT,at TEXT NOT NULL);`);
  if(!db.prepare('SELECT id FROM hubspot_connection WHERE id=?').get('current'))this.save({state:'DISCONNECTED',generation:0});
 }
 state(){const s=JSON.parse(this.db.prepare('SELECT data_json FROM hubspot_connection WHERE id=?').get('current').data_json);if(['CONNECTED','REFRESHING'].includes(s.state)&&s.configurationHash!==connectionBinding(this.env)){const next={state:'RECONNECT_REQUIRED',generation:s.generation+1,portalId:s.portalId};this.save(next);this.db.prepare('DELETE FROM hubspot_permitted_records').run();this.db.prepare('DELETE FROM hubspot_oauth_states').run();return next;}return s;}
 save(value){this.db.prepare('INSERT INTO hubspot_connection VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json').run('current',JSON.stringify(value));}
 audit(event,actor=null,contact=null){this.db.prepare('INSERT INTO hubspot_connection_audit(event,generation,actor_hash,contact_id,at) VALUES(?,?,?,?,?)').run(event,this.state().generation,actor?.authorityHash??null,contact,new Date().toISOString());}
 status(){const s=this.state();return {...publicConnection(s),scopeVerification:s.scopeVerification??'NOT_CONNECTED',contractVersion:CONNECTION_POLICY,recordPolicy:RECORD_POLICY,records:this.records(),customerReleaseApproved:false,CRMEffectsEnabled:false};}
 records(){const s=this.state();return s.state==='CONNECTED'?this.db.prepare('SELECT contact_id,generation,permission_version,created_at FROM hubspot_permitted_records WHERE generation=? ORDER BY contact_id').all(s.generation).map(r=>({contactId:r.contact_id,permissionVersion:r.permission_version,addedAt:r.created_at})):[];}
 async begin(actor){
  requireRole(actor,['Admin']);const cfg=oauthConfiguration(this.env),state=random(),browser=random(),stateHash=await digest(state),browserHash=await digest(browser),verifier=random();
  // Validate key configuration before asking the owner to leave the application.
  const verifierBox=await sealTokens({verifier},this.env),challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  this.db.transaction(()=>{this.db.prepare('DELETE FROM hubspot_oauth_states WHERE expires_at<=? OR actor_hash=?').run(Date.now(),actor.authorityHash);this.db.prepare('INSERT INTO hubspot_oauth_states(state_hash,actor_hash,browser_hash,generation,expires_at,verifier_box) VALUES(?,?,?,?,?,?)').run(stateHash,actor.authorityHash,browserHash,this.state().generation,Date.now()+600000,verifierBox);});await this.flush();
  const u=new URL('https://app.hubspot.com/oauth/authorize');u.searchParams.set('client_id',this.env.HUBSPOT_OAUTH_CLIENT_ID);u.searchParams.set('redirect_uri',cfg.redirectUri);u.searchParams.set('scope',cfg.scopes.join(' '));u.searchParams.set('state',state);u.searchParams.set('code_challenge',challenge);u.searchParams.set('code_challenge_method','S256');
  return {authorizationUrl:u.href,browserCookie:browser};
 }
 async callback({state,code,error,browserCookie},actor){
  requireRole(actor,['Admin']);const cfg=oauthConfiguration(this.env);
  if(typeof state!=='string'||state.length>100||typeof browserCookie!=='string'||browserCookie.length>100)throw Error('oauth_state_or_browser_binding_invalid');
  const h=await digest(state),b=await digest(browserCookie);let generation,verifierBox;
  this.db.transaction(()=>{const row=this.db.prepare('SELECT * FROM hubspot_oauth_states WHERE state_hash=?').get(h);if(!row||row.used||row.expires_at<=Date.now()||row.actor_hash!==actor.authorityHash||row.browser_hash!==b||row.generation!==this.state().generation)throw Error('oauth_state_expired_changed_or_replayed');generation=row.generation;verifierBox=row.verifier_box;this.db.prepare('UPDATE hubspot_oauth_states SET used=1 WHERE state_hash=?').run(h);});await this.flush();
  if(error){this.audit('OWNER_DECLINED_HUBSPOT_CONNECTION',actor);throw Error('hubspot_connection_not_authorized');}
  if(typeof code!=='string'||!code||code.length>4096)throw Error('oauth_authorization_code_required');
  try{
   const {verifier}=await openTokens(verifierBox,this.env),tokens=await this.exchange({grant_type:'authorization_code',code,code_verifier:verifier,redirect_uri:cfg.redirectUri});
   const portal=await this.directGet('/account-info/v3/details',tokens.access_token);
   if(String(portal.portalId)!==cfg.portalId)throw new StagingBlocker('portal_mismatch',{credential:CREDENTIAL,check:'owner_authorized_account_differs_from_expected_portal'});
   const box=await sealTokens(tokens,this.env);requireRole(actor,['Admin']);
   this.db.transaction(()=>{if(this.state().generation!==generation)throw Error('connection_changed_during_authorization');this.save({state:'CONNECTED',generation:generation+1,portalId:cfg.portalId,tokenBox:box,configurationHash:connectionBinding(this.env),lastCheck:new Date().toISOString(),scopeVerification:tokens.scopeVerification});this.db.prepare('DELETE FROM hubspot_permitted_records').run();this.audit('PORTAL_VERIFIED_OAUTH_CONNECTION_STORED_ENCRYPTED',actor);});await this.flush();return this.status();
  }catch(error){this.audit('OAUTH_CONNECTION_REJECTED_NO_CRM_EFFECT',actor);throw error;}
 }
 async exchange(fields){
  const cfg=oauthConfiguration(this.env),body=new URLSearchParams({...fields,client_id:this.env.HUBSPOT_OAUTH_CLIENT_ID,client_secret:this.env.HUBSPOT_OAUTH_CLIENT_SECRET});
  const data=await checkedJsonFetch('https://api.hubapi.com/oauth/v1/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(20000)},CREDENTIAL,'oauth_token_exchange');
  if(typeof data.access_token!=='string'||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<=0||data.expires_in>86400||(data.token_type&&data.token_type.toLowerCase()!=='bearer'))throw Error('oauth_token_response_invalid');
  const scopes=typeof data.scope==='string'?data.scope.split(/\s+/).filter(Boolean):Array.isArray(data.scopes)?data.scopes:null;
  if(scopes&&(!scopes.length||scopes.some(s=>!cfg.scopes.includes(s))||cfg.scopes.some(s=>!scopes.includes(s))))throw Error('oauth_returned_unapproved_or_missing_scopes');
  if(fields.grant_type==='authorization_code'&&(typeof data.refresh_token!=='string'||!data.refresh_token))throw Error('oauth_refresh_token_missing');
  return {access_token:data.access_token,refresh_token:data.refresh_token??fields.refresh_token,expiresAt:Date.now()+data.expires_in*1000,scopeVerification:scopes?'RETURNED_SCOPES_WITHIN_APPROVED_READ_SET':'APP_CONFIGURATION_REVIEW_REQUIRED_NO_TOKEN_SCOPE_CLAIM'};
 }
 async accessToken(){
  const s=this.state();if(s.state!=='CONNECTED')throw Error(s.state==='REFRESHING'?'hubspot_connection_refresh_in_progress':'hubspot_connection_required');
  let tokens;try{tokens=await openTokens(s.tokenBox,this.env);}catch(error){this.disconnectInternal('RECONNECT_REQUIRED');throw error;}if(tokens.expiresAt>Date.now()+60000)return tokens.access_token;
  const refreshId=random();this.db.transaction(()=>{const current=this.state();if(current.state!=='CONNECTED'||current.generation!==s.generation||current.tokenBox!==s.tokenBox)throw Error('connection_changed_before_refresh');this.save({...s,state:'REFRESHING',refreshId});});await this.flush();
  try{
   const next=await this.exchange({grant_type:'refresh_token',refresh_token:tokens.refresh_token}),portal=await this.directGet('/account-info/v3/details',next.access_token);
   if(String(portal.portalId)!==s.portalId)throw Error('portal_mismatch');const tokenBox=await sealTokens(next,this.env),current=this.state();
   if(current.generation!==s.generation||current.state!=='REFRESHING'||current.refreshId!==refreshId)throw Error('connection_changed_during_refresh');
   this.save({...s,state:'CONNECTED',tokenBox,lastCheck:new Date().toISOString()});await this.flush();return next.access_token;
  }catch(error){if(this.state().generation===s.generation)this.disconnectInternal('RECONNECT_REQUIRED');this.audit('TOKEN_REFRESH_FAILED_RECONNECT_REQUIRED');throw error;}
 }
 async directGet(path,token){return checkedJsonFetch('https://api.hubapi.com'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)},CREDENTIAL,path);}
 async get(path,generation=this.state().generation){
  const s=this.state();if(s.generation!==generation||s.state!=='CONNECTED')throw Error('connection_changed_or_disconnected');
  if(!/^\/(?:account-info\/v3\/details|crm\/v3\/objects\/contacts\/\d+\?properties=firstname|crm\/v4\/objects\/contacts\/\d+\/associations\/notes\?limit=100(?:&after=[^&]*)?|crm\/v3\/objects\/notes\/\d+\?properties=hs_note_body,hs_timestamp)$/.test(path))throw Error('hubspot_read_path_not_allowed');
  const token=await this.accessToken();if(this.state().generation!==generation||this.state().state!=='CONNECTED')throw Error('connection_changed_before_read');let result;try{result=await this.directGet(path,token);}catch(error){if(error instanceof StagingBlocker&&error.code==='rejected_credential'&&this.state().generation===generation)this.disconnectInternal('RECONNECT_REQUIRED');throw error;}
  if(this.state().generation!==generation||this.state().state!=='CONNECTED')throw Error('connection_changed_during_read');return result;
 }
 membership(id,generation=this.state().generation,permissionVersion=null){
  const s=this.state(),row=this.db.prepare('SELECT * FROM hubspot_permitted_records WHERE contact_id=?').get(id);
  if(s.state!=='CONNECTED'||s.generation!==generation||!row||row.generation!==generation||(permissionVersion&&row.permission_version!==permissionVersion))throw Error('record_permission_missing_or_changed');return row;
 }
 async add(link,actor){
  requireRole(actor,['Admin']);const cfg=customerConfiguration(this.env),s=this.state();if(s.state!=='CONNECTED')throw Error('hubspot_connection_required');const id=contactFromLink(link,s.portalId);
  const contact=await this.get('/crm/v3/objects/contacts/'+id+'?properties=firstname',s.generation);if(String(contact.id)!==id||(cfg.synthetic&&contact.properties?.firstname!=='AI_MAIN_CERTIFICATION_ONLY'))throw new StagingBlocker('contact_mismatch',{check:'selected_contact_identity_and_required_marker'});
  requireRole(actor,['Admin']);if(this.state().generation!==s.generation)throw Error('connection_changed_during_record_permission');
  const existing=this.db.prepare('SELECT contact_id FROM hubspot_permitted_records WHERE contact_id=?').get(id);if(!existing&&this.records().length>=cfg.maximumRecords)throw Error('permitted_record_limit_reached');
  if(!existing){this.db.prepare('INSERT INTO hubspot_permitted_records VALUES(?,?,?,?,?)').run(id,s.generation,random(),actor.authorityHash,new Date().toISOString());this.audit('EXPLICIT_RECORD_PERMISSION_GRANTED',actor,id);}await this.flush();return this.status();
 }
 async remove(id,actor){requireRole(actor,['Admin']);this.membership(id);this.db.prepare('DELETE FROM hubspot_permitted_records WHERE contact_id=?').run(id);this.audit('RECORD_PERMISSION_REVOKED',actor,id);await this.flush();return this.status();}
 disconnectInternal(state='DISCONNECTED'){const s=this.state();this.save({state,generation:s.generation+1,portalId:s.portalId??null});this.db.prepare('DELETE FROM hubspot_permitted_records').run();this.db.prepare('DELETE FROM hubspot_oauth_states').run();}
 async disconnect(actor){requireRole(actor,['Admin']);this.disconnectInternal();this.audit('LOCAL_DISCONNECT_TOKENS_ERASED',actor);await this.flush();return {...this.status(),providerGrantRevocation:'Remove the app in HubSpot to revoke its provider-side grant.'};}
 recover(){if(this.state().state==='REFRESHING'){this.disconnectInternal('RECONNECT_REQUIRED');this.audit('RESTART_DURING_REFRESH_RECONNECT_REQUIRED');}}
}
