'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {loadPage}=require('./audit-harness');
const root=path.resolve(__dirname,'..'),review=JSON.parse(fs.readFileSync(path.join(root,'data/english-source-review.json'))),math=JSON.parse(fs.readFileSync(path.join(root,'data/math-original-banks.json')));
const englishName=u=>u===1?'english.html':`english-unit${u}.html`;
for(const [u,n] of [[1,48],[2,55],[3,47],[4,40],[5,44],[6,43]]){
 test(`English unit ${u}: bounded own-key practice and exact-answer acceptance`,()=>{
  const a=loadPage(englishName(u));assert.equal(a.eval('allItems().length'),n);assert.equal(a.eval('KEY'),`mengmeng_v4_unit${u}`);
  assert.equal(a.eval('allItems().every(x=>answersMatch(x.en,x.en))'),true);assert.equal(a.eval('S.meta.dailyPlan.entries.length'),4);
  a.eval('startToday()');assert.ok(a.eval('current'));assert.equal(a.get('todayCount').textContent,4);
  if(u>1){a.eval('speakCurrent()');assert.match(a.get('audioStatus').textContent,/设备朗读未能播放/);assert.equal(a.eval('recordedAudioFor(current)'),null);}
  else assert.equal(a.eval('recordedAudioFor(current)'),'./audio/english/words-01.mp3');
 });
}
test('all 279 source entries remain accounted for; must is explicitly held and old Daming retained',()=>{
 assert.equal(review.items.length,279);assert.equal(review.units.reduce((n,u)=>n+u.activeCount,0),277);
 const held=review.items.filter(x=>x.status==='held');assert.equal(held.length,2);assert.equal(held.find(x=>x.unit===2).originalEn,'must');assert.equal(held.find(x=>x.unit===2).originalZh,'应该');
 const a=loadPage('english-unit2.html');assert.equal(a.eval('allItems().some(x=>x.en==="must")'),false);
 const old=loadPage('english.html');assert.equal(old.eval('allItems().some(x=>x.en==="What can Daming do?")'),true);
 assert.equal(review.imageReviewComplete,true);
});
test('unit2 practice cannot rewrite unit1 partial stage, raw record, backup or rewards',()=>{
 const key='mengmeng_v4_unit1',a=loadPage('english.html',{[key]:JSON.stringify({meta:{day:4,stickers:5,doneDays:{d1:true},legacy:'keep'},customLegacy:{keep:true}})});
 a.eval('startToday();advance();advance()');const target=a.eval('current.en');a.get('choiceGrid').children.find(b=>b.textContent===target).click();a.flush();a.eval('tap("s");tap("p")');
 const saved=Object.fromEntries(a.storage),b=loadPage('english-unit2.html',saved);b.eval('startToday();advance();tap("x");save()');
 for(const [k,v] of Object.entries(saved))assert.equal(b.storage.get(k),v,k);
 const reload=loadPage('english.html',Object.fromEntries(b.storage));reload.eval('startToday()');assert.equal(reload.eval('stage'),3);assert.equal(reload.eval('typed'),'sp');assert.equal(reload.eval('S.meta.stickers'),5);assert.equal(reload.eval('S.customLegacy.keep'),true);
});
test('same phrases in units3 and6 are separate records, without implicit migration',()=>{
 const a=loadPage('english-unit3.html');a.eval('st("phrase","go out").wrong=4;save()');
 const b=loadPage('english-unit6.html',Object.fromEntries(a.storage));assert.equal(b.eval('st("phrase","go out").wrong'),0);assert.equal(JSON.parse(b.storage.get('mengmeng_v4_unit3'))['phrase|go out'].wrong,4);
});
test('quote typography and ellipsis frames accept practical input but retain contractions and word boundaries',()=>{
 const a=loadPage('english-unit5.html');
 assert.equal(a.eval(`answersMatch("Let's go in a green way!",'Let\\'s go in a “green” way!')`),true);
 assert.equal(a.eval(`answersMatch('lets go in a green way',"Let's go in a “green” way!")`),false);
 assert.equal(a.eval(`answersMatch('from to','from..to...')`),true);assert.equal(a.eval(`answersMatch('fromto','from..to...')`),false);
 const b=loadPage('english-unit3.html');assert.equal(b.eval(`answersMatch('take to','take...to...')`),true);
 const c=loadPage('english-unit6.html');assert.equal(c.eval(`answersMatch("with her mum's help","with her mum’s help")`),true);
});
for(const unit of [3,4,5,6,7,8]){
 test(`original math unit ${unit}: expected bank, saved session, help and rewards use a separate key`,()=>{
  const old={'math-unit1_bank_stats_v1':'{"u1_01":{"ok":7,"custom":"keep"}}',math_xp:'20',math_coins:'30',math_owned:'{"bow":true}'};
  const a=loadPage(`math-unit${unit}.html`,old);assert.equal(a.eval('BANK.length'),math.banks[unit].length);assert.equal(a.eval('KEY'),`math-unit${unit}_bank_stats_v1`);assert.equal(a.eval('picked.length'),Math.min(8,math.banks[unit].length));
  assert.deepEqual(a.json('BANK'),math.banks[unit].map(({audit,origin,...q})=>q));assert.equal(new Set(a.json('BANK.map(q=>q.id)')).size,math.banks[unit].length);
  a.eval('openHint(0,0)');a.get('q0input').value=a.eval('picked[0].a');a.eval('checkText(0)');a.eval('checkText(0)');
  assert.equal(a.eval('outcomes[0]'),'assisted');assert.equal(a.storage.get('math_xp'),'21');assert.equal(a.storage.get('math-unit1_bank_stats_v1'),old.math_unit1??old['math-unit1_bank_stats_v1']);assert.equal(a.storage.get('math_owned'),old.math_owned);
  const b=loadPage(`math-unit${unit}.html`,Object.fromEntries(a.storage));assert.equal(b.eval('finished[0]'),true);assert.equal(b.eval('hintLevels[0][0]'),true);assert.equal(b.storage.get('math_xp'),'21');
 });
}
test('verified spatial/figure units contain original SVGs and explicit answer hints, with no general help flag',()=>{
 for(const u of [4,6]){const a=loadPage('math-unit'+u+'.html');assert.ok(a.eval('BANK.every(q=>q.diagram.includes("<svg")&&q.diagram.includes("aria-label"))'));const html=fs.readFileSync(path.join(root,'math-unit'+u+'.html'),'utf8');assert.match(html,/原创配套练习/);assert.doesNotMatch(html,/card knowledge|ontoggle=|帮我拆一步/);}
});

test('all sixteen HTML pages parse, have unique IDs and resolve local links; no private Library identifiers enter candidate data',()=>{
 const pages=fs.readdirSync(root).filter(x=>x.endsWith('.html'));assert.equal(pages.length,16);
 for(const name of pages){const s=fs.readFileSync(path.join(root,name),'utf8');for(const x of s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(x[1]);const markup=s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,name);for(const a of markup.matchAll(/\bhref="([^"#]+)"/g)){const p=a[1].replaceAll('&amp;','&').split(/[?#]/)[0];if(!/^https?:/.test(p))assert.equal(fs.existsSync(path.resolve(root,p)),true,name+' '+p);}}
 assert.doesNotMatch(JSON.stringify(review),/libfile_|sediment:|file_0000/);assert.equal(math.publicationYear,null);
});
