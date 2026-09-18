import {mkdirSync} from 'node:fs';
import {chromium} from '@playwright/test';

const baseURL = process.env.PRODUCTION_URL || 'https://buryad.buuzoed.dev';
const outDir = 'production-visual-artifacts';
mkdirSync(outDir, {recursive:true});

const cases = [
  {name:'desktop-1440', viewport:{width:1440,height:900}, isMobile:false},
  {name:'mobile-390', viewport:{width:390,height:844}, isMobile:true},
  {name:'mobile-320', viewport:{width:320,height:720}, isMobile:true},
];

async function waitForReady(page) {
  await page.waitForFunction(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const prompt = document.querySelector('#coursePrompt')?.textContent?.trim() || '';
    const audioStatus = document.querySelector('#courseAudioStatus')?.textContent?.trim() || '';
    const moduleCount = document.querySelectorAll('#courseModuleSelect option').length;
    const overall = document.querySelector('#courseOverall')?.textContent || '';
    return Boolean(
      prompt &&
      !prompt.includes('Загрузка') &&
      audioStatus &&
      !audioStatus.includes('Проверяем') &&
      moduleCount === 12 &&
      overall.includes('204')
    );
  }, null, {timeout:30_000});
  await page.waitForTimeout(300);
}

const browser = await chromium.launch({headless:true});
try {
  for (const item of cases) {
    const context = await browser.newContext({viewport:item.viewport,isMobile:item.isMobile});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'domcontentloaded', timeout:30_000});
    await waitForReady(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await page.screenshot({path:`${outDir}/${item.name}-home.png`, fullPage:false});

    await page.locator('#course').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({path:`${outDir}/${item.name}-course.png`, fullPage:false});

    let overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) throw new Error(`${item.name}: horizontal overflow detected on production course`);

    await page.goto(`${baseURL}/grammar/possessive`, {waitUntil:'domcontentloaded', timeout:30_000});
    await page.waitForFunction(() => {
      const heading = document.querySelector('#grammarContent h2')?.textContent || '';
      const search = document.querySelector('#grammarSearch');
      return heading.includes('Притяжание') && Boolean(search);
    }, null, {timeout:30_000});
    await page.waitForTimeout(250);
    await page.screenshot({path:`${outDir}/${item.name}-grammar.png`, fullPage:false});
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) throw new Error(`${item.name}: horizontal overflow detected on production grammar`);

    await page.goto(`${baseURL}/feedback`, {waitUntil:'domcontentloaded', timeout:30_000});
    await page.waitForFunction(() => {
      const heading = document.querySelector('.feedback-hero h1')?.textContent || '';
      return heading.includes('Предложения и Issues');
    }, null, {timeout:30_000});
    await page.waitForTimeout(250);
    await page.screenshot({path:`${outDir}/${item.name}-feedback.png`, fullPage:false});
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) throw new Error(`${item.name}: horizontal overflow detected on production feedback`);

    await page.goto(`${baseURL}/support`, {waitUntil:'domcontentloaded', timeout:30_000});
    await page.waitForFunction(() => {
      const heading = document.querySelector('.support-hero h1')?.textContent || '';
      return heading.includes('Поддержать проект');
    }, null, {timeout:30_000});
    await page.waitForTimeout(250);
    await page.screenshot({path:`${outDir}/${item.name}-support.png`, fullPage:false});
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) throw new Error(`${item.name}: horizontal overflow detected on production support`);
    await context.close();
  }
} finally {
  await browser.close();
}
