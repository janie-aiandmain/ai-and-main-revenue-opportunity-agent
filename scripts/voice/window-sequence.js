import assert from 'node:assert/strict';
export function selectWindow(args){
 const selectors=args.filter(x=>/^--window-/.test(x));assert(selectors.length<=1,'duplicate_window_selector');
 const selected=selectors[0];assert(!selected||/^--window-(?:[2-9]|[1-9][0-9])$/.test(selected),'invalid_window_selector');
 const sequence=selected?Number(selected.slice(9)):1,mode=args.filter(x=>x!==selected).join(' ');
 assert(['--enable --user-authorized','--resume --user-authorized','--close --user-authorized'].includes(mode),'explicit_authorized_mode_required');
 return {sequence,mode,directorySuffix:sequence>1?'/window-'+sequence:'',previousClosureSuffix:sequence>2?'/window-'+(sequence-1)+'/note-window-close.json':'/note-window-close.json'};
}
