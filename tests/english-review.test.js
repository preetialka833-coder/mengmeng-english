'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {createApp,learnedFixture,submit,completeNew,KEY,BACKUP_KEY,BACKUP_INFO_KEY,html,script}=require('./english-harness');
const TODAY=new Date(2026,9,7,9).getTime();
function dueOne(key='word|sport'){
  const state=learnedFixture();
  Object.assign(state[key],{dueDay:'2026-10-06',due:new Date(2026,9,6,20).getTime()});
  return state;
}
function review(app,answer){app.run('startToday()');submit(app,answer||app.run('current.en'));app.flush();}

test('the complete English script parses and starts with a bounded saved plan',()=>{
  assert.doesNotThrow(()=>new vm.Script(script));
  const a=createApp();assert.equal(a.run('allItems().length'),49);
  assert.equal(a.run('S.meta.dailyPlan.entries.length'),4);
  assert.equal(a.nodes.todayCount.textContent,4);
  assert.ok(a.storage.has(KEY));assert.match(html,/onclick="tap\('\/'\)"/);
});

test('slash forms are accepted without deleting meaningful characters or word boundaries',()=>{
  const a=createApp();
  for(const input of ['because of sb/sth','BECAUSE OF SB / STH',' because of sb ／ sth ']){
    a.context.input=input;assert.equal(a.run('answersMatch(input,"because of sb/sth")'),true,input);
  }
  for(const input of ['because of sb sth','because of sbsth','becauseof sb/sth','because of sb//sth','because of s/b/sth']){
    a.context.input=input;assert.equal(a.run('answersMatch(input,"because of sb/sth")'),false,input);
  }
  assert.equal(a.run(`answersMatch("cant", "can't")`),false);
  assert.equal(a.run(`answersMatch("can't", "can’t")`),true);
  assert.equal(a.run(`answersMatch("pingpong", "ping-pong")`),false);
  assert.equal(a.run(`answersMatch("ping–pong", "ping-pong")`),true);
  assert.equal(a.run(`answersMatch("sp.ort", "sport")`),false);
  assert.equal(a.run(`answersMatch("No I can't But I can learn", "No, I can't. But I can learn.")`),true);
});

test('hardware fullwidth slash and touchscreen slash work; textarea typing is untouched',()=>{
  const a=createApp({state:dueOne('phrase|because of sb/sth')});a.run('startToday()');
  let prevented=0;
  for(const key of 'because of sb ／ sth')a.listeners.keydown({key,target:{tagName:'BODY'},preventDefault:()=>prevented++});
  assert.equal(a.run('typed'),'because of sb ／ sth');
  a.listeners.keydown({key:'x',target:{tagName:'TEXTAREA'},preventDefault:()=>{throw Error('textarea swallowed');}});
  a.listeners.keydown({key:'Enter',target:{tagName:'BODY'},preventDefault:()=>prevented++});a.flush();
  assert.equal(a.run('S["phrase|because of sb/sth"].lastResult'),'independent-recall');
  assert.ok(prevented>0);
});

test('same-day completion and repeat/reload keep the same allocation and do not advance the route',()=>{
  const a=createApp();const first=a.json('S.meta.dailyPlan.entries.map(e=>e.key)');
  a.run('startToday()');for(let i=0;i<4;i++)completeNew(a);
  assert.equal(a.run('S.meta.dailyPlan.baseCompleted'),true);
  assert.equal(a.run('S.meta.day'),1);assert.equal(a.run('S.meta.stickers'),1);
  a.run('startToday();startToday();refresh()');
  assert.deepEqual(a.json('S.meta.dailyPlan.entries.filter(e=>e.mode!=="retest").map(e=>e.key)'),first);
  assert.equal(a.run('current'),null);
  const b=createApp({storage:a.storage});b.run('startToday()');
  assert.equal(b.run('current'),null);assert.equal(b.run('S.meta.stickers'),1);
  assert.equal(b.run('S.meta.dailyPlan.entries.length'),4);
});

test('partial stage and typed text resume after reload; feedback saves next stage before animation',()=>{
  const a=createApp();a.run('startToday();advance();advance()');
  a.nodes.choiceGrid.children.find(b=>b.textContent===a.run('current.en')).onclick();a.flush();
  a.run('tap("s");tap("p")');
  const b=createApp({storage:a.storage});b.run('startToday()');
  assert.equal(b.run('stage'),3);assert.equal(b.run('typed'),'sp');
  submit(b,'sport'); // Intentionally reload before the feedback timer fires.
  const c=createApp({storage:b.storage});c.run('startToday()');
  assert.equal(c.run('stage'),4);assert.equal(c.run('typed'),'');
});

test('next-day review starts at local midnight, not after exactly 24 hours',()=>{
  const start=new Date(2026,9,7,23,55).getTime(),a=createApp({now:start});
  a.run('startToday()');for(let i=0;i<4;i++)completeNew(a);
  assert.equal(a.run('S["word|sport"].dueDay'),'2026-10-08');
  assert.equal(a.run('S["word|sport"].due'),new Date(2026,9,8).getTime());
  a.setNow(new Date(2026,9,8,0,1).getTime());a.run('startToday()');
  assert.equal(a.run('S.meta.day'),2);assert.equal(a.run('current._mode'),'review');
  assert.equal(a.run('S.meta.dailyPlan.entries.filter(e=>e.mode==="review").length'),4);
  a.run('startToday();refresh()');assert.equal(a.run('S.meta.day'),2);
});

test('wrong then correction retains a ten-minute retest across reload and never counts as independent recall',()=>{
  const a=createApp({state:dueOne()});a.run('startToday()');submit(a,'spurt');
  const due=a.run('S["word|sport"].relearnAt');assert.equal(due,TODAY+600000);
  submit(a,'sport');a.flush();
  assert.equal(a.run('S["word|sport"].relearnAt'),due);
  assert.equal(a.run('S["word|sport"].dueDay'),'2026-10-08');
  assert.equal(a.run('S["word|sport"].independentRecallDay'),undefined);
  assert.equal(a.run('S.meta.dailyPlan.entries.filter(e=>e.mode==="retest"&&!e.done).length'),1);
  const b=createApp({storage:a.storage,now:TODAY+599999});b.run('startToday()');assert.equal(b.run('current'),null);
  b.setNow(due);b.run('startToday()');assert.equal(b.run('current._mode'),'retest');
  submit(b,'sport');b.flush();assert.equal(b.run('S["word|sport"].relearnAt'),0);
  assert.equal(b.run('S["word|sport"].independentRecallDay'),undefined);
  b.setNow(new Date(2026,9,8,1).getTime());review(b);
  assert.equal(b.run('S["word|sport"].independentRecallDay'),'2026-10-08');
  assert.equal(b.run('S["word|sport"].dueDay'),'2026-10-11');
});

test('new learning with an earlier hint still schedules tomorrow, but a dictation correction retains retest',()=>{
  const a=createApp();a.run('startToday();activeEntry().assisted=true;activeEntry().stage=6;stage=6');submit(a,'sport');a.flush();
  assert.equal(a.run('S["word|sport"].dueDay'),'2026-10-08');
  assert.equal(a.run('S["word|sport"].independentRecallDay'),undefined);
  a.run('activeEntry().stage=6;stage=6');submit(a,'wrong');submit(a,'jump');a.flush();
  assert.equal(a.run('S["word|jump"].relearnAt'),TODAY+600000);
});

test('a long-gap backlog is oldest-due-first, capped, deduplicated, and postpones new items',()=>{
  const state=learnedFixture();let n=0;
  for(const [key,value]of Object.entries(state))if(key!=='meta'){value.dueDay=n++<15?'2026-09-01':'2026-09-02';value.due=new Date(value.dueDay+'T00:00:00').getTime();}
  state['word|star'].passed=0;
  const a=createApp({state});assert.equal(a.run('S.meta.dailyPlan.entries.length'),8);
  assert.equal(a.run('S.meta.dailyPlan.backlog'),41);assert.equal(a.run('todaysItems().length'),0);
  const keys=a.json('S.meta.dailyPlan.entries.map(e=>e.key)');assert.equal(new Set(keys).size,8);
  a.run('startToday()');for(let i=0;i<8;i++){submit(a,a.run('current.en'));a.flush();}
  a.run('startToday()');assert.equal(a.run('current'),null);assert.equal(a.run('S.meta.dailyPlan.entries.length'),8);
  a.setNow(new Date(2026,9,8,9).getTime());a.run('startToday()');
  assert.equal(a.run('S.meta.dailyPlan.entries.length'),8);assert.equal(a.run('S.meta.dailyPlan.backlog'),33);
  assert.equal(a.run('S.meta.dailyPlan.entries.some(e=>e.key==="word|sport")'),false);
});

test('graduation is distributed independent recall, preserves legacy rewards, and never rebuilds all 49',()=>{
  const state=dueOne();for(const [key,value]of Object.entries(state))if(key!=='meta')value.independentRecallDay='2026-10-01';
  delete state['word|sport'].independentRecallDay;
  const a=createApp({state});assert.equal(a.run('S.meta.dailyPlan.entries.length'),1);
  review(a);assert.equal(a.run('S.meta.graduated'),true);a.run('startToday()');assert.equal(a.run('current'),null);
  assert.equal(a.run('S.meta.dailyPlan.entries.length'),1);
  const old=learnedFixture();old.meta.graduated=true;
  const b=createApp({state:old});assert.equal(b.run('S.meta.graduated'),true);assert.equal(b.run('S.meta.dailyPlan.entries.length'),0);
});

test('legacy migration preserves counters, unknown fields, rewards, and known storage key',()=>{
  const state={meta:{day:8,stickers:7,doneDays:{d1:true},graduated:true,cat:{name:'Mimi'},custom:'keep'},
    'word|sport':{seen:12,wrong:3,passed:1,due:new Date(2026,9,7,23,55).getTime(),reviewStep:3,lastReview:new Date(2026,9,1,20).getTime(),unknown:['keep']},shop:{coins:99}};
  const a=createApp({state});const s=a.snapshot();
  for(const key of ['seen','wrong','passed','due','reviewStep','lastReview','unknown'])assert.deepEqual(s['word|sport'][key],state['word|sport'][key]);
  assert.deepEqual(s.meta.cat,state.meta.cat);assert.deepEqual(s.shop,state.shop);assert.equal(s.meta.graduated,true);
  assert.equal(s['word|sport'].dueDay,'2026-10-07');assert.equal(a.run('dueReviews().length'),1);
  assert.deepEqual([...a.storage.keys()].sort(),[KEY,BACKUP_KEY,BACKUP_INFO_KEY].sort());
});

test('synthetic export/import roundtrip keeps the daily queue, answer, and unknown progress',()=>{
  const a=createApp({state:{meta:{day:4,stickers:3,doneDays:{d1:true},graduated:false,cat:{food:2}},shop:{coins:19}}});
  a.run('startToday();advance();tap("a");exportProgress()');const original=a.snapshot(),code=a.nodes.progressCode.textContent;
  const b=createApp();b.nodes.importCode.value=code;b.run('importProgress()');
  assert.deepEqual(b.snapshot(),original);b.run('startToday()');assert.equal(b.run('stage'),1);assert.equal(b.run('typed'),'a');
  assert.equal(b.run('S.shop.coins'),19);
});

test('bad imports are atomic and invalid stored JSON is never overwritten',()=>{
  const a=createApp();const before=a.snapshot();
  for(const value of [null,[],{meta:[]},{meta:{day:'bad'}},{meta:{day:1},'word|sport':{wrong:'oops'}},{meta:{dailyPlan:{version:2}}}]){
    a.context.bad=value;a.nodes.importCode.value=a.run('encodeState(bad)');a.run('importProgress()');assert.deepEqual(a.snapshot(),before);
  }
  for(const raw of ['null','[]','{broken',JSON.stringify({meta:{day:NaN}})]){
    const b=createApp({raw});assert.equal(b.storage.get(KEY),raw);assert.match(b.nodes.plan.textContent,/无法读取/);
  }
});

test('unavailable storage warns honestly rather than claiming saved progress',()=>{
  const a=createApp({failWrites:true});assert.match(a.nodes.plan.textContent,/不能保存进度/);assert.doesNotMatch(a.nodes.plan.textContent,/今天的安排已保存/);
});

test('double correct submit is counted once and navigation cancels stale feedback callbacks',()=>{
  const a=createApp({state:dueOne()});a.run('startToday()');submit(a,'sport');submit(a,'sport');
  assert.equal(a.run('S["word|sport"].seen'),2);assert.equal(a.run('S["word|sport"].reviewStep'),2);
  a.run('show("parent")');a.flush();assert.equal(a.nodes.parent.classList.contains('active'),true);
  const b=createApp({storage:a.storage});b.run('startToday()');assert.equal(b.run('current'),null);assert.equal(b.run('S.meta.stickers'),14);
});

test('a struggling item gets at most two short retests and remains due tomorrow',()=>{
  const a=createApp({state:dueOne()});
  for(let round=0;round<3;round++){
    a.run('startToday()');submit(a,'wrong');submit(a,'sport');a.flush();
    a.setNow(a.now()+600000);
  }
  assert.equal(a.run('S.meta.dailyPlan.entries.filter(e=>e.mode==="retest").length'),2);
  assert.equal(a.run('S["word|sport"].relearnAt'),0);assert.equal(a.run('S["word|sport"].dueDay'),'2026-10-08');
  assert.equal(a.nodes.todayCount.textContent,1);assert.equal(a.nodes.reviewCount.textContent,1);
  a.run('startToday()');assert.equal(a.run('current'),null);
});

test('speech uses the full phrase and unavailable playback has a visible explanation',()=>{
  const a=createApp({state:dueOne('phrase|because of sb/sth')});a.run('startToday();speakCurrent()');
  assert.match(a.alerts.at(-1),/不能播放语音/);
  const spoken=[];a.context.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  a.context.speechSynthesis={cancel(){},speak(u){spoken.push(u);}};a.context.window.speechSynthesis=a.context.speechSynthesis;
  a.run('speakCurrent()');assert.equal(spoken[0].text,'because of sb/sth');assert.equal(spoken[0].lang,'en-GB');
});


test('a slow correction still leaves a real ten-minute gap before short retest',()=>{
  const a=createApp({state:dueOne()});a.run('startToday()');submit(a,'wrong');
  a.setNow(TODAY+20*60000);submit(a,'sport');a.flush();
  assert.equal(a.run('S["word|sport"].relearnAt'),TODAY+30*60000);
  assert.equal(a.run('current'),null);
  a.setNow(TODAY+30*60000);a.run('startToday()');assert.equal(a.run('current._mode'),'retest');
});


test('home retest summary distinguishes waiting from ready now on refresh',()=>{
  const a=createApp({state:dueOne()});a.run('startToday()');submit(a,'wrong');submit(a,'sport');a.flush();
  assert.match(a.nodes.plan.textContent,/约 10 分钟/);
  a.setNow(TODAY+9*60000);a.run('refresh()');assert.match(a.nodes.plan.textContent,/约 1 分钟/);
  a.setNow(TODAY+10*60000);a.run('refresh()');assert.match(a.nodes.plan.textContent,/现在可以做/);
});
