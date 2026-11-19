// Vendor app management only. Environment credentials; never print raw CLI output.
import {execFile} from 'node:child_process';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';
import {verifyVendorApp} from './vendor-app-policy.js';
const [action,...extra]=process.argv.slice(2),commands={list:['project','list'],validate:['project','validate'],info:['project','info'],upload:['project','upload','--skip-auto-deploy','--force']};
if(!commands[action]||extra.length)throw Error('explicit_vendor_project_action_required');
const accountId=process.env.HUBSPOT_ACCOUNT_ID;if(accountId!=='247646072'||!process.env.HUBSPOT_PERSONAL_ACCESS_KEY)throw Error('verified_AI_MAIN_developer_bindings_required');
const root=resolve(import.meta.dirname,'../..'),folder=root+'/hubspot-app',tool='/workspace/.tools/ai-main-hubspot-cli/node_modules/.bin/hs';
let verified;
if(action!=='list'){
 const project=JSON.parse(await readFile(folder+'/hsproject.json','utf8')),app=JSON.parse(await readFile(folder+'/src/app/app-hsmeta.json','utf8'));
 verified=verifyVendorApp(project,app);
}
const env={...process.env,DISABLE_USAGE_TRACKING:'true',ALLOW_USAGE_TRACKING:'false',NODE_USE_ENV_PROXY:'1',HTTP_TIMEOUT:'20000'};
const r=await new Promise(resolve=>execFile(tool,[...commands[action],'--use-env','--json','--no-color'],{cwd:action==='list'?root:folder,env,timeout:180000,maxBuffer:2097152},(error,stdout,stderr)=>resolve({error,stdout,stderr})));
let data;try{data=JSON.parse(r.stdout);}catch{}
const safeText=s=>{if(typeof s!=='string')return undefined;let v=s;for(const key of ['HUBSPOT_PERSONAL_ACCESS_KEY','CLOUDFLARE_API_TOKEN','EVAL_OPENAI_API_KEY'])if(process.env[key])v=v.split(process.env[key]).join('[REDACTED]');if(/Bearer |access.?token|refresh.?token|client.?secret|personal.?access.?key|encodedOAuth/i.test(v))return '[credential-related detail withheld]';return v.slice(0,2000);};
const output={kind:'HUBSPOT_VENDOR_PROJECT_'+action.toUpperCase(),accountId,CLI:'8.19.0',exitCode:r.error?.code??0,CRMCalls:0,credentialConfigFileWritten:false,secretsDisplayed:false,...(verified?{policy:verified.policy,manifestHash:verified.manifestHash}:{})};
if(data){const d=data.data??data.result??data;output.fields=Object.keys(d);for(const k of ['valid','success','projectName','platformVersion','accountId','buildId','deployId','deployedBuildId','projectId','deploymentId','status'])if(['string','number','boolean'].includes(typeof d[k]))output[k]=typeof d[k]==='string'?safeText(d[k]):d[k];
 if(Number.isInteger(d.targetAccount?.accountId))output.targetAccountId=d.targetAccount.accountId;
 for(const k of ['errors','warnings'])if(Array.isArray(d[k]))output[k]=d[k].map(x=>({...(typeof x.code==='string'?{code:safeText(x.code)}:{}),message:safeText(x.message??x.error?.message??String(x))}));
 if(Array.isArray(d.results))output.projects=d.results.map(x=>({name:safeText(x.name),id:x.id,platformVersion:x.platformVersion}));
}
if(r.error){const text=r.stdout+'\n'+r.stderr;output.failureSignals=['401','403','429','ENOTFOUND','EAI_AGAIN','ETIMEDOUT','MISSING_SCOPES','INVALID_AUTHENTICATION'].filter(x=>text.includes(x));if(!data)output.diagnostic=safeText(text.replace(/\x1b\[[0-9;]*m/g,''));}
const out=root+'/products/revenue-rescue-diy/hubspot-owner-validation/cli-project';await mkdir(out,{recursive:true});await writeFile(out+'/'+action+'-'+Date.now()+'.json',JSON.stringify(output,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(output));if(r.error)process.exitCode=1;
