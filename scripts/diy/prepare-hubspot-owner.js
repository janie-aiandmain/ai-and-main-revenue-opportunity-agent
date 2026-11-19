import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {customerInstallationConfig} from '../../src/customer/install-profile.js';
const [file,output,...rest]=process.argv.slice(2);if(!file||!output||rest.length)throw Error('usage_nonsecret_input_new_config_file');
if(['wrangler.jsonc','wrangler.staging.jsonc','wrangler.certification.jsonc'].some(p=>resolve(output)===resolve(p)))throw Error('existing_demo_config_must_not_be_overwritten');
const config=customerInstallationConfig(JSON.parse(await readFile(file,'utf8')));await writeFile(output,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({prepared:true,deployed:false,publicHostnameEnabled:false,CRMEffectsEnabled:false,oauthCallback:config.vars.HUBSPOT_PUBLIC_ORIGIN+'/hubspot/oauth/callback',AccessConfigurationRequired:true}));
