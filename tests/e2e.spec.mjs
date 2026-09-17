import {test, expect} from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:18128';

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
}

test.describe('responsive learning app', () => {
  test('mobile beginner course has module selector, audio honesty, hint ladder and explicit continue', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle'});
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('.mobile-nav')).toBeVisible();
    await expect(page.locator('.desktop-nav')).toBeHidden();

    await page.locator('#course').scrollIntoViewIfNeeded();
    await expect(page.locator('#courseModuleSelect')).toBeVisible();
    await expect(page.locator('.course-module-rail')).toBeHidden();
    await expect(page.locator('#coursePrompt')).not.toHaveText('Загрузка…');
    await expect(page.locator('#courseOverall')).toContainText('204');
    await expect(page.locator('#courseRecord')).toBeVisible();
    await expect(page.locator('#courseAudioStatus')).toContainText('Эталонной записи пока нет');
    await expect(page.locator('#courseListen')).toBeHidden();
    await expect(page.locator('#courseListenSlow')).toBeHidden();

    await page.locator('#courseHelp').click();
    await expect(page.locator('#courseHint')).toBeVisible();
    const firstHint = await page.locator('#courseHint').textContent();
    expect(firstHint?.trim().length).toBeGreaterThan(0);
    await page.locator('#courseHelp').click();
    const secondHint = await page.locator('#courseHint').textContent();
    expect(secondHint).not.toBe(firstHint);
    await page.locator('#courseHelp').click();
    await expect(page.locator('#courseContinue')).toBeVisible();
    await expect(page.locator('#courseFeedback')).toBeVisible();

    await page.locator('#authButton').click();
    await expect(page.getByRole('textbox', {name:'Email', exact:true})).toBeVisible();
    await expect(page.getByRole('textbox', {name:'Пароль', exact:true})).toBeVisible();
    await page.locator('#authClose').click();

    await page.locator('#verbs').scrollIntoViewIfNeeded();
    await page.locator('#verbSearch').fill('ойлгохо');
    await page.locator('.verb-summary').first().click();
    await expect(page.locator('.verb-card.expanded .verb-detail')).toBeVisible();

    await page.locator('#video').scrollIntoViewIfNeeded();
    await expect(page.locator('#videoGrid iframe')).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
    await context.close();
  });

  test('desktop course shows module rail and can complete a recall attempt', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle'});
    await expect(page.locator('.desktop-nav')).toBeVisible();
    await expect(page.locator('.mobile-nav')).toBeHidden();
    await expect(page.locator('.course-module-rail')).toBeVisible();
    await expect(page.locator('#courseModuleList .course-module-button')).toHaveCount(12);

    await page.locator('#course').scrollIntoViewIfNeeded();
    await expect(page.locator('#courseRecord')).toBeVisible();
    await expect(page.locator('#courseListen')).toBeHidden();
    await page.locator('#courseAnswer').fill('Мэндэ!');
    await page.locator('#courseCheck').click();
    await expect(page.locator('#courseContinue')).toBeVisible();
    await expect(page.locator('#courseFeedback')).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(page.locator('#courseContinue')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await context.close();
  });

  test('narrow 320px course and pronunciation controls do not overflow horizontally', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:320,height:720},isMobile:true});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle'});
    await page.locator('#course').scrollIntoViewIfNeeded();
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('.mobile-nav')).toBeVisible();
    await expect(page.locator('#courseModuleSelect')).toBeVisible();
    await expect(page.locator('#courseAnswer')).toBeVisible();
    await expect(page.locator('#courseRecord')).toBeVisible();
    await expect(page.locator('#courseStopRecord')).toBeVisible();
    await expect(page.locator('#courseReplayOwn')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await context.close();
  });
});
