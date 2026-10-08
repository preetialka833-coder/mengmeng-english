const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

function readBank(page) {
  const html = fs.readFileSync(page, 'utf8');
  return JSON.parse(html.match(/var BANK=(\[[\s\S]*?\]), SESSION=/)[1]);
}
const banks = { 1: readBank('math-unit1.html'), 2: readBank('math-unit2.html') };
const progressKey = 'mengmeng_v4_unit1';

async function seed(page, values) {
  await page.addInitScript(values => {
    if (sessionStorage.getItem('synthetic-fixture-seeded')) return;
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('synthetic-fixture-seeded', 'yes');
  }, values);
}
async function englishReviewFixture(page, entryKey = 'phrase|because of sb/sth') {
  const fixture = { meta: { day: 8, stickers: 3, doneDays: {d1: true}, graduated: false, legacyFlag: 'keep' }, customLegacyField: { saved: true } };
  fixture[entryKey] = { seen: 4, wrong: 0, passed: 1, due: 1, reviewStep: 1, lastReview: 1, custom: 'keep' };
  await seed(page, {[progressKey]: fixture});
  await page.goto('/english.html');
  await page.getByRole('button', {name: '开始今天学习', exact: true}).click();
  await expect(page.locator('#cn')).toHaveText('因为某人/某事物');
}

test('home navigation and all pages start without JavaScript errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('a.eng').click();
  await expect(page.locator('#todayCount')).toHaveText('4');
  await page.getByRole('button', {name: '开始今天学习', exact: true}).click();
  await expect(page.locator('#learn')).toBeVisible();
  await page.getByRole('button', {name: '我记住一点啦', exact: true}).click();
  await expect(page.locator('#stageName')).toHaveText('再认识一次');
  await page.reload();
  await page.getByRole('button', {name: '开始今天学习', exact: true}).click();
  await expect(page.locator('#stageName')).toHaveText('再认识一次');
  await page.locator('#nav-home').click();
  await expect(page.locator('#home')).toBeVisible();
  await page.getByRole('button', {name: '← 返回学习平台', exact: true}).click();
  await page.locator('a.math').click();
  await expect(page.locator('#coinCount')).toHaveText('0');
  for (const unit of [1, 2]) {
    await page.goto(`/math-unit${unit}.html`);
    await expect(page.locator('#questions > section')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
  await page.screenshot({path: 'test-results/math-unit2-desktop.png', fullPage: true});
});

test('English slash keyboard, physical fullwidth slash, progress and assisted correction survive reload', async ({ page }) => {
  await englishReviewFixture(page);
  await page.keyboard.type('because of sb');
  await page.getByRole('button', { name: '/', exact: true }).click();
  await page.keyboard.type('sth');
  await expect(page.locator('#answerBox')).toHaveText('because of sb/sth');
  await page.reload();
  await page.getByRole('button', {name: '开始今天学习', exact: true}).click();
  await expect(page.locator('#answerBox')).toHaveText('because of sb/sth');
  for (let i = 0; i < 17; i++) await page.keyboard.press('Backspace');
  await page.keyboard.type('because of sb sth');
  await page.keyboard.press('Enter');
  await expect(page.locator('#feedback')).toContainText('还差一点');
  await page.screenshot({path: 'test-results/english-review-correction.png', fullPage: true});
  await page.reload();
  await page.getByRole('button', {name: '开始今天学习', exact: true}).click();
  for (let i = 0; i < 17; i++) await page.keyboard.press('Backspace');
  // Use the physical-key event route for a fullwidth slash; insertText alone does not fire keydown.
  await page.keyboard.type('because of sb ');
  await page.dispatchEvent('body', 'keydown', {key: '／', bubbles: true});
  await page.keyboard.type(' sth');
  await page.keyboard.press('Enter');
  await expect(page.locator('#feedback')).toContainText('答对啦');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), progressKey);
  expect(state['phrase|because of sb/sth'].lastResult).toBe('corrected');
  expect(state['phrase|because of sb/sth'].relearnAt).toBeGreaterThan(Date.now());
  expect(state['phrase|because of sb/sth'].independentRecallDay).toBeUndefined();
  expect(state.meta.dailyPlan.entries.filter(e => e.key === 'phrase|because of sb/sth' && e.mode === 'retest')).toHaveLength(1);
  expect(state.customLegacyField).toEqual({saved: true});
  expect(state['phrase|because of sb/sth'].custom).toBe('keep');
  await page.locator('#nav-parent').click();
  await page.getByRole('button', {name: '生成进度码', exact: true}).click();
  const code = await page.locator('#progressCode').textContent();
  const decoded = JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
  expect(decoded.meta.dailyPlan.entries).toEqual(state.meta.dailyPlan.entries);
  const activeRaw = await page.evaluate(key => localStorage.getItem(key), progressKey);
  await page.getByRole('button', {name: '生成升级前备份码', exact: true}).click();
  const originalCode = await page.locator('#progressCode').textContent();
  const original = JSON.parse(Buffer.from(originalCode, 'base64').toString('utf8'));
  expect(original.meta.legacyFlag).toBe('keep');
  expect(original['phrase|because of sb/sth'].wrong).toBe(0);
  expect(original.meta.dailyPlan).toBeUndefined();
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBe(activeRaw);
});

test('English new allocation is stable and malformed import keeps current progress', async ({ page }) => {
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto('/english.html');
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), progressKey);
  await page.reload();
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), progressKey);
  expect(after.meta.dailyPlan).toEqual(before.meta.dailyPlan);
  await page.locator('#nav-parent').click();
  await page.locator('#importCode').fill('not-a-progress-code');
  await page.getByRole('button', {name: '恢复进度', exact: true}).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), progressKey)).toEqual(after);
});

async function mathAnswer(page, q, wrong = false) {
  if (q.t === 'mc') {
    const choice = wrong ? (q.a + 1) % q.o.length : q.a;
    await page.locator('.opts .opt').nth(choice).click();
  } else {
    await page.getByPlaceholder('输入答案').fill(wrong ? '错误测试答案' : String(q.a));
    await page.getByRole('button', {name: '检查答案', exact: true}).click();
  }
}
for (const unit of [1, 2]) {
  test(`Math unit ${unit}: one question, retry/hint/reload, full group and rewards`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/math-unit${unit}.html`);
    await expect(page.locator('.questionCard')).toHaveCount(1);
    await expect(page.locator('.knowledge')).not.toHaveAttribute('open', '');
    const queue = await page.evaluate(() => picked.map(q => q.id));
    expect(queue).toHaveLength(8);
    expect(new Set(queue).size).toBe(8);
    let q = banks[unit].find(q => q.id === queue[0]);
    await mathAnswer(page, q, true);
    await expect(page.locator('.feedback')).toContainText('还不对');
    await page.locator('.questionHint summary').first().click();
    await expect(page.locator('#assistanceNote')).toContainText('有帮助');
    await page.reload();
    expect(await page.evaluate(() => picked.map(q => q.id))).toEqual(queue);
    await expect(page.locator('.questionHint').first()).toHaveAttribute('open', '');
    await expect(page.locator('.feedback')).toContainText('还不对');
    await mathAnswer(page, q);
    await expect(page.locator('.feedback')).toContainText('完成啦');
    expect(await page.evaluate(() => st(picked[0].id).independentStreak)).toBe(0);
    const rewardAfterOne = await page.evaluate(() => ({xp:localStorage.getItem('math_xp'),coins:localStorage.getItem('math_coins')}));
    await page.reload();
    expect(await page.evaluate(() => ({xp:localStorage.getItem('math_xp'),coins:localStorage.getItem('math_coins')}))).toEqual(rewardAfterOne);
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', {name: '🔄 再抽一组新题', exact: true}).click();
    expect(await page.evaluate(() => picked.map(q => q.id))).toEqual(queue);
    for (let i = 1; i < 8; i++) {
      await page.getByRole('button', {name: '下一题 →', exact: true}).click();
      await expect(page.locator('.questionCard')).toHaveCount(1);
      q = banks[unit].find(q => q.id === queue[i]);
      await expect(page.locator('#questionTitle')).toHaveText(q.q);
      await mathAnswer(page, q);
      await expect(page.locator('.feedback')).toContainText('独立答对');
    }
    await expect(page.locator('#groupSummary')).toContainText('独立答对 7 题');
    await expect(page.locator('#doneText')).toHaveText('已完成：8 / 8');
    const totalCoins = queue.reduce((sum,id) => sum + banks[unit].find(q => q.id === id).d, 0);
    expect(await page.evaluate(() => Number(localStorage.getItem('math_xp')))).toBe(8);
    expect(await page.evaluate(() => Number(localStorage.getItem('math_coins')))).toBe(totalCoins);
    await page.getByRole('button', {name: '← 上一题', exact: true}).click();
    await expect(page.locator('.questionCard')).toHaveCount(1);
    expect(errors).toEqual([]);
    await page.screenshot({path: `test-results/math-unit${unit}-completed.png`, fullPage: true});
  });
}

test('small-screen layout fits viewport and knowledge cards are optional', async ({ page }) => {
  await page.setViewportSize({width:390, height:844});
  await englishReviewFixture(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/english-mobile.png', fullPage:true});
  await page.goto('/math-unit2.html');
  await expect(page.locator('.questionCard')).toHaveCount(1);
  await expect(page.locator('.sectionGrid')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/math-mobile.png', fullPage:true});
  await page.locator('.knowledge > summary').click();
  await expect(page.locator('.sectionGrid')).toBeVisible();
});

test('shop preserves ownership and never charges for re-equipping', async ({ page }) => {
  page.on('dialog', dialog => dialog.dismiss());
  await seed(page, {math_coins: 40, math_xp: 7, math_owned: {crown: true, legacy: 'keep'}});
  await page.goto('/math.html');
  await expect(page.locator('#wearCrown')).toBeVisible();
  await page.locator('#shop-crown').click();
  await expect(page.locator('#wearCrown')).not.toBeVisible();
  await page.locator('#shop-crown').click();
  await expect(page.locator('#wearCrown')).toBeVisible();
  await expect(page.locator('#coinCount')).toHaveText('40');
  await page.locator('#shop-bow').click();
  await expect(page.locator('#coinCount')).toHaveText('35');
  await page.locator('#shop-bow').click();
  await page.reload();
  await expect(page.locator('#wearBow')).not.toBeVisible();
  await page.locator('#shop-bow').click();
  await expect(page.locator('#coinCount')).toHaveText('35');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('math_owned')))).toMatchObject({bow:true,crown:true,legacy:'keep'});
  expect(await page.evaluate(() => localStorage.getItem('math_xp'))).toBe('7');
});
