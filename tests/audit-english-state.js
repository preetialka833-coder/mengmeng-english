'use strict';
const assert=require('node:assert/strict');
const {loadPage}=require('./audit-harness');
const KEY='mengmeng_v4_unit1';
const baseNow='2026-10-07T12:00:00Z';
const tests=[];
function test(name,run){tests.push([name,run]);}
const seedFor=s=>({[KEY]:JSON.stringify(s)});
const snapshot=a=>Object.fromEntries(a.storage);
const items=loadPage('english.html').json('allItems()');
function reviewSeed(){const s={meta:{day:8,stickers:3,doneDays:{d1:true},graduated:false},custom:{untouched:'synthetic'}};for(const x of items)s[x.kind+'|'+x.en]={seen:9,wrong:2,passed:1,due:Date.parse('2026-11-01T00:00:00Z'),reviewStep:2,lastReview:Date.parse('2026-10-03T00:00:00Z'),learnedDay:'2026-10-01',dueDay:'2026-11-01',extra:'keep'};Object.assign(s['word|sport'],{dueDay:'2026-10-07',due:Date.parse('2026-10-07T00:00:00Z')});return s;}
function answer(a,text){a.eval(`typed=${JSON.stringify(text)};submitAnswer()`);}
function learnToSpelling(a){a.eval('startToday();advance();advance()');a.get('choiceGrid').children.find(n=>n.textContent===a.eval('current.en')).click();a.flush();assert.equal(a.eval('stage'),3);}

test('preserves valid legacy and unknown fields while migrating additively',()=>{
 const s=reviewSeed(),a=loadPage('english.html',seedFor(s));
 for(const key of ['seen','wrong','passed','due','reviewStep','lastReview','extra'])assert.deepEqual(a.json(`S['word|sport'][${JSON.stringify(key)}]`),s['word|sport'][key]);
 assert.deepEqual(a.json('S.custom'),s.custom);assert.equal(a.eval('S.meta.stickers'),3);assert.equal(a.eval('S.meta.day'),8);assert.equal(a.eval('S.meta.doneDays.d1'),true);
});
test('corrupted startup storage is never silently overwritten',()=>{
 for(const raw of ['not-json','null','[]','42']){const a=loadPage('english.html',{[KEY]:raw});a.eval('save()');assert.equal(a.storage.get(KEY),raw);assert.ok(a.eval('storageWarning'));}
});
test('partial lesson, typed input, and stage resume after reload',()=>{
 const a=loadPage('english.html');learnToSpelling(a);a.eval("tap('s');tap('p')");const b=loadPage('english.html',snapshot(a));b.eval('startToday()');assert.equal(b.eval('stage'),3);assert.equal(b.eval('typed'),'sp');assert.equal(b.eval('idx'),0);assert.equal(b.eval('S.meta.dailyPlan.entries.length'),4);
});
test('correct double submit advances one stage and navigation cancels stale timer',()=>{
 const a=loadPage('english.html');learnToSpelling(a);answer(a,'sport');answer(a,'sport');assert.equal(a.timers.size,1);assert.equal(a.eval('S.meta.dailyPlan.entries[0].stage'),4);a.eval("show('parent')");a.flush();assert.ok(a.get('parent').classList.contains('active'));a.eval('startToday()');assert.equal(a.eval('stage'),4);
});
test('guided first learning is not a delayed independent recall',()=>{
 const a=loadPage('english.html');learnToSpelling(a);for(let stage=3;stage<=6;stage++){assert.equal(a.eval('stage'),stage);answer(a,'sport');a.flush();}
 assert.equal(a.eval("S['word|sport'].passed"),1);assert.equal(a.eval("S['word|sport'].independentRecallDay"),undefined);assert.equal(a.eval("S['word|sport'].reviewStep"),1);assert.equal(a.eval("S['word|sport'].dueDay"),'2026-10-08');
});
test('wrong, immediate correction, short retest, then next-day independent recall are distinct',()=>{
 const a=loadPage('english.html',seedFor(reviewSeed()));a.eval('startToday()');answer(a,'sprot');const failedDue=a.eval("S['word|sport'].relearnAt");answer(a,'sport');answer(a,'sport');a.flush();
 assert.equal(a.eval("S['word|sport'].reviewStep"),0);assert.equal(a.eval("S['word|sport'].lastResult"),'corrected');assert.equal(a.eval("S['word|sport'].independentRecallDay"),undefined);assert.equal(a.eval('S.meta.dailyPlan.entries.length'),2);assert.equal(a.eval('S.meta.stickers'),4);
 a.setNow(failedDue-1);a.eval('startToday()');assert.equal(a.eval('current'),null);
 a.setNow(failedDue);a.eval('startToday()');assert.equal(a.eval('current._mode'),'retest');answer(a,'sport');a.flush();
 assert.equal(a.eval("S['word|sport'].lastResult"),'short-retest');assert.equal(a.eval("S['word|sport'].independentRecallDay"),undefined);assert.equal(a.eval("S['word|sport'].dueDay"),'2026-10-08');
 const b=loadPage('english.html',snapshot(a),{now:'2026-10-08T12:00:00Z'});b.eval('startToday()');answer(b,'sport');b.flush();assert.equal(b.eval("S['word|sport'].independentRecallDay"),'2026-10-08');assert.equal(b.eval("S['word|sport'].reviewStep"),2);assert.equal(b.eval("S['word|sport'].dueDay"),'2026-10-11');
});
test('same-day re-entry cannot generate extra fresh batches or duplicate rewards',()=>{
 const a=loadPage('english.html',seedFor(reviewSeed()));a.eval('startToday()');answer(a,'sport');a.flush();const before=a.json('S.meta.dailyPlan');const stickers=a.eval('S.meta.stickers');for(let i=0;i<5;i++)a.eval('startToday()');assert.deepEqual(a.json('S.meta.dailyPlan'),before);assert.equal(a.eval('S.meta.stickers'),stickers);
});
test('backlog pauses new items and caps daily due reviews at eight',()=>{
 const s=reviewSeed();for(const x of items.slice(0,12))Object.assign(s[x.kind+'|'+x.en],{dueDay:'2026-10-01'});const a=loadPage('english.html',seedFor(s));assert.equal(a.eval('S.meta.dailyPlan.entries.length'),8);assert.equal(a.eval('S.meta.dailyPlan.entries.filter(e=>e.mode==="new").length'),0);assert.equal(a.eval('S.meta.dailyPlan.backlog'),4);
});
test('unfinished fresh stage carries across a local-calendar midnight',()=>{
 const a=loadPage('english.html');learnToSpelling(a);a.eval("tap('s')");a.setNow('2026-10-08T12:00:00Z');a.eval('startToday()');assert.equal(a.eval('stage'),3);assert.equal(a.eval('typed'),'s');assert.equal(a.eval('S.meta.dailyPlan.day'),'2026-10-08');
});
test('invalid progress-code top-level shapes leave state and stored records unchanged',()=>{
 const a=loadPage('english.html',seedFor(reviewSeed()));const before=a.json('S'),raw=a.storage.get(KEY);for(const bad of [null,[],{},42,{meta:[]},{meta:null}]){a.get('importCode').value=Buffer.from(JSON.stringify(bad)).toString('base64');a.eval('importProgress()');assert.deepEqual(a.json('S'),before);assert.equal(a.storage.get(KEY),raw);}
});
test('answer normalizer accepts keyboard punctuation variants but rejects word-boundary and meaning loss',()=>{
 const a=loadPage('english.html');for(const [typed,expected,ok] of [["No, I can’t. But I can learn!","No, I can't. But I can learn.",true],['because of sb ／ sth','because of sb/sth',true],['ping–pong','ping-pong',true],['cant',"can't",false],['pingpong','ping-pong',false],['because of sb sth','because of sb/sth',false],['play sports','playsports',false]])assert.equal(a.eval(`answersMatch(${JSON.stringify(typed)},${JSON.stringify(expected)})`),ok,typed);
});
test('legacy unlocked graduation reward remains unlocked',()=>{const s=reviewSeed();s.meta.graduated=true;const a=loadPage('english.html',seedFor(s));assert.equal(a.eval('S.meta.graduated'),true);});
test('local dates and calendar-day addition work across DST and near UTC boundary',()=>{
 const previous=process.env.TZ;try{process.env.TZ='America/Los_Angeles';const a=loadPage('english.html',{}, {now:'2026-10-08T01:00:00Z'});assert.equal(a.eval('localDay()'),'2026-10-07');assert.equal(a.eval("addDays('2026-03-07',1)"),'2026-03-08');assert.equal(a.eval("addDays('2026-03-08',1)"),'2026-03-09');assert.equal(a.eval("dayTime('2026-03-09')-dayTime('2026-03-08')"),23*60*60*1000);}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('malformed daily-plan values are rejected before overwriting progress',()=>{
 const healthy=loadPage('english.html'),original=healthy.json('S');
 const make=mutate=>{const bad=JSON.parse(JSON.stringify(original));mutate(bad.meta.dailyPlan);return bad;};
 const invalid=[make(p=>p.entries[0].typed={bad:1}),make(p=>p.entries[0].assisted='yes'),make(p=>p.entries[0].readyAt=-1),make(p=>p.entries[0].mode='review'),make(p=>p.entries.push({...p.entries[0]})),make(p=>p.entries=items.slice(0,12).map(x=>({...p.entries[0],key:x.kind+'|'+x.en})))];
 for(const bad of invalid){const raw=JSON.stringify(bad),a=loadPage('english.html',{[KEY]:raw});assert.ok(a.eval('storageWarning'));a.eval('startToday();save()');assert.equal(a.storage.get(KEY),raw);healthy.get('importCode').value=Buffer.from(raw).toString('base64');healthy.eval('importProgress()');assert.deepEqual(healthy.json('S'),original);}
});
test('last base completion is saved before animation and cannot lose or double reward',()=>{
 const a=loadPage('english.html',seedFor(reviewSeed()));a.eval('startToday()');answer(a,'sport');assert.equal(a.eval('S.meta.dailyPlan.baseCompleted'),true);assert.equal(a.eval('S.meta.stickers'),4);const b=loadPage('english.html',snapshot(a));b.eval('startToday()');assert.equal(b.eval('current'),null);assert.equal(b.eval('S.meta.stickers'),4);assert.equal(b.eval('S.meta.dailyPlan.entries.length'),1);
});
test('each item has at most two short retests per day even after repeated wrong corrections',()=>{
 const a=loadPage('english.html',seedFor(reviewSeed()));a.eval('startToday()');
 for(let round=0;round<3;round++){
  answer(a,'wrong');const ready=a.eval("S['word|sport'].relearnAt");answer(a,'sport');a.flush();
  if(round<2){a.setNow(ready);a.eval('startToday()');assert.equal(a.eval('current._mode'),'retest');}
 }
 assert.equal(a.eval('S.meta.dailyPlan.entries.filter(e=>e.mode==="retest").length'),2);assert.equal(a.eval("S['word|sport'].lastResult"),'review-tomorrow');assert.equal(a.eval("S['word|sport'].relearnAt"),0);assert.equal(a.eval('current'),null);assert.equal(a.eval('S.meta.stickers'),4);
});
test('valid import cancels stale transitions and preserves unrelated storage',()=>{
 const a=loadPage('english.html',{other_app:'do-not-change'});learnToSpelling(a);answer(a,'sport');const incoming=reviewSeed();incoming.extraBackupField={kept:true};a.get('importCode').value=Buffer.from(JSON.stringify(incoming)).toString('base64');a.eval('importProgress()');a.flush();assert.equal(a.eval('current'),null);assert.equal(a.eval('S.meta.day'),8);assert.deepEqual(a.json('S.extraBackupField'),{kept:true});assert.equal(a.storage.get('other_app'),'do-not-change');assert.ok(a.get('home').classList.contains('active'));
});
test('typing in backup textarea never also answers the active lesson',()=>{
 const a=loadPage('english.html');learnToSpelling(a);let prevented=false;a.emit('keydown',{key:'s',target:{tagName:'TEXTAREA'},preventDefault(){prevented=true;}});assert.equal(a.eval('typed'),'');assert.equal(prevented,false);
});
let failed=0;for(const [name,run] of tests){try{run();console.log('PASS:',name);}catch(e){failed++;console.error('FAIL:',name,'\n',e.stack);}}if(failed)process.exitCode=1;else console.log(`PASS: all ${tests.length} independent English state audits.`);
