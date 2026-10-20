const {test,expect}=require('@playwright/test');
const KEY='mengmeng_v4_unit1';
async function seed(page,values){await page.addInitScript(values=>{if(sessionStorage.getItem('units-fixture'))return;for(const [k,v] of Object.entries(values))localStorage.setItem(k,v);sessionStorage.setItem('units-fixture','yes');},values);}
test('all English units are navigable, counted and isolated from old partial Unit1 progress',async({page})=>{
 const old={meta:{day:4,stickers:5,doneDays:{d1:true},legacy:'keep'},customLegacy:{keep:true}};
 await seed(page,{[KEY]:JSON.stringify(old)});await page.goto('/english.html');await page.evaluate(()=>{startToday();advance();advance();});await page.locator('#choiceGrid button').filter({hasText:'sport'}).click();await expect(page.locator('#spellTip')).toContainText('完整单词');
 await page.keyboard.type('sp');const original=await page.evaluate(k=>localStorage.getItem(k),KEY),backup=await page.evaluate(k=>localStorage.getItem(k+'_before_review_v2'),KEY);
 for(let u=2;u<=6;u++){
  await page.getByRole('link',{name:new RegExp('^Unit '+u+' ·')}).click();await expect(page.locator('.unitLinks a')).toHaveCount(6);await expect(page.locator('.unitLinks [aria-current]')).toContainText('Unit '+u);
  const n=[48,55,47,40,44,43][u-1];expect(await page.evaluate(()=>allItems().length)).toBe(n);await page.getByRole('button',{name:'开始今天学习',exact:true}).click();
  expect(await page.evaluate(()=>KEY)).toBe('mengmeng_v4_unit'+u);expect(await page.evaluate(k=>localStorage.getItem(k),KEY)).toBe(original);expect(await page.evaluate(k=>localStorage.getItem(k+'_before_review_v2'),KEY)).toBe(backup);
 }
 await page.getByRole('link',{name:/^Unit 1 ·/}).click();await page.getByRole('button',{name:'开始今天学习',exact:true}).click();await expect(page.locator('#answerBox')).toHaveText('sp');expect(await page.evaluate(()=>S.meta.stickers)).toBe(5);
});
test('Unit2 held meaning is visible and new units never request wrong Unit1 recordings',async({page})=>{
 const requests=[];page.on('request',r=>{if(r.url().includes('/audio/english/'))requests.push(r.url());});
 await page.goto('/english-unit2.html');await expect(page.getByText('1项释义待核，暂不计入练习')).toBeVisible();expect(await page.evaluate(()=>allItems().some(x=>x.en==='must'))).toBe(false);
 await page.evaluate(()=>{Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined});});
 await page.getByRole('button',{name:'开始今天学习',exact:true}).click();await page.getByRole('button',{name:'🔊 本机朗读',exact:true}).click();await expect(page.locator('#audioStatus')).toHaveAttribute('data-state','error');expect(requests).toEqual([]);
});
test('new-unit local English speech expands placeholders and remains an explicit click',async({page})=>{
 await page.addInitScript(()=>{
  window.spoken=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[{name:'synthetic local English',lang:'en-US',localService:true}],addEventListener(){},cancel(){},speak(u){window.spoken.push(u.text);u.onstart?.();setTimeout(()=>u.onend?.(),1);}}});
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 });
 await page.goto('/english-unit3.html');await page.getByRole('button',{name:'开始今天学习',exact:true}).click();expect(await page.evaluate(()=>spoken)).toEqual([]);
 await page.evaluate(()=>{current=allItems().find(x=>x.en==='give sth to sb');});await page.getByRole('button',{name:'🔊 本机朗读',exact:true}).click();await expect.poll(()=>page.evaluate(()=>spoken[0])).toBe('give something to somebody');
});
for(const width of [390,768]){
 test(`new English and original math fit ${width} viewport and retain saved input/help`,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:1024});await page.goto('/english-unit5.html');await page.evaluate(()=>{startToday();advance();advance();});await page.locator('#choiceGrid button').filter({hasText:'bus'}).click();await expect(page.locator('#spellTip')).toContainText('完整单词');
  await page.getByRole('button',{name:'B',exact:true}).click();await page.reload();await page.getByRole('button',{name:'开始今天学习',exact:true}).click();await expect(page.locator('#answerBox')).toHaveText('b');for(const x of ['U','S'])await page.getByRole('button',{name:x,exact:true}).click();await page.locator('.key.ok').click();await expect(page.locator('#stageName')).toHaveText('缺 2 个字母');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/units-english-${width}.png`,fullPage:true});
  await page.goto('/math-unit8.html');await expect(page.getByText('原创通用热身 · 非教材原题')).toBeVisible();await page.locator('.questionHint summary').first().click();await page.locator('.textans').fill('12');await page.reload();await expect(page.locator('.textans')).toHaveValue('12');await expect(page.locator('#assistanceNote')).toContainText('有帮助');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/units-math-${width}.png`,fullPage:true});
 });
}
test('eight-unit directory distinguishes original warmups from pending scope without rewriting old math keys',async({page})=>{
 const raw='{"u1_01":{"ok":8,"custom":"keep"}}';await seed(page,{'math-unit1_bank_stats_v1':raw,math_xp:'40',math_coins:'50',math_owned:'{"bow":true}'});await page.goto('/math.html');await expect(page.getByRole('heading',{name:'八个数学单元'})).toBeVisible();
 for(const u of [3,5,7,8]){
  await page.goto(`/math-unit${u}.html`);await expect(page.getByText('原创通用热身 · 非教材原题')).toBeVisible();const answer=await page.evaluate(()=>picked[0].a);await page.locator('.textans').fill(answer);await page.getByRole('button',{name:'检查答案',exact:true}).click();await expect(page.locator('#fb0')).toHaveClass(/good/);expect(await page.evaluate(()=>localStorage.getItem('math-unit1_bank_stats_v1'))).toBe(raw);expect(await page.evaluate(()=>localStorage.getItem('math_owned'))).toBe('{"bow":true}');
 }
 for(const u of [4,6]){await page.goto(`/math-unit${u}.html`);await expect(page.getByText('原创配套练习 · 非教材原题')).toBeVisible();await expect(page.locator('.questionDiagram svg')).toHaveCount(1);expect(await page.evaluate(()=>localStorage.getItem('math-unit1_bank_stats_v1'))).toBe(raw);}
});
