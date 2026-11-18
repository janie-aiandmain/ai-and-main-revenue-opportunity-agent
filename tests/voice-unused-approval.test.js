import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertUnusedSameGrant} from '../scripts/voice/unused-approval.js';
const root='../docs/review/voice-intake-v1/hosted/ceiling-fan-dictation-2026-11-18/';
const load=p=>JSON.parse(readFileSync(new URL(root+p,import.meta.url)));
const original=load('operator-approved-note.json'),current=load('window-2/operator-before-window.json'),closed=load('note-window-close.json'),now=Date.parse('2026-11-18T22:55:00Z');
test('unchanged unused exact grant can cover a separate window after verified prior closure without renewal',()=>{
 const before=structuredClone(current);assertUnusedSameGrant(current,original,closed,now);assert.deepEqual(current,before);assert.equal(current.approval.issuedAt,original.approval.issuedAt);
});
for(const [label,change]of [
 ['prior create intent',d=>{d.createAttempts=1;}],['unknown outcome',d=>{d.state='NOTE_UNKNOWN';}],['already saved',d=>{d.remoteNoteId='existing-note';}],['window intent',d=>{d.executionWindow={runId:'old'};}],['renewed approval',d=>{d.approval.issuedAt++;}],['changed text',d=>{d.reviewedText+=' Contact customer.';}],['changed payload',d=>{d.finalRequest.body.properties.hs_note_body+=' extra';}],['different owner version',d=>{d.ownerDeploymentVersion='different';}],['new trace event',d=>{d.trace.push({event:'VOICE_POST_INTENT_PERSISTED_BEFORE_CREATE'});}]
])test('next window rejects '+label,()=>{const d=structuredClone(current);change(d);assert.throws(()=>assertUnusedSameGrant(d,original,closed,now));});
test('expired grant or unverified prior closure cannot cover a new window',()=>{
 assert.throws(()=>assertUnusedSameGrant(current,original,closed,original.approval.expiresAt));assert.throws(()=>assertUnusedSameGrant(current,original,{...closed,verified:false},now));
});
