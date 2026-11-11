import os,sys,json,pathlib,subprocess,datetime
root=pathlib.Path('/workspace/ai-and-main-revenue-opportunity-agent');path=root/'reports/controlled-demo-recovery-window.json';record=json.loads(path.read_text());codes=[]
for which,config in [('demo','wrangler.jsonc'),('owner','wrangler.staging.jsonc')]:
 args=['node','node_modules/wrangler/bin/wrangler.js','deploy','--config',config,'--var','RELEASE_SOURCE_SHA:'+record['sourceCommit'],'--outdir','/tmp/release-'+which+'-bundle']
 env=os.environ.copy();env.update({'CI':'true','WRANGLER_SEND_METRICS':'false','WRANGLER_LOG_PATH':'/tmp/controlled-demo-'+which+'-close.log'})
 with open('/tmp/controlled-demo-'+which+'-closed.txt','w') as out:result=subprocess.run(args,cwd=root,env=env,stdout=out,stderr=subprocess.STDOUT)
 codes.append({'target':which,'exitCode':result.returncode})
record['closeDeployments']=codes;record['closeRequestedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();record['state']='CLOSED_PENDING_VERIFICATION' if all(c['exitCode']==0 for c in codes) else 'CLOSE_FAILED_REQUIRES_OPERATOR_ATTENTION';path.write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'state':record['state'],'closeDeployments':codes}));sys.exit(0 if all(c['exitCode']==0 for c in codes) else 1)
