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

const browser = await chromium.launch({headless:true});
try {
  for (const item of cases) {
    const context = await browser.newContext({viewport:item.viewport,isMobile:item.isMobile});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle', timeout:30_000});
    await page.screenshot({path:`${outDir}/${item.name}-home.png`, fullPage:false});
    await page.locator('#course').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({path:`${outDir}/${item.name}-course.png`, fullPage:false});
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) throw new Error(`${item.name}: horizontal overflow detected on production`);
    await context.close();
  }
} finally {
  await browser.close();
}
