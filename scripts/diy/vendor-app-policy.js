import {createHash} from 'node:crypto';
export const VENDOR_APP_POLICY='hubspot-vendor-oauth-registration-v2';
export function verifyVendorApp(project,app){
 const a=app?.config?.auth;
 if(project?.name!=='ai-main-revenue-rescue'||project.srcDir!=='src'||project.platformVersion!=='2026.09'||app?.uid!=='ai_main_revenue_rescue_oauth'||app.type!=='app'||app.config.distribution!=='marketplace'||a?.type!=='oauth')throw Error('fixed_vendor_oauth_project_required');
 if(!Array.isArray(a.requiredScopes)||!a.requiredScopes.includes('oauth')||!a.requiredScopes.includes('crm.objects.contacts.read')||a.requiredScopes.some(s=>!['oauth','crm.objects.contacts.read'].includes(s))||!Array.isArray(a.optionalScopes)||a.optionalScopes.length||!Array.isArray(a.conditionallyRequiredScopes)||a.conditionallyRequiredScopes.length)throw Error('read_only_vendor_scopes_required');
 if(!Array.isArray(a.redirectUrls)||a.redirectUrls.length!==1||a.redirectUrls[0]!=='http://localhost:3000')throw Error('development_callback_only_pending_hosted_review');
 return {policy:VENDOR_APP_POLICY,manifestHash:'sha256:'+createHash('sha256').update(JSON.stringify({project,app})).digest('hex'),scopes:a.requiredScopes,customerReady:false};
}
