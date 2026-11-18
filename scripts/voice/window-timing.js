const MAX_MS=30*60000;
export function newWindowTiming(now=Date.now()){
 return {startedAt:new Date(now).toISOString(),expiresAt:new Date(now+MAX_MS).toISOString()};
}
// Never extends an earlier window or changes its run, note, grant or create limit.
export function boundedExistingWindow(window,now=Date.now()){
 const start=Date.parse(window.startedAt),end=Date.parse(window.expiresAt),bounded=Math.min(end,start+MAX_MS);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>now||bounded<=now||bounded<=start)throw Error('window_expired_or_invalid_do_not_reopen');
 return {...window,expiresAt:new Date(bounded).toISOString()};
}
