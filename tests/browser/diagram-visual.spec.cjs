const {test,expect}=require('@playwright/test');
test('axial-cut conclusion appears only in answer help and then cannot create independent recall evidence',async({page})=>{
 await page.goto('/math-unit6.html');await page.evaluate(()=>{picked=[BANK.find(q=>q.id==='u6_02')];current=0;finished={};assisted={};hintLevels={};answers={};outcomes={};render();});
 await expect(page.locator('#questionTitle')).not.toContainText('实际截面为长方形');await expect(page.locator('.questionDiagram')).not.toContainText('实际截面为长方形');
 await page.getByText('🔎 查看答案／解析',{exact:true}).click();await expect(page.locator('.questionHint').nth(2)).toContainText('实际截面为长方形');await expect(page.locator('#assistanceNote')).toContainText('有帮助');
 await page.locator('.textans').fill('2');await page.getByRole('button',{name:'检查答案',exact:true}).click();expect(await page.evaluate(()=>outcomes[0])).toBe('assisted');
 const stats=await page.evaluate(()=>JSON.parse(localStorage.getItem(KEY))['u6_02']);expect(stats.recallFirstDay||'').toBe('');
});
test('corrected u6_02 axial cut has a full-size browser screenshot',async({page})=>{
 await page.setViewportSize({width:900,height:900});await page.goto('/math-unit6.html');await page.evaluate(()=>{picked=[BANK.find(q=>q.id==='u6_02')];current=0;finished={};assisted={};hintLevels={};answers={};outcomes={};render();});
 await expect(page.locator('[data-cut-plane="axis"]')).toHaveCount(1);await page.locator('.questionDiagram').screenshot({path:'test-results/visual-u6-2-fullsize-figure.png'});
});
for(const width of [320,390])test(`diagram conditions and zoom are readable at ${width}px without changing progress`,async({page})=>{
 await page.setViewportSize({width,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const u of [4,6]){
  await page.goto(`/math-unit${u}.html`);const count=await page.evaluate(()=>BANK.length);
  for(let n=0;n<count;n++){
   await page.evaluate(n=>{picked=[BANK[n]];current=0;finished={};assisted={};hintLevels={};answers={};outcomes={};render();},n);
   const caption=page.locator('.questionDiagram figcaption');await expect(caption).toBeVisible();expect(await caption.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const before=await page.evaluate(()=>JSON.stringify({storage:{...localStorage},assisted,hintLevels}));await page.getByRole('button',{name:'🔍 放大看图',exact:true}).click();await expect(page.locator('#diagramZoom')).toBeVisible();
   const info=await page.locator('#diagramZoom svg text').first().evaluate(e=>({renderedPx:parseFloat(getComputedStyle(e).fontSize)*e.getScreenCTM().a,svgWidth:e.ownerSVGElement.getBoundingClientRect().width}));expect(info.renderedPx).toBeGreaterThanOrEqual(25);expect(info.svgWidth).toBe(780);
   const scroll=page.locator('.diagramScroll');await scroll.evaluate(e=>e.scrollLeft=e.scrollWidth);expect(await scroll.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
   await scroll.evaluate(e=>e.scrollLeft=(e.scrollWidth-e.clientWidth)/2);await expect(page.locator('#diagramZoomCaption')).toHaveText(await caption.textContent());
   if((u===6&&n===1)||(u===4&&n===1)){await page.screenshot({path:`test-results/visual-u${u}-${n+1}-${width}-zoom.png`});}
   await page.getByRole('button',{name:'关闭',exact:true}).click();expect(await page.evaluate(()=>JSON.stringify({storage:{...localStorage},assisted,hintLevels}))).toBe(before);
   if((u===6&&n===1)||(u===4&&n===1)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/visual-u${u}-${n+1}-${width}-page.png`,fullPage:true});await page.locator('.questionDiagram').screenshot({path:`test-results/visual-u${u}-${n+1}-${width}-figure.png`});}
  }
 }
 expect(errors).toEqual([]);
});
