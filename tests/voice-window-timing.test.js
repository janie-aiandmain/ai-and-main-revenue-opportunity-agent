import test from 'node:test';
import assert from 'node:assert/strict';
import {newWindowTiming,boundedExistingWindow} from '../scripts/voice/window-timing.js';
const now=Date.parse('2026-11-18T23:00:00Z');
test('both timestamps use a single clock reading and produce exactly thirty minutes',()=>{
 const w=newWindowTiming(now);assert.equal(Date.parse(w.startedAt),now);assert.equal(Date.parse(w.expiresAt)-Date.parse(w.startedAt),1800000);
});
test('repair only shortens an overlong operational deadline without changing any authority or original evidence',()=>{
 const original={...newWindowTiming(now),runId:'same-run',intakeId:'same-intake',approvalId:'same-approval',payloadHash:'same-hash',maximumCreates:1};original.expiresAt=new Date(Date.parse(original.expiresAt)+1).toISOString();const saved=structuredClone(original),fixed=boundedExistingWindow(original,now+1000);assert.deepEqual(original,saved);assert.deepEqual({...fixed,expiresAt:original.expiresAt},original);assert.equal(Date.parse(original.expiresAt)-Date.parse(fixed.expiresAt),1);
 const shorter={...original,expiresAt:new Date(now+600000).toISOString()};assert.deepEqual(boundedExistingWindow(shorter,now+1000),shorter);
});
test('expired or future-started operational windows cannot be revived by timing repair',()=>{
 const w=newWindowTiming(now);assert.throws(()=>boundedExistingWindow(w,now+1800000),/expired_or_invalid/);assert.throws(()=>boundedExistingWindow(w,now-1),/expired_or_invalid/);
});
