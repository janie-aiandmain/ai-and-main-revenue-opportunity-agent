// Preparation only: no credentials, deployments or remote calls.
import {executionFlags} from '../voice/contract.js';
import {tenantConfiguration} from '../release/tenant.js';
export const DIY_HUBSPOT_PROFILE='revenue-rescue-hubspot-shadow-v1';
export const closedFlags=[...executionFlags,'VOICE_NOTE_WRITES_ENABLED','VOICE_NOTE_RELEASE_APPROVED','VOICE_NOTE_RESPONSE_LOSS_TEST_ENABLED','VOICE_INTAKE_ENABLED','OPERATOR_EMAIL_ENABLED'];
const allowed=new Set(['cloudflareAccountId','workerName','portalId','contactId','accessIssuer','accessAudience','roles','nonProductionPortalConfirmed','tenantReviewed']);
export function customerPreviewConfig(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.has(k)))throw Error('configuration_fields_invalid_no_credentials_allowed');
 if(!/^[a-f0-9]{32}$/.test(input.cloudflareAccountId??''))throw Error('cloudflare_account_id_required');
 if(!/^[a-z0-9][a-z0-9-]{1,62}$/.test(input.workerName??'')||input.workerName.startsWith('ai-and-main-revenue-opportunity-'))throw Error('separate_customer_worker_name_required');
 if(!/^[1-9]\d*$/.test(input.portalId??'')||! /^[1-9]\d*$/.test(input.contactId??''))throw Error('numeric_customer_portal_and_contact_required');
 if(input.portalId==='247646122'||input.contactId==='582095692487')throw Error('vendor_demo_must_not_be_reused');
 if(input.nonProductionPortalConfirmed!==true)throw Error('nonproduction_customer_test_portal_required');
 let issuer;try{issuer=new URL(input.accessIssuer);}catch{throw Error('customer_access_issuer_required');}
 if(issuer.protocol!=='https:'||!issuer.hostname.endsWith('.cloudflareaccess.com')||issuer.origin!==input.accessIssuer)throw Error('customer_access_issuer_required');
 if(!/^[a-f0-9]{64}$/.test(input.accessAudience??''))throw Error('customer_access_audience_required');
 const roles=input.roles??{};if(!roles||typeof roles!=='object'||Array.isArray(roles)||Object.entries(roles).some(([sub,role])=>! /^[a-zA-Z0-9_-]{1,128}$/.test(sub)||['__proto__','constructor','prototype'].includes(sub)||!['Viewer','Approver','Admin'].includes(role)))throw Error('verified_subject_role_mapping_required');
 return {$schema:'node_modules/wrangler/config-schema.json',name:input.workerName,account_id:input.cloudflareAccountId,main:'src/diy/hubspot-worker.js',compatibility_date:'2026-10-09',compatibility_flags:['nodejs_compat'],workers_dev:false,preview_urls:false,keep_vars:true,
  vars:{...Object.fromEntries(closedFlags.map(f=>[f,'false'])),DIY_INSTALL_PROFILE:DIY_HUBSPOT_PROFILE,DEPLOYMENT_ENVIRONMENT:'customer',CERTIFICATION_MODE:'remote-single-tenant',STAGING_PORTAL_ID:input.portalId,STAGING_CONTACT_ID:input.contactId,APPROVED_PORTAL_ID:input.portalId,APPROVED_CONTACT_ID:input.contactId,TENANT_CONFIGURATION_APPROVED:String(input.tenantReviewed===true),SYNTHETIC_RECORDS_ONLY:'true',AUDIT_RETENTION_DAYS:'365',ACCESS_ISSUER:issuer.origin,ACCESS_AUDIENCE:input.accessAudience,APPROVER_SUBJECTS_JSON:JSON.stringify(roles)},
  durable_objects:{bindings:[{name:'CERTIFICATION_LEDGER',class_name:'CertificationLedger'}]},migrations:[{tag:'customer-preview-v1',new_sqlite_classes:['CertificationLedger']}],version_metadata:{binding:'RELEASE_VERSION'},observability:{enabled:true,logs:{enabled:true,invocation_logs:false}}};
}
export function assertCustomerPreview(env){
 if(env.DIY_INSTALL_PROFILE!==DIY_HUBSPOT_PROFILE||env.CERTIFICATION_MODE!=='remote-single-tenant'||env.DEPLOYMENT_ENVIRONMENT!=='customer'||env.SYNTHETIC_RECORDS_ONLY!=='true')throw Error('customer_preview_profile_required');
 if(closedFlags.some(f=>env[f]!=='false'))throw Error('customer_preview_all_effects_must_be_disabled');
 if(env.STAGING_PORTAL_ID==='247646122'||env.STAGING_CONTACT_ID==='582095692487')throw Error('vendor_demo_must_not_be_reused');
 const tenant=tenantConfiguration(env);if(!tenant.synthetic||tenant.local)throw Error('customer_preview_synthetic_tenant_required');return tenant;
}
