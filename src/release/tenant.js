// Deployment configuration is an administrator boundary, never request input.
export function tenantConfiguration(env){
 if(!['staging','customer'].includes(env.DEPLOYMENT_ENVIRONMENT)||env.CRM_WRITEBACK_ENABLED!=='false'||!env.STAGING_PORTAL_ID||!env.STAGING_CONTACT_ID)throw Error('tenant_isolation_configuration_missing');
 const mode=env.CERTIFICATION_MODE;
 if(mode==='local')return {synthetic:true,local:true};
 if(!/^\d+$/.test(env.STAGING_PORTAL_ID)||!/^\d+$/.test(env.STAGING_CONTACT_ID)||env.LOCAL_HUBSPOT_FIXTURE_URL||env.LOCAL_MODEL_FIXTURE_URL)throw Error('verified_numeric_tenant_isolation_required');
 if(mode==='remote-staging'){
  if(env.STAGING_ISOLATION_APPROVED!=='true'||!/^\d+$/.test(env.PRODUCTION_PORTAL_ID||'')||env.PRODUCTION_PORTAL_ID===env.STAGING_PORTAL_ID)throw Error('hosted_isolation_unverified');return {synthetic:true,local:false};
 }
 if(mode==='remote-demo'){
  if(env.STAGING_PORTAL_ID!=='247646122'||env.STAGING_CONTACT_ID!=='582095692487'||env.STAGING_ISOLATION_APPROVED!=='true')throw Error('designated_demo_isolation_unverified');return {synthetic:true,local:false};
 }
 if(mode==='remote-single-tenant'){
  if(env.DEPLOYMENT_ENVIRONMENT!=='customer'||env.TENANT_CONFIGURATION_APPROVED!=='true'||env.APPROVED_PORTAL_ID!==env.STAGING_PORTAL_ID||env.APPROVED_CONTACT_ID!==env.STAGING_CONTACT_ID||!['true','false'].includes(env.SYNTHETIC_RECORDS_ONLY))throw Error('customer_tenant_configuration_unapproved');return {synthetic:env.SYNTHETIC_RECORDS_ONLY==='true',local:false};
 }
 throw Error('unsupported_tenant_mode');
}
export function syntheticContactRequired(env){return tenantConfiguration(env).synthetic;}
