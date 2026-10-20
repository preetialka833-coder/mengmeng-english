'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createApp,completeNew,submit,KEY}=require('./english-harness');
function stageThree(a){a.run('startToday();advance();advance()');a.nodes.choiceGrid.children.find(b=>b.textContent===a.run('current.en')).onclick();a.flush();}
for(const action of ['tap("x")','backspace()','submitAnswer()','startToday()','show("parent")','setDayPrompt()','persist()','migrateReviewData()','refresh()','exportProgress()','importProgress()']){
 test('stale page cannot overwrite newer progress via '+action,()=>{
  const storage=new Map(),a=createApp({storage}),b=createApp({storage});stageThree(b);
  // Opening A again supplies the latest legitimate baseline after B's setup.
  const fresh=createApp({storage});fresh.run('startToday()');completeNew(fresh);
  const raw=storage.get(KEY);b.nodes.importCode.value=b.run('encodeState(S)');
  b.run(action);b.flush();b.run(action);
  assert.equal(storage.get(KEY),raw);assert.equal(b.run('progressConflict'),true);assert.equal(b.nodes.progressConflictNotice.hidden,false);
  const reloaded=createApp({storage});assert.equal(reloaded.run('progressConflict'),false);assert.equal(reloaded.run('S["word|sport"].passed'),1);
 });
}
test('cross-day refresh and delayed animation freeze rather than generate stale plans',()=>{
 const a=createApp(),b=createApp({storage:a.storage});stageThree(b);submit(b,'sport');
 const fresh=createApp({storage:a.storage});fresh.run('S.meta.stickers=9;save()');const raw=a.storage.get(KEY);
 b.setNow(new Date(2026,9,8).getTime());b.flush();b.run('refresh();startToday()');
 assert.equal(a.storage.get(KEY),raw);assert.equal(b.run('progressConflict'),true);
});
test('storage notifications freeze; corrupt, removed and unreadable versions do not get overwritten',()=>{
 for(const value of [null,'', '{broken']){
  const a=createApp();if(value===null)a.storage.delete(KEY);else a.storage.set(KEY,value);
  a.listeners.storage({key:KEY});a.run('startToday();save()');
  assert.equal(a.storage.get(KEY)??null,value);assert.equal(a.run('progressConflict'),true);
 }
 const a=createApp();a.context.localStorage.getItem=()=>{throw Error('denied')};a.run('startToday()');assert.equal(a.run('progressConflict'),true);
});
test('write failure and failed readback never advance the version baseline',()=>{
 let arm=false;const a=createApp({mutateWrite:(k,v)=>arm&&k===KEY?'{}':v});
 const baseline=a.run('expectedRaw');arm=true;a.run('S.meta.stickers++;persist()');
 assert.equal(a.run('expectedRaw'),baseline);assert.equal(a.run('progressConflict'),true);
 const b=createApp();const before=b.run('expectedRaw');b.context.localStorage.setItem=()=>{throw Error('quota')};b.run('S.meta.stickers++;persist()');assert.equal(b.run('expectedRaw'),before);assert.ok(b.run('storageWarning'));
});
test('non-atomic compare/write residual window is explicitly reproducible',()=>{
 const storage=new Map();let b,arm=false;
 const a=createApp({storage,mutateWrite:(k,v)=>{if(arm&&k===KEY){arm=false;b.run('tap("y")');}return v;}});
 stageThree(a);b=createApp({storage});b.run('startToday()');arm=true;a.run('tap("x")');
 assert.equal(b.run('typed'),'y');assert.equal(JSON.parse(storage.get(KEY)).meta.dailyPlan.entries[0].typed,'x');
 // This intentionally demonstrates the limitation, not a passing zero-race claim.
 b.listeners.storage({key:KEY});assert.equal(b.run('progressConflict'),true);
});
test('masked input instructs whole word, phrase, sb/sth and sentence without leaking recall answers',()=>{
 const a=createApp();stageThree(a);assert.match(a.nodes.spellTip.textContent,/输入完整单词/);submit(a,'sport');a.flush();
 for(const kind of ['phrase','sentence']){
  a.run(`current=allItems().find(x=>x.kind==='${kind}');stage=3;renderPattern()`);
  assert.match(a.nodes.spellTip.textContent,kind==='phrase'?/完整短语/:/完整句子/);
 }
 a.run('current=allItems().find(x=>x.en==="because of sb/sth");stage=3;renderPattern()');assert.match(a.nodes.spellTip.textContent,/sb \/ sth/);
 a.run('stage=6;renderPattern()');assert.equal(a.nodes.pattern.textContent.includes('because'),false);
});
test('startup unreadable then restored nonempty source can be explicitly imported after backup and recheck',()=>{
 const original=JSON.stringify({meta:{day:1,stickers:4,doneDays:{}}}),storage=new Map([[KEY,original]]);let first=true;
 const a=createApp({storage,readOverride:(k,v)=>{if(k===KEY&&first){first=false;throw Error('startup read denied')}return v;}});
 assert.equal(a.run('initialReadOK'),false);assert.equal(storage.get(KEY),original);
 a.nodes.importCode.value=a.run('encodeState({meta:{day:2,stickers:7,doneDays:{}}})');a.run('importProgress()');
 assert.equal(a.run('progressConflict'),false);assert.equal(JSON.parse(storage.get(KEY)).meta.stickers,7);
 assert.equal(storage.get(KEY+'_before_review_v2'),original);
});
test('startup recovery never accepts a source changed while its backup is being verified',()=>{
 const original=JSON.stringify({meta:{day:1,stickers:4,doneDays:{}}}),newer=JSON.stringify({meta:{day:1,stickers:9,doneDays:{}}});
 const storage=new Map([[KEY,original]]);let first=true,arm=false;
 const a=createApp({storage,readOverride:(k,v)=>{if(k===KEY&&first){first=false;throw Error('startup denial')}return v;},mutateWrite:(k,v)=>{if(arm&&k===KEY+'_before_review_v2_info')storage.set(KEY,newer);return v;}});
 arm=true;a.nodes.importCode.value=a.run('encodeState({meta:{day:2,stickers:7,doneDays:{}}})');a.run('importProgress()');
 assert.equal(a.run('progressConflict'),true);assert.equal(storage.get(KEY),newer);assert.notEqual(a.run('S.meta.stickers'),7);
});
test('frozen current export cannot copy stale code or placeholder; original snapshot still copies',async()=>{
 const a=createApp({state:{meta:{day:1,stickers:4,doneDays:{}}}}),copied=[];a.context.navigator.clipboard.writeText=async text=>copied.push(text);
 a.run('exportProgress()');a.storage.set(KEY,'{}');await a.run('copyProgress()');assert.equal(copied.length,0);
 a.run('exportOriginalBackup()');const raw=a.nodes.progressCode.textContent;await a.run('copyProgress()');assert.deepEqual(copied,[raw]);
 const b=createApp();let count=0;b.context.navigator.clipboard.writeText=async()=>count++;b.storage.delete(KEY);await b.run('copyProgress()');assert.equal(b.run('progressConflict'),true);assert.equal(count,0);
});
test('current copy regenerates code after normal learning in this page',async()=>{
 const a=createApp(),copied=[];a.context.navigator.clipboard.writeText=async text=>copied.push(text);
 a.run('exportProgress()');const old=a.nodes.progressCode.textContent;a.run('startToday()');completeNew(a);
 await a.run('copyProgress()');assert.notEqual(copied[0],old);a.context.copied=copied[0];assert.equal(a.run('readProgressCode(copied)["word|sport"].passed'),1);
});
test('pending clipboard completion checks its captured type/code even if export type changes',async()=>{
 const a=createApp({state:{meta:{day:1,stickers:4,doneDays:{}}}});let finish;
 a.context.navigator.clipboard.writeText=()=>new Promise(resolve=>finish=resolve);
 a.run('exportProgress()');const pending=a.run('copyProgress()');a.run('S.meta.stickers++;save();exportOriginalBackup()');finish();await pending;
 assert.match(a.alerts.at(-1),/剪贴板可能仍是旧码/);
});
test('valid import with unreadable storage reports storage failure, not invalid progress code',()=>{
 const a=createApp();a.nodes.importCode.value=a.run('encodeState(S)');a.run('initialReadOK=false');a.context.localStorage.getItem=()=>{throw Error('storage denial')};
 a.run('importProgress()');assert.equal(a.run('progressConflict'),true);assert.match(a.alerts.at(-1),/存储暂时无法核对/);assert.doesNotMatch(a.alerts.at(-1),/进度码无效/);
});
