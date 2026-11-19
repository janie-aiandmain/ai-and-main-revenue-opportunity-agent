// Technical handoff, not an owner setup step. No secrets or remote actions.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {customerPreviewConfig} from '../../src/diy/hubspot-profile.js';
const [inputFile,outputFile,...extra]=process.argv.slice(2);
if(!inputFile||!outputFile||extra.length)throw Error('usage_prepare_hubspot_nonsecret_input_json_new_output_jsonc');
const config=customerPreviewConfig(JSON.parse(await readFile(inputFile,'utf8'))),output=resolve(outputFile);
if(['wrangler.jsonc','wrangler.staging.jsonc','wrangler.certification.jsonc'].some(p=>output===resolve(p)))throw Error('existing_demo_config_must_not_be_overwritten');
await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({prepared:true,deployed:false,customerReleaseApproved:false,publicHostnameEnabled:false,allEffectsDisabled:true,tenantReviewRequired:config.vars.TENANT_CONFIGURATION_APPROVED!=='true'}));
