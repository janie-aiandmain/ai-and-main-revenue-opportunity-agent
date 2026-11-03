// Generates a local staging config only. Never deploys, requests access or reads secrets.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export function stagingConfig(settings,template,repoRoot){
 const allowed=['accountId','stagingPortalId','productionPortalId','stagingContactId','accessIssuer','accessAudience','subjects'];
 if(!settings||Object.keys(settings).some(k=>!allowed.includes(k)))throw Error('ordinary_settings_only_no_tokens_or_extra_fields');
 if(!/^[a-f0-9]{32}$/i.test(settings.accountId))throw Error('real_cloudflare_account_id_required');
 for(const k of ['stagingPortalId','productionPortalId','stagingContactId'])if(!/^\d+$/.test(settings[k]))throw Error('verified_numeric_'+k+'_required');
 if(settings.stagingPortalId===settings.productionPortalId)throw Error('staging_portal_must_differ_from_production');
 const issuer=new URL(settings.accessIssuer);
 if(issuer.protocol!=='https:'||!issuer.hostname.endsWith('.cloudflareaccess.com')||issuer.username||issuer.password||issuer.search||issuer.hash||issuer.pathname!=='/')throw Error('real_access_team_issuer_required');
 if(!/^[a-f0-9]{32,}$/i.test(settings.accessAudience))throw Error('real_access_application_audience_required');
 if(!settings.subjects||!Object.keys(settings.subjects).length||Object.entries(settings.subjects).some(([id,role])=>!id||/REPLACE|YOUR_/i.test(id)||!['Viewer','Approver','Admin'].includes(role)))throw Error('verified_subject_role_mapping_required');
 if(template.name!=='ai-and-main-revenue-opportunity-staging')throw Error('separate_staging_worker_name_required');
 return {...template,account_id:settings.accountId,main:resolve(repoRoot,'src/staging/worker.js'),keep_vars:false,workers_dev:false,preview_urls:false,vars:{...template.vars,DEPLOYMENT_ENVIRONMENT:'staging',CERTIFICATION_MODE:'remote-staging',CRM_WRITEBACK_ENABLED:'false',ENABLE_TEST_TASK_WRITES:'false',ENABLE_GENERAL_EXECUTION:'false',GENERAL_RELEASE_APPROVED:'false',STAGING_ISOLATION_APPROVED:'true',STAGING_PORTAL_ID:settings.stagingPortalId,PRODUCTION_PORTAL_ID:settings.productionPortalId,STAGING_CONTACT_ID:settings.stagingContactId,ACCESS_ISSUER:issuer.origin,ACCESS_AUDIENCE:settings.accessAudience,APPROVER_SUBJECTS_JSON:JSON.stringify(settings.subjects)}};
}
export async function main(args){
 if(args.length!==2)throw Error('usage_configure_input_settings_json_output_config_jsonc');
 const repoRoot=fileURLToPath(new URL('../../',import.meta.url));
 const config=stagingConfig(JSON.parse(await readFile(args[0],'utf8')),JSON.parse(await readFile(new URL('../../wrangler.staging.jsonc',import.meta.url),'utf8')),repoRoot);
 const output=resolve(args[1]);if(output===resolve(repoRoot,'wrangler.jsonc')||output===resolve(repoRoot,'wrangler.staging.jsonc'))throw Error('do_not_overwrite_checked_in_configs');
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(config,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({config:output,worker:config.name,deployed:false,publicRoute:false,writesEnabled:false}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
