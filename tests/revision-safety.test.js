'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadPage}=require('./audit-harness');
const file=u=>u===1?'english.html':`english-unit${u}.html`,key=u=>`mengmeng_v4_unit${u}`;
for(const [from,to] of [[2,1],[3,6],[6,3],[1,2]])for(const mode of ['empty','shared','graduated','original']){
 test(`tagged ${mode} code from Unit${from} is rejected by Unit${to} without any storage mutation`,()=>{
  const raw=JSON.stringify({meta:{day:9,stickers:22,doneDays:{d1:true},graduated:mode==='graduated'},'phrase|go out':{wrong:7,passed:1},foreign:{keep:true}});
  const a=loadPage(file(from),{[key(from)]:raw});
  if(mode==='empty')a.eval('S.meta.dailyPlan.entries=[]');
  if(mode==='shared')a.eval('delete S.meta.dailyPlan');
  a.eval(mode==='original'?'exportOriginalBackup()':'exportProgress()');const code=a.get('progressCode').textContent;
  const decoded=JSON.parse(Buffer.from(code,'base64').toString('utf8'));assert.equal(decoded.unit,from);if(mode==='original')assert.equal(decoded.raw,raw);
  const b=loadPage(file(to)),before=Object.fromEntries(b.storage);b.get('importCode').value=code;b.eval('importProgress()');
  assert.deepEqual(Object.fromEntries(b.storage),before);assert.equal(b.eval('S.meta.graduated'),false);assert.equal(b.eval('S.meta.stickers'),0);assert.match(b.alerts.at(-1),/不属于本单元/);
 });
}
test('all same-unit tagged exports import; historical raw Unit1 exports retain legacy rewards and unknown fields',()=>{
 for(let u=1;u<=6;u++){const a=loadPage(file(u));a.eval('S.meta.stickers=3;S.legacy={nested:[1,2]};save();exportProgress()');const b=loadPage(file(u));b.get('importCode').value=a.get('progressCode').textContent;b.eval('importProgress()');assert.equal(b.eval('S.meta.stickers'),3);assert.deepEqual(b.json('S.legacy'),{nested:[1,2]});}
 const raw={meta:{day:9,stickers:12,doneDays:{d1:true},graduated:true},custom:{old:true}};
 const code=Buffer.from(JSON.stringify(raw)).toString('base64'),a=loadPage('english.html');a.get('importCode').value=code;a.eval('importProgress()');assert.equal(a.eval('S.meta.graduated'),true);assert.equal(a.eval('S.custom.old'),true);
 const b=loadPage('english-unit2.html'),before=Object.fromEntries(b.storage);b.get('importCode').value=code;b.eval('importProgress()');assert.deepEqual(Object.fromEntries(b.storage),before);
});
for(const mode of ['new','review','retest'])test(`held sentence in old ${mode} queue stays preserved and never appears after reload, dictation or day change`,()=>{
 const a=loadPage('english.html'),held='sentence|I keep running for five months.';
 a.eval('S.meta.stickers=9;S.meta.graduated=false;');
 const s=a.json('S');delete s.meta.reviewBackupFreshInstall;const entry={key:held,mode,stage:mode==='new'?5:6,typed:'I keep',assisted:true,done:false,readyAt:0};
 s[held]={seen:4,wrong:3,passed:1,due:0,dueDay:'2026-10-07',custom:{keep:true}};
 s.meta.dailyPlan.entries=mode==='retest'?[{...entry,mode:'review',done:true},entry]:[entry];
 const raw=JSON.stringify(s),b=loadPage('english.html',{[key(1)]:raw});b.eval('startToday()');
 assert.equal(b.eval('current'),null);assert.equal(b.eval('S.meta.stickers'),9);assert.equal(b.eval('S.meta.graduated'),false);assert.equal(b.eval('storageWarning'),'');
 assert.deepEqual(b.json('S["'+held+'"]'),s[held]);assert.deepEqual(b.json('S.meta.dailyPlan.entries'),s.meta.dailyPlan.entries);assert.equal(b.storage.get(key(1)+'_before_review_v2'),raw);
 assert.equal(b.eval('dueReviews().some(x=>HELD_KEYS.has(itemKey(x)))'),false);
 const c=loadPage('english.html',Object.fromEntries(b.storage),{now:'2026-10-08T12:00:00Z'});c.eval('startToday()');assert.equal(c.eval('queue.some(x=>HELD_KEYS.has(itemKey(x)))'),false);assert.deepEqual(c.json('S["'+held+'"]'),s[held]);assert.equal(c.eval('S.meta.stickers'),9);
});
test('suspending an unverified sentence does not lower graduation threshold or mint a voucher',()=>{
 const a=loadPage('english.html');a.eval('allItems().forEach(x=>{st(x.kind,x.en).independentRecallDay=localDay();st(x.kind,x.en).passed=1;st(x.kind,x.en).dueDay="2050-01-01"});S.meta.dailyPlan.entries=[];settlePlan(S.meta.dailyPlan)');assert.equal(a.eval('S.meta.graduated'),false);
});
for(const u of [3,4,5,6,7,8])test(`math${u} scope text does not penalize practice, while answer help persists`,()=>{
 const a=loadPage(`math-unit${u}.html`);assert.equal(a.eval('knowledgeUsed'),false);a.eval('openHint(0,2)');a.get('q0input').value=a.eval('picked[0].a');a.eval('checkText(0)');assert.equal(a.eval('outcomes[0]'),'assisted');
 const b=loadPage(`math-unit${u}.html`,Object.fromEntries(a.storage));assert.equal(b.eval('hintLevels[0][2]'),true);assert.equal(b.eval('outcomes[0]'),'assisted');
});
test('Unit2 graduation is reachable after all 55 active entries have evidence, without learning must',()=>{
 const a=loadPage('english-unit2.html');a.eval('allItems().forEach(x=>st(x.kind,x.en).independentRecallDay=localDay());S.meta.dailyPlan.entries=[];settlePlan(S.meta.dailyPlan);save()');assert.equal(a.eval('S.meta.graduated'),true);assert.equal(a.eval('S["word|must"]'),undefined);
});
test('a held-only legacy retest does not produce a ready or waiting home notification',()=>{
 const a=loadPage('english.html');a.eval('S.meta.dailyPlan.entries=[{key:"sentence|I keep running for five months.",mode:"review",stage:6,typed:"",assisted:false,done:true,readyAt:0},{key:"sentence|I keep running for five months.",mode:"retest",stage:6,typed:"",assisted:false,done:false,readyAt:0}];refresh();startToday();refresh()');assert.equal(a.eval('current'),null);assert.doesNotMatch(a.get('plan').textContent,/短复习/);
});
test('checking graduation when other48 are verified never normalizes, creates or rewrites held history',()=>{
 const held='sentence|I keep running for five months.',a=loadPage('english.html');a.eval('allItems().forEach(x=>st(x.kind,x.en).independentRecallDay=localDay())');
 const old={seen:4,wrong:3,passed:1,due:0,custom:{keep:true}},s=a.json('S');s[held]=old;delete s.meta.reviewBackupFreshInstall;
 let b=loadPage('english.html',{[key(1)]:JSON.stringify(s)});b.eval('settlePlan(S.meta.dailyPlan);save();refresh()');assert.deepEqual(b.json('S["'+held+'"]'),old);assert.equal(b.eval('S.meta.graduated'),false);
 b=loadPage('english.html',Object.fromEntries(b.storage));assert.deepEqual(b.json('S["'+held+'"]'),old);b.eval('delete S["sentence|I keep running for five months."];settlePlan(S.meta.dailyPlan);save()');assert.equal(b.eval('S["'+held+'"]'),undefined);
});
