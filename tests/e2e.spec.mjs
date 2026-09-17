import {test, expect} from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:18128';

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
}

test.describe('responsive learning app', () => {
  test('mobile has bottom navigation, accessible auth and explicit exercise continue', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle'});
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('.mobile-nav')).toBeVisible();
    await expect(page.locator('.desktop-nav')).toBeHidden();

    await page.locator('#authButton').click();
    await expect(page.getByRole('textbox', {name:'Email', exact:true})).toBeVisible();
    await expect(page.getByRole('textbox', {name:'Пароль', exact:true})).toBeVisible();
    await expect(page.locator('#passwordToggle')).toBeVisible();
    await page.locator('#authClose').click();

    await page.locator('#train').scrollIntoViewIfNeeded();
    await page.locator('#answerInput').fill('Тиимэ, һайн');
    await page.locator('#checkAnswer').click();
    await expect(page.locator('#continueExercise')).toBeVisible();
    await expect(page.locator('#feedback')).toBeVisible();
    await page.waitForTimeout(1100);
    await expect(page.locator('#continueExercise')).toBeVisible();

    await page.locator('#verbs').scrollIntoViewIfNeeded();
    await page.locator('#verbSearch').fill('ойлгохо');
    await page.locator('.verb-summary').first().click();
    await expect(page.locator('.verb-card.expanded .verb-detail')).toBeVisible();

    await page.locator('#video').scrollIntoViewIfNeeded();
    await expect(page.locator('#videoGrid iframe')).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
    await context.close();
  });

  test('desktop keeps top navigation and hides mobile bottom bar', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle'});
    await expect(page.locator('.desktop-nav')).toBeVisible();
    await expect(page.locator('.mobile-nav')).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await context.close();
  });

  test('narrow 320px viewport does not overflow horizontally', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:320,height:720},isMobile:true});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle'});
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('.mobile-nav')).toBeVisible();
    await context.close();
  });
});
