const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const manifest=JSON.parse(fs.readFileSync('audio/english/manifest.json','utf8'));

async function startWithoutSpeech(page){
  await page.addInitScript(()=>{
    Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true});
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:undefined,configurable:true});
    window.audioPlayingEvents=[];
    document.addEventListener('playing',event=>{
      if(event.target.tagName==='AUDIO')window.audioPlayingEvents.push(event.target.currentSrc);
    },true);
  });
  await page.goto('/english.html');
  await page.getByRole('button',{name:'开始今天学习',exact:true}).click();
}
const listen=page=>page.getByRole('button',{name:'🔊 听一听',exact:true});

test('real same-origin MP3 plays and ends without Web Speech; starting lesson is silent',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await startWithoutSpeech(page);
  await expect(page.locator('#audioPlayer audio')).toHaveCount(0);
  const before=await page.evaluate(()=>localStorage.getItem('mengmeng_v4_unit1'));
  const response=page.waitForResponse(r=>r.url().endsWith('/audio/english/words-01.mp3'));
  await listen(page).click();expect((await response).status()).toBe(200);
  await expect(page.locator('#audioStatus')).toHaveAttribute('data-state','playing');
  await expect.poll(()=>page.locator('#audioPlayer audio').evaluate(a=>a.currentTime)).toBeGreaterThan(0);
  await expect(page.locator('#audioStatus')).toHaveAttribute('data-state','complete');
  expect(await page.locator('#audioPlayer audio').evaluate(a=>({ended:a.ended,duration:a.duration,muted:a.muted})))
    .toMatchObject({ended:true,muted:false});
  expect(await page.evaluate(()=>localStorage.getItem('mengmeng_v4_unit1'))).toBe(before);
  expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/english-recorded-audio.png',fullPage:true});
});

test('all 49 manifest mappings load and actually advance playback without a speech engine',async({page})=>{
  test.setTimeout(120000);
  const errors=[],responses=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().includes('/audio/english/')&&response.url().endsWith('.mp3'))responses.push({url:response.url(),status:response.status()});});
  await startWithoutSpeech(page);
  const before=await page.evaluate(()=>localStorage.getItem('mengmeng_v4_unit1'));
  const items=await page.evaluate(()=>allItems().map(item=>({text:item.en,file:recordedAudioFor(item)})));
  expect(items).toHaveLength(49);
  for(let index=0;index<items.length;index++){
    const track=manifest.tracks.find(track=>track.text===items[index].text);
    expect(items[index].file).toBe(`./audio/english/${track.file}`);
    await page.evaluate(index=>{current=allItems()[index];renderLesson();},index);
    await listen(page).click();
    await expect.poll(()=>page.locator('#audioPlayer audio').evaluate(a=>a.currentTime),{timeout:10000}).toBeGreaterThan(0.04);
    const actual=await page.locator('#audioPlayer audio').evaluate(a=>({src:a.currentSrc,duration:a.duration,ready:a.readyState,error:a.error&&a.error.code}));
    expect(actual.src.endsWith(`/audio/english/${track.file}`)).toBe(true);
    expect(actual.duration).toBeGreaterThan(0);expect(actual.ready).toBeGreaterThanOrEqual(2);expect(actual.error).toBeNull();
  }
  expect(new Set(responses.map(response=>response.url)).size).toBe(49);expect(responses.every(response=>response.status===200||response.status===206)).toBe(true);
  expect(await page.evaluate(()=>new Set(audioPlayingEvents).size)).toBe(49);
  expect(await page.evaluate(()=>localStorage.getItem('mengmeng_v4_unit1'))).toBe(before);
  expect(errors).toEqual([]);
});

test('repeated clicks restart and leaving the lesson stops real playback',async({page})=>{
  await startWithoutSpeech(page);await listen(page).click();
  await page.evaluate(()=>{window.previousRecording=document.querySelector('#audioPlayer audio');});
  await listen(page).click();
  expect(await page.evaluate(()=>previousRecording.paused)).toBe(true);
  expect(await page.evaluate(()=>previousRecording!==document.querySelector('#audioPlayer audio'))).toBe(true);
  await page.evaluate(()=>{window.latestRecording=document.querySelector('#audioPlayer audio');});
  await page.locator('#nav-home').click();
  expect(await page.evaluate(()=>latestRecording.paused)).toBe(true);
  await expect(page.locator('#audioPlayer audio')).toHaveCount(0);
  await expect(page.locator('#audioStatus')).toHaveAttribute('data-state','ready');
});

test('missing MP3 produces visible error; unavailable device fallback does not silently wait',async({page})=>{
  await page.route('**/audio/english/*.mp3',route=>route.fulfill({status:404,contentType:'text/plain',body:'missing synthetic test asset'}));
  await startWithoutSpeech(page);await listen(page).click();
  await expect(page.locator('#audioStatus')).toHaveAttribute('data-state','error');
  await expect(page.locator('#audioStatus')).toContainText('重试');
  await page.getByText('没听到声音？',{exact:true}).click();
  await page.getByRole('button',{name:'备用设备朗读',exact:true}).click();
  await expect(page.locator('#audioStatus')).toHaveAttribute('data-state','error');
  await expect(page.locator('#audioStatus')).toContainText('不支持设备朗读');
});
