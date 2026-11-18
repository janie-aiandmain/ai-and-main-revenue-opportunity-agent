// Read-only bounded polling: PATCH may deploy before list/detail reads agree.
export async function settingsVersion({readVersions,readVersion,previousId,delta,attempts=12,pause=()=>new Promise(r=>setTimeout(r,1000))}){
 for(let n=0;n<attempts;n++){
  const list=await readVersions(),latest=(Array.isArray(list)?list:list.items)?.[0];
  if(latest?.id&&latest.id!==previousId){
   let version;try{version=await readVersion(latest.id);}catch(e){if(!/cloudflare_GET_404_codes_100146/.test(e.message))throw e;}
   const vars=Object.fromEntries((version?.resources?.bindings||[]).filter(b=>b.type==='plain_text').map(b=>[b.name,b.text]));
   if(version&&Object.entries(delta).every(([k,v])=>vars[k]===v))return version;
  }
  if(n+1<attempts)await pause();
 }
 throw Error('cloudflare_settings_version_did_not_converge');
}
