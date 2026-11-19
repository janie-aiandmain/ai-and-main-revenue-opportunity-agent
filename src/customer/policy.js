import {closedFlags} from '../diy/hubspot-profile.js';
import {verifyIdentity} from '../staging/auth.js';
import {createHash} from 'node:crypto';
export const CUSTOMER_HUBSPOT_CONTRACT='hubspot-owner-readonly-v1';
export const CONNECTION_POLICY='hubspot-oauth-connection-v1';
export const RECORD_POLICY='explicit-hubspot-record-permission-v1';
export const OWNER_ROLE_POLICY='verified-access-owner-email-v1';
export const READ_SCOPES=new Set(['oauth','crm.objects.contacts.read','crm.objects.notes.read']);
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
export const random=()=>{const b=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');};
export const numeric=value=>typeof value==='string'&&/^[1-9]\d{0,19}$/.test(value);
export const connectionBinding=env=>createHash('sha256').update(JSON.stringify({policy:CONNECTION_POLICY,ownerRolePolicy:OWNER_ROLE_POLICY,installation:env.HUBSPOT_INSTALLATION_ID,portal:env.HUBSPOT_EXPECTED_PORTAL_ID,origin:env.HUBSPOT_PUBLIC_ORIGIN,client:env.HUBSPOT_OAUTH_CLIENT_ID,issuer:env.ACCESS_ISSUER,audience:env.ACCESS_AUDIENCE,owner:env.HUBSPOT_OWNER_EMAIL?.toLowerCase(),synthetic:env.HUBSPOT_SYNTHETIC_RECORDS_ONLY,scopes:(env.HUBSPOT_OAUTH_SCOPES??'').split(/\s+/).filter(Boolean).sort()})).digest('hex');
export function customerConfiguration(env){
 if(env.HUBSPOT_CUSTOMER_CONTRACT!==CUSTOMER_HUBSPOT_CONTRACT||env.DEPLOYMENT_ENVIRONMENT!=='customer'||closedFlags.some(f=>env[f]!=='false'))throw Error('customer_connector_requires_closed_effects');
 const origin=new URL(env.HUBSPOT_PUBLIC_ORIGIN);
 if(origin.protocol!=='https:'||origin.origin!==env.HUBSPOT_PUBLIC_ORIGIN)throw Error('customer_public_https_origin_required');
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(env.HUBSPOT_INSTALLATION_ID??'')||!numeric(env.HUBSPOT_EXPECTED_PORTAL_ID))throw Error('approved_installation_and_portal_required');
 if(!['true','false'].includes(env.HUBSPOT_SYNTHETIC_RECORDS_ONLY)||env.HUBSPOT_TENANT_REVIEWED!=='true')throw Error('customer_tenant_review_required');
 const max=Number(env.HUBSPOT_MAX_PERMITTED_RECORDS??25);if(!Number.isInteger(max)||max<1||max>100)throw Error('permitted_record_limit_invalid');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.HUBSPOT_OWNER_EMAIL??''))throw Error('verified_owner_email_required');
 if(!env.ACCESS_ISSUER||!env.ACCESS_AUDIENCE)throw Error('customer_external_identity_required');
 return {origin:origin.origin,installationId:env.HUBSPOT_INSTALLATION_ID,portalId:env.HUBSPOT_EXPECTED_PORTAL_ID,synthetic:env.HUBSPOT_SYNTHETIC_RECORDS_ONLY==='true',maximumRecords:max};
}
export function oauthConfiguration(env){
 const cfg=customerConfiguration(env);
 if(!env.HUBSPOT_OAUTH_CLIENT_ID||!env.HUBSPOT_OAUTH_CLIENT_SECRET||!env.HUBSPOT_TOKEN_ENCRYPTION_KEY)throw Error('hubspot_oauth_secure_configuration_missing');
 const scopes=(env.HUBSPOT_OAUTH_SCOPES??'').split(/\s+/).filter(Boolean);
 if(!scopes.length||!scopes.includes('oauth')||!scopes.includes('crm.objects.contacts.read')||scopes.some(s=>!READ_SCOPES.has(s))||env.HUBSPOT_OAUTH_APP_READ_ONLY_CONFIRMED!=='true')throw Error('hubspot_read_only_app_scope_review_required');
 return {...cfg,scopes:[...new Set(scopes)].sort(),redirectUri:cfg.origin+'/hubspot/oauth/callback'};
}
export async function customerActor(request,env){
 const identity=await verifyIdentity(request,env);
 // Decode an email only AFTER the exact selected JWT has passed full verification.
 const header=request.headers.get('Authorization')||'Bearer '+request.headers.get('Cf-Access-Jwt-Assertion');
 const body=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(header.slice(7).split('.')[1].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0))));
 const roles=JSON.parse(env.APPROVER_SUBJECTS_JSON||'{}');
 const owner=typeof body.email==='string'&&body.email.toLowerCase()===env.HUBSPOT_OWNER_EMAIL.toLowerCase()&&body.email_verified!==false;
 const role=owner?'Admin':roles[identity.subject];if(!['Viewer','Approver','Admin'].includes(role))throw Error('customer_role_denied');
 return {...identity,role,owner,authorityHash:await digest(JSON.stringify({subject:identity.subject,issuer:identity.issuer,audience:identity.audience,role}))};
}
export function requireRole(actor,roles){if(actor?.kind!=='EXTERNAL_VERIFIED'||!roles.includes(actor.role)||actor.expiresAt<=Date.now())throw Error('customer_verified_role_required');}
export function contactFromLink(link,portal){
 let u;try{u=new URL(link);}catch{throw Error('hubspot_contact_link_required');}
 if(u.protocol!=='https:'||!/^app(?:-[a-z0-9]+)?\.hubspot\.com$/.test(u.hostname)||u.username||u.password||u.port)throw Error('hubspot_contact_link_required');
 const m=u.pathname.match(/^\/contacts\/(\d+)\/record\/0-1\/(\d+)\/?$/);
 if(!m||!numeric(m[1])||!numeric(m[2]))throw Error('supported_hubspot_contact_record_link_required');
 if(m[1]!==portal)throw Error('portal_mismatch');return m[2];
}
export const publicConnection=s=>({state:s.state,portalId:s.portalId??null,generation:s.generation??0,connected:s.state==='CONNECTED',lastCheck:s.lastCheck??null});
