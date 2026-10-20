const {test,expect}=require('@playwright/test');
const KEY='mengmeng_v4_unit1';
async function masked(page){
 await page.goto('/english.html');
 await page.evaluate(()=>{startToday();advance();advance();});
 await page.locator('#choiceGrid button').filter({hasText:'sport'}).click();
 await expect(page.locator('#spellTip')).toContainText('输入完整单词');
}
for(const viewport of [{width:390,height:844},{width:768,height:1024}]){
 test(`upgrade viewport ${viewport.width}: masked keyboard, conflict notice and math fit`,async({page})=>{
  await page.setViewportSize(viewport);await masked(page);
  await page.keyboard.type('sp');await page.reload();await page.evaluate(()=>startToday());
  await expect(page.locator('#answerBox')).toHaveText('sp');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.locator('.keyboard').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('.key')].every(k=>{const b=k.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right;});})).toBe(true);
  await page.screenshot({path:`test-results/upgrade-english-${viewport.width}.png`,fullPage:true});
  for(const letter of ['O','R','T'])await page.getByRole('button',{name:letter,exact:true}).click();
  await page.locator('.key.ok').click();await expect(page.locator('#stageName')).toHaveText('缺 2 个字母');
  for(const unit of [1,2]){
   await page.goto(`/math-unit${unit}.html`);
   await page.locator('.knowledge summary').click();
   await expect(page.locator('#assistanceNote')).toContainText('有帮助');
   await page.reload();await expect(page.locator('#assistanceNote')).toContainText('有帮助');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/upgrade-math${unit}-${viewport.width}.png`,fullPage:true});
  }
 });
}
test('real browser stale tab inputs/submits/navigation/import/timer cannot replace newer stored progress',async({page,context})=>{
 await masked(page);const b=await context.newPage();await b.goto('/english.html');await b.evaluate(()=>startToday());
 await page.evaluate(()=>{typed='sport';activeEntry().typed=typed;submitAnswer();});
 const raw=await page.evaluate(key=>localStorage.getItem(key),KEY);
 await expect(b.locator('#progressConflictNotice')).toBeVisible();
 await b.evaluate(()=>{tap('x');backspace();submitAnswer();startToday();show('parent');importCode.value=encodeState(S);importProgress();refresh();});
 expect(await b.evaluate(key=>localStorage.getItem(key),KEY)).toBe(raw);
 await b.reload();await b.evaluate(()=>startToday());await expect(b.locator('#stageName')).toHaveText('缺 2 个字母');
 await b.close();
});
test('near-simultaneous real tabs: valid surviving write and conflict notification, no zero-race guarantee',async({page,context})=>{
 for(let i=0;i<12;i++){
  await page.goto('/english.html');await page.evaluate(()=>localStorage.clear());await page.reload();await masked(page);
  const b=await context.newPage();await b.goto('/english.html');await b.evaluate(()=>startToday());
  await Promise.all([page.evaluate(()=>tap('x')),b.evaluate(()=>tap('y'))]);
  await expect.poll(async()=>await page.evaluate(()=>progressConflict)||await b.evaluate(()=>progressConflict)).toBe(true);
  const value=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).meta.dailyPlan.entries[0].typed,KEY);
  expect(['x','y']).toContain(value);await b.close();
 }
});
test('neutral unit link and same-day math has no delayed evidence; completed help does not change rewards',async({page})=>{
 await page.goto('/math.html');await expect(page.getByText('正在学，先练这个')).toHaveCount(0);await expect(page.getByRole('link',{name:'练习第二单元'})).toBeVisible();
 await page.goto('/math-unit1.html');
 const result=await page.evaluate(()=>{
  function one(){picked=[BANK[0]];current=0;finished={};assisted={};tries={};hintLevels={};answers={};outcomes={};knowledgeUsed=false;checkMC(0,picked[0].a);}
  one();one();const xp=localStorage.getItem('math_xp');knowledgeHelp();
  return {verified:st(BANK[0].id).recallVerifiedDay||null,xp,after:localStorage.getItem('math_xp')};
 });
 expect(result.verified).toBeNull();expect(result.xp).toBe(result.after);
});
test('initial storage read denial can recover by importing after verified source backup',async({page})=>{
 await page.addInitScript(key=>{
  localStorage.setItem(key,JSON.stringify({meta:{day:1,stickers:4,doneDays:{}}}));
  const get=Storage.prototype.getItem;let once=true;
  Storage.prototype.getItem=function(k){if(k===key&&once){once=false;throw Error('synthetic initial denial');}return get.call(this,k);};
 },KEY);
 await page.goto('/english.html');expect(await page.evaluate(()=>initialReadOK)).toBe(false);
 const result=await page.evaluate(()=>{
  importCode.value=encodeState({meta:{day:2,stickers:7,doneDays:{}}});importProgress();
  return {conflict:progressConflict,stickers:JSON.parse(localStorage.getItem(KEY)).meta.stickers,backup:JSON.parse(localStorage.getItem(BACKUP_KEY)).meta.stickers};
 });
 expect(result).toEqual({conflict:false,stickers:7,backup:4});
});
test('current progress clipboard code includes learning since last export',async({page})=>{
 await page.goto('/english.html');
 const result=await page.evaluate(async()=>{
  let copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text;}}});
  exportProgress();const old=progressCode.textContent;S.meta.stickers=6;save();await copyProgress();
  return {changed:copied!==old,stickers:readProgressCode(copied).meta.stickers};
 });
 expect(result).toEqual({changed:true,stickers:6});
});
