'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadPage}=require('./audit-harness');
const DAY='2026-10-19T09:00:00Z';
function boot(unit,seed={}){return loadPage(`math-unit${unit}.html`,seed,{now:DAY});}
function queue(a,unit){a.eval(`picked=[BANK.find(q=>q.id==='u${unit}_01')];current=0;tries={};finished={};assisted={};hintLevels={};answers={};outcomes={};knowledgeUsed=false;recount();saveSession();render()`);}
function correct(a){a.eval('checkMC(0,picked[0].a)');}
for(const unit of [1,2]){
 test(`unit ${unit}: same-day repetitions preserve counters but only later due independent success verifies`,()=>{
  const a=boot(unit),id=`u${unit}_01`;queue(a,unit);correct(a);queue(a,unit);correct(a);
  assert.equal(a.eval(`st('${id}').independentStreak`),2);assert.equal(a.eval(`st('${id}').recallVerifiedDay`),undefined);
  assert.equal(a.eval(`st('${id}').recallDueDay`),'2026-10-20');
  a.setNow('2026-10-22T09:00:00Z');queue(a,unit);correct(a);assert.equal(a.eval(`st('${id}').recallVerifiedDay`),'2026-10-22');
  assert.equal(a.storage.get('math_xp'),'3');
 });
 test(`unit ${unit}: hint/correction/knowledge loses this attempt, keeps historical evidence and is sticky for today`,()=>{
  for(const help of ['openHint(0,0)','knowledgeHelp()','checkMC(0,1)']){
   const a=boot(unit),id=`u${unit}_01`;queue(a,unit);correct(a);a.setNow('2026-10-20T09:00:00Z');queue(a,unit);correct(a);
   const verified=a.eval(`st('${id}').recallVerifiedDay`);
   a.setNow('2026-10-23T09:00:00Z');queue(a,unit);a.eval(help);correct(a);
   assert.equal(a.eval(`st('${id}').recallVerifiedDay`),verified);assert.equal(a.eval('outcomes[0]'),'assisted');
   queue(a,unit);correct(a);assert.equal(a.eval(`st('${id}').recallFirstDay`),'');assert.equal(a.eval(`st('${id}').recallVerifiedDay`),verified);
   a.setNow('2026-10-24T09:00:00Z');queue(a,unit);correct(a);assert.equal(a.eval(`st('${id}').recallFirstDay`),'2026-10-24');
  }
 });
 test(`unit ${unit}: legacy successes/unknown fields/rewards never become delayed evidence`,()=>{
  const key=`math-unit${unit}_bank_stats_v1`,id=`u${unit}_01`;
  const a=boot(unit,{[key]:JSON.stringify({[id]:{ok:12,independentStreak:8,custom:'keep'},custom:{nested:42}}),math_xp:'88'});
  assert.equal(a.eval(`st('${id}').independentStreak`),8);assert.equal(a.eval(`st('${id}').recallVerifiedDay`),undefined);
  assert.equal(a.eval(`st('${id}').custom`),'keep');assert.equal(a.storage.get('math_xp'),'88');
 });
 test(`unit ${unit}: knowledge card blocks all unfinished group items across other entries`,()=>{
  const a=boot(unit);a.eval("picked=BANK.slice(0,2);current=0;finished={};assisted={};tries={};hintLevels={};answers={};outcomes={};knowledgeUsed=false;knowledgeHelp()");
  assert.equal(a.eval('st(picked[1].id).recallBlockedDay'),'2026-10-19');
  a.eval("knowledgeUsed=false;recordDelayed(st(picked[1].id))");assert.equal(a.eval('st(picked[1].id).recallFirstDay'),'');
 });
 test(`unit ${unit}: oldest due items are guaranteed, bounded and backlog visible; refresh retains queue`,()=>{
  const a=boot(unit);a.eval(`BANK.slice(0,12).forEach((q,i)=>{st(q.id).recallDueDay='2026-10-'+String(1+i).padStart(2,'0');});save();newSession();render()`);
  assert.deepEqual(a.json('picked.map(q=>q.id)'),a.json('BANK.slice(0,8).map(q=>q.id)'));
  assert.match(a.get('mastery').innerHTML,/另有 4 题/);
  const b=boot(unit,Object.fromEntries(a.storage));assert.deepEqual(b.json('picked.map(q=>q.id)'),a.json('picked.map(q=>q.id)'));
 });
 test(`unit ${unit}: knowledge usage survives refresh and completed review is never retroactively invalidated`,()=>{
  const a=boot(unit);queue(a,unit);a.eval('knowledgeHelp()');const b=boot(unit,Object.fromEntries(a.storage));correct(b);assert.equal(b.eval('outcomes[0]'),'assisted');
  const c=boot(unit);queue(c,unit);correct(c);const raw=c.storage.get(`math-unit${unit}_bank_stats_v1`);c.eval('knowledgeHelp()');assert.equal(c.storage.get(`math-unit${unit}_bank_stats_v1`),raw);
 });
}
