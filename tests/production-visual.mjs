import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {chromium, expect} from '@playwright/test';

const baseURL = (process.env.PRODUCTION_URL || 'https://buryad.buuzoed.dev').replace(/\/$/, '');
const outDir = 'production-visual-artifacts';
mkdirSync(outDir, {recursive:true});
const cases = [
  {name:'desktop-1440', viewport:{width:1440,height:900}, isMobile:false},
  {name:'mobile-390', viewport:{width:390,height:844}, isMobile:true},
  {name:'mobile-320', viewport:{width:320,height:720}, isMobile:true},
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {commit:process.env.GITHUB_SHA || null, assets:[], views:[], teaFlow:false};

async function noOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(overflow, false, `${label}: horizontal overflow`);
}
async function ready(page) {
  await page.waitForFunction(() => document.body.dataset.view &&
    document.querySelectorAll('#dailySteps .daily-step').length === 4,
  null, {timeout:30_000});
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
}
async function capture(page, name, route, selector) {
  await page.goto(`${baseURL}/#${route}`, {waitUntil:'domcontentloaded', timeout:30_000});
  await ready(page);
  await expect(page.locator(selector)).toBeVisible();
  await noOverflow(page, `${name}/${route}`);
  await page.screenshot({path:`${outDir}/${name}-${route}.png`, fullPage:true});
  report.views.push(`${name}/${route}`);
  console.log(`PASS ${name}/${route}`);
}

const browser = await chromium.launch({headless:true});
try {
  const probe = await browser.newContext();
  for (const path of ['web/js/library.js', 'web/js/daily.js', 'web/js/normalize.js', 'web/js/immersion.js']) {
    const url = `${baseURL}/assets/${path.slice(4)}?release=${process.env.GITHUB_SHA || Date.now()}`;
    const response = await probe.request.get(url);
    assert.equal(response.status(), 200, `Release asset unavailable: ${path}`);
    const deployedHash = hash(await response.body());
    assert.equal(deployedHash, hash(readFileSync(path)), `Old release still served: ${path}`);
    report.assets.push({path, sha256:deployedHash});
    console.log(`PASS deployed asset ${path} ${deployedHash}`);
  }
  await probe.close();

  for (const item of cases) {
    const context = await browser.newContext({viewport:item.viewport, isMobile:item.isMobile});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await capture(page, item.name, 'home', '#home');
    await expect(page.locator('#course')).toBeHidden();
    await expect(page.locator('#immersion')).toBeHidden();
    await expect(page.locator('#heroPrimaryAction')).toContainText('Начать первую сцену');
    for (const [route, selector] of [
      ['daily','#daily'], ['immersion','#immersion'], ['my-words','#my-words'],
      ['course','#course'], ['speaking','#speaking'], ['progress','#progress'],
    ]) await capture(page, item.name, route, selector);

    await page.goto(`${baseURL}/#immersion`, {waitUntil:'domcontentloaded'});
    await ready(page);
    await expect(page.locator('#immersionSceneSelect option')).toHaveCount(16);
    const response = await context.request.get(`${baseURL}/assets/data/immersion.json`);
    const data = await response.json();
    const teaIndex = data.scenes.findIndex(s => s.id === 'tea');
    assert.ok(teaIndex >= 0, 'Tea scene missing');
    await page.locator('#immersionSceneSelect').selectOption(String(teaIndex));
    for (const step of data.scenes[teaIndex].steps) {
      await expect(page.locator('#immersionCue')).toHaveText(step.cue);
      if (step.type === 'choose') {
        const index = step.visuals.findIndex(x => x.correct);
        assert.ok(index >= 0);
        await page.locator(`[data-choice="${index}"]`).click();
      } else if (step.type === 'respond') {
        await page.locator('#immersionAnswer').fill(step.answers[0]);
        await page.locator('#immersionCheck').click();
        await expect(page.locator('#immersionFeedback')).toHaveClass(/\bok\b/);
      }
      await page.locator('#immersionNext').click();
    }
    await expect(page.locator('#immersionCue')).toHaveText('Сцена завершена.');
    await page.locator('#immersionHelpBox a[href="#daily"]').click();
    await expect(page.locator('#daily')).toBeVisible();
    await expect(page.locator('[data-daily-go="live"]').locator('xpath=ancestor::article')).toHaveClass(/\bdone\b/);
    report.teaFlow = true;
    console.log(`PASS ${item.name}: full tea scene -> daily completion`);

    for (const [path, selector, title] of [
      ['/grammar/possessive', '#grammarContent', 'Притяжание'],
      ['/feedback', '.feedback-hero h1', 'Предложения и Issues'],
      ['/support', '.support-hero h1', 'Поддержать проект'],
    ]) {
      await page.goto(`${baseURL}${path}`, {waitUntil:'domcontentloaded', timeout:30_000});
      await expect(page.locator(selector)).toContainText(title, {timeout:30_000});
      await noOverflow(page, `${item.name}${path}`);
      await page.screenshot({path:`${outDir}/${item.name}-${path.split('/')[1]}.png`, fullPage:true});
      report.views.push(`${item.name}${path}`);
    }
    assert.deepEqual(errors, [], `${item.name}: browser errors`);
    await context.close();
  }
  console.log(`PRODUCTION VERIFIED: ${report.views.length} views, ${report.assets.length} exact assets, complete tea flow`);
} finally {
  writeFileSync(`${outDir}/verification.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
