const {test,expect}=require('@playwright/test');
test('held-only home queue and raw record remain untouched; Unit2 completion remains reachable',async({page})=>{
 page.on('dialog',d=>d.dismiss());await page.goto('/english.html');
 const raw=await page.evaluate(()=>{allItems().forEach(x=>st(x.kind,x.en).independentRecallDay=localDay());S['sentence|I keep running for five months.']={seen:4,wrong:3,passed:1,due:0,custom:{keep:true}};S.meta.dailyPlan.entries=[{key:'sentence|I keep running for five months.',mode:'review',stage:6,typed:'',assisted:false,done:true,readyAt:0},{key:'sentence|I keep running for five months.',mode:'retest',stage:6,typed:'',assisted:false,done:false,readyAt:0}];const raw=JSON.stringify(S['sentence|I keep running for five months.']);settlePlan(S.meta.dailyPlan);save();refresh();return raw;});
 await expect(page.locator('#plan')).not.toContainText('短复习');await page.reload();await page.evaluate(()=>{startToday();refresh();});expect(await page.evaluate(()=>current)).toBe(null);expect(await page.evaluate(()=>JSON.stringify(S['sentence|I keep running for five months.']))).toBe(raw);expect(await page.evaluate(()=>S.meta.graduated)).toBe(false);
 await page.goto('/english-unit2.html');await page.evaluate(()=>{allItems().forEach(x=>st(x.kind,x.en).independentRecallDay=localDay());S.meta.dailyPlan.entries=[];settlePlan(S.meta.dailyPlan);save();});await page.reload();expect(await page.evaluate(()=>S.meta.graduated)).toBe(true);expect(await page.evaluate(()=>S['word|must'])).toBe(undefined);
});
test('real browser rejects Unit2 graduated current/original codes before replacing Unit1 storage',async({page})=>{
 page.on('dialog',d=>d.dismiss());await page.goto('/english-unit2.html');
 await page.evaluate(()=>{localStorage.setItem(KEY,JSON.stringify({meta:{day:9,stickers:30,doneDays:{},graduated:true}}));});await page.reload();
 const codes=await page.evaluate(()=>{S.meta.dailyPlan.entries=[];save();exportProgress();const current=progressCode.textContent;exportOriginalBackup();return [current,progressCode.textContent];});
 for(const code of codes)expect(JSON.parse(Buffer.from(code,'base64').toString('utf8')).unit).toBe(2);
 await page.goto('/english.html');await page.locator('#nav-parent').click();const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
 for(const code of codes){await page.locator('#importCode').fill(code);await page.getByRole('button',{name:'恢复进度',exact:true}).click();expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).toBe(before);expect(await page.evaluate(()=>S.meta.graduated)).toBe(false);}
});
for(const width of [390,768])test(`all 14 diagrams fit ${width}px; scope disclosure stays independent; final answer help survives reload`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:1024});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const u of [4,6]){
  await page.goto(`/math-unit${u}.html`);await page.locator('.scopeNote summary').click();expect(await page.evaluate(()=>knowledgeUsed)).toBe(false);
  await page.evaluate(()=>{newSession();saveSession();render();});expect(await page.evaluate(()=>knowledgeUsed)).toBe(false);await page.reload();expect(await page.evaluate(()=>knowledgeUsed)).toBe(false);
  const count=await page.evaluate(()=>BANK.length);
  for(let n=0;n<count;n++){
   await page.evaluate(n=>{picked=[BANK[n]];current=0;finished={};assisted={};hintLevels={};answers={};outcomes={};render();},n);
   await expect(page.locator('.questionDiagram svg')).toHaveCount(1);expect(await page.locator('.questionDiagram svg').getAttribute('aria-label')).toBeTruthy();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`test-results/diagram-u${u}-${n+1}-${width}.png`,fullPage:true});await page.locator('.questionDiagram').screenshot({path:`test-results/figure-u${u}-${n+1}-${width}.png`});
  }
  await page.reload();await page.getByText('🔎 查看答案／解析',{exact:true}).click();await expect(page.locator('#assistanceNote')).toContainText('有帮助');await page.reload();await expect(page.locator('.questionHint').nth(2)).toHaveAttribute('open','');await expect(page.locator('#assistanceNote')).toContainText('有帮助');
 }
 expect(errors).toEqual([]);
});
