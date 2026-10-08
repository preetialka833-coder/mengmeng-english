'use strict';
const assert=require('node:assert/strict');
const {loadPage}=require('./audit-harness');
const tests=[];
function test(name,run){tests.push([name,run]);}
const snapshot=a=>Object.fromEntries(a.storage);
function sessionPage(unit,ids,more={},data={}){
 const initial=loadPage(`math-unit${unit}.html`,more),session=initial.json('JSON.parse(localStorage.getItem(SESSION_KEY))');
 Object.assign(session,{ids,current:0},data);
 return loadPage(`math-unit${unit}.html`,{...more,[initial.eval('SESSION_KEY')]:JSON.stringify(session)});
}
function mc(a,j){a.eval(`checkMC(current,${j===undefined?'picked[current].a':j})`);}
function text(a,value){a.get('q'+a.eval('current')+'input').value=value;a.eval('checkText(current)');}
for(const unit of [1,2]){
 const prefix='u'+unit+'_',KEY=`math-unit${unit}_bank_stats_v1`;
 test(`unit${unit}: valid legacy counters/unknown keys/rewards survive migration without inferring independent mastery`,()=>{
  const old={ok:5,wrong:2,last:123456,extra:{note:'synthetic'}};
  const a=sessionPage(unit,[prefix+'01'],{[KEY]:JSON.stringify({[prefix+'01']:old,foreign:{preserve:true}}),math_xp:'30',math_coins:'40',math_owned:'{"bow":true}'});
  for(const k of ['ok','wrong','last','extra'])assert.deepEqual(a.json(`st('${prefix}01').${k}`),old[k]);
  assert.equal(a.eval(`st('${prefix}01').legacyOk`),5);assert.equal(a.eval(`st('${prefix}01').independentStreak`),0);assert.equal(a.storage.get('math_xp'),'30');assert.equal(a.storage.get('math_coins'),'40');assert.equal(a.storage.get('math_owned'),'{"bow":true}');assert.deepEqual(a.json('stats.foreign'),{preserve:true});
 });
 test(`unit${unit}: hint, correction, completion, repeated clicks and reload never claim independent mastery or duplicate rewards`,()=>{
  const a=sessionPage(unit,[prefix+'01'],{[KEY]:JSON.stringify({[prefix+'01']:{ok:1,wrong:0,last:1,independentStreak:1}}),math_xp:'30',math_coins:'40'});
  a.eval('openHint(0,0)');assert.equal(a.eval(`st('${prefix}01').independentStreak`),0);mc(a);mc(a);a.eval('openHint(0,1)');
  assert.equal(a.eval('score'),0);assert.equal(a.eval('done'),1);assert.equal(a.eval('outcomes[0]'),'assisted');assert.equal(a.storage.get('math_xp'),'31');assert.equal(a.storage.get('math_coins'),'41');assert.equal(a.eval(`st('${prefix}01').assistedTotal`),1);
  const b=loadPage(`math-unit${unit}.html`,snapshot(a));mc(b);assert.equal(b.eval('done'),1);assert.equal(b.eval('score'),0);assert.equal(b.storage.get('math_xp'),'31');assert.equal(b.storage.get('math_coins'),'41');
 });
 test(`unit${unit}: wrong then immediate correct is assisted and resets verified streak`,()=>{
  const a=sessionPage(unit,[prefix+'01'],{[KEY]:JSON.stringify({[prefix+'01']:{ok:2,wrong:4,last:1,independentStreak:2}})});mc(a,1);mc(a);assert.equal(a.eval('score'),0);assert.equal(a.eval('outcomes[0]'),'assisted');assert.equal(a.eval(`st('${prefix}01').wrong`),5);assert.equal(a.eval(`st('${prefix}01').independentStreak`),0);
 });
 test(`unit${unit}: genuinely unaided success increments verified streak once`,()=>{
  const a=sessionPage(unit,[prefix+'01'],{[KEY]:JSON.stringify({[prefix+'01']:{ok:1,wrong:0,last:1,independentStreak:1}})});mc(a);mc(a);assert.equal(a.eval('score'),1);assert.equal(a.eval('done'),1);assert.equal(a.eval(`st('${prefix}01').independentStreak`),2);assert.equal(a.eval(`st('${prefix}01').independentTotal`),1);
 });
 test(`unit${unit}: one-question navigation and partial hint session survive reload`,()=>{
  const a=sessionPage(unit,[prefix+'01',prefix+'02']);a.eval('goQuestion(1)');assert.equal(a.eval('current'),0);mc(a);a.eval('goQuestion(1);openHint(1,2)');assert.equal(a.eval('current'),1);
  const b=loadPage(`math-unit${unit}.html`,snapshot(a));assert.equal(b.eval('current'),1);assert.equal(b.eval('done'),1);assert.equal(b.eval('score'),1);assert.equal(b.eval('assisted[1]'),true);assert.equal(b.eval('hintLevels[1][2]'),true);mc(b);assert.equal(b.eval('done'),2);assert.equal(b.eval('score'),1);b.eval('goQuestion(-1)');assert.equal(b.eval('current'),0);assert.equal(b.eval('finished[0]'),true);
 });
 test(`unit${unit}: blank text does not penalize and fullwidth answer works`,()=>{
  const id=prefix+(unit===1?'03':'05'),a=sessionPage(unit,[id]);text(a,'  ');assert.equal(a.eval('done'),0);assert.equal(a.eval(`st('${id}').wrong`),0);assert.equal(!!a.eval('assisted[0]'),false);
  const answer=unit===1?'３００，５００，００８':'１８０度';text(a,answer);assert.equal(a.eval('done'),1);assert.equal(a.eval('score'),1);
 });
 test(`unit${unit}: unsubmitted text remains on refresh and new-group cancellation is harmless`,()=>{
  const id=prefix+(unit===1?'03':'05'),a=sessionPage(unit,[id]);a.eval("rememberAnswer(0,'12')");const b=loadPage(`math-unit${unit}.html`,snapshot(a),{confirm:false});assert.equal(b.eval('answers[0]'),'12');const before=b.storage.get(b.eval('SESSION_KEY'));b.eval('startNewGroup()');assert.equal(b.storage.get(b.eval('SESSION_KEY')),before);
 });
 test(`unit${unit}: malformed session IDs safely fall back to a bounded unique group`,()=>{
  for(const ids of [['unknown'],[prefix+'01',prefix+'01'],[]]){const a=sessionPage(unit,ids);assert.ok(a.eval('picked.length')>0&&a.eval('picked.length')<=8);assert.equal(a.eval('new Set(picked.map(q=>q.id)).size'),a.eval('picked.length'));}
 });
 test(`unit${unit}: corrupt raw stats cannot be silently overwritten by practice`,()=>{
  for(const raw of ['not-json','null','[]']){const a=sessionPage(unit,[prefix+'01'],{[KEY]:raw});a.eval('openHint(0,0)');mc(a);assert.equal(a.storage.get(KEY),raw);}
 });
}
let failed=0;for(const [name,run]of tests){try{run();console.log('PASS:',name);}catch(e){failed++;console.error('FAIL:',name,'\n',e.stack);}}if(failed)process.exitCode=1;else console.log(`PASS: all ${tests.length} independent math state audits.`);
