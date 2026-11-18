import test from 'node:test';
import assert from 'node:assert/strict';
import {selectWindow} from '../scripts/voice/window-sequence.js';
import {assertUnusedSameGrant} from '../scripts/voice/unused-approval.js';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL('../docs/review/voice-intake-v1/hosted/ceiling-fan-dictation-2026-11-18/'+p,import.meta.url)));
test('each later window has its own artifacts and requires the immediately previous closure',()=>{
 assert.equal(selectWindow(['--close','--user-authorized']).directorySuffix,'');
 for(const n of [2,3,12]){const selected=selectWindow(['--enable','--user-authorized','--window-'+n]);assert.equal(selected.sequence,n);assert.equal(selected.directorySuffix,'/window-'+n);assert.equal(selected.previousClosureSuffix,n===2?'/note-window-close.json':'/window-'+(n-1)+'/note-window-close.json');}
});
test('selectors cannot traverse paths, repeat, skip authorization or silently accept unsupported flags',()=>{
 for(const args of [['--enable','--window-3'],['--enable','--user-authorized','--window-2','--window-3'],['--enable','--user-authorized','--window-../4'],['--enable','--user-authorized','--window-01'],['--enable','--user-authorized','--window-100'],['--enable','--user-authorized','--arbitrary']])assert.throws(()=>selectWindow(args));
});
test('latest real zero-attempt receipt matches the same original approval and verified window-2 closure',()=>{
 assertUnusedSameGrant(load('window-3/operator-before-window.json'),load('operator-approved-note.json'),load('window-2/note-window-close.json'),Date.parse('2026-11-18T23:35:00Z'));
});
