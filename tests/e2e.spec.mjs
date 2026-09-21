import {mkdirSync} from 'node:fs';
import {test, expect} from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:18128';
mkdirSync('visual-artifacts', {recursive:true});

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
    await expect(page.locator('[data-buryat-keyboard-for="courseAnswer"]')).toBeVisible();
    await expect(page.locator('[data-buryat-keyboard-for="courseAnswer"] button')).toHaveCount(3);
    await page.locator('#courseAnswer').fill('би аа');
    await page.locator('#courseAnswer').evaluate((el) => el.setSelectionRange(3, 3));
    await page.locator('[data-buryat-keyboard-for="courseAnswer"] button[data-char="ү"]').click();
    await page.locator('[data-buryat-keyboard-for="courseAnswer"] button[data-char="ө"]').click();
    await page.locator('[data-buryat-keyboard-for="courseAnswer"] button[data-char="һ"]').click();
    await expect(page.locator('#courseAnswer')).toHaveValue('би үөһаа');
    await expect(page.locator('#courseAudioStatus')).toContainText('Эталонная запись этой фразы пока не добавлена');
    await expect(page.locator('#courseListen')).toBeHidden();
    await expect(page.locator('#courseListenSlow')).toBeHidden();

    await page.screenshot({path:'visual-artifacts/mobile-390-course.png', fullPage:true});

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

    await page.locator('#train').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-buryat-keyboard-for="answerInput"]')).toBeVisible();
    await page.locator('#core').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-buryat-keyboard-for="coreSearch"]')).toBeVisible();

    await page.locator('#verbs').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-buryat-keyboard-for="verbSearch"]')).toBeVisible();
    await page.locator('#verbSearch').fill('ойлгохо');
    await page.locator('.verb-summary').first().click();
    await expect(page.locator('.verb-card.expanded .verb-detail')).toBeVisible();

    await page.locator('#video').scrollIntoViewIfNeeded();
    await expect(page.locator('#videoGrid iframe')).toHaveCount(1);
    await expect(page.locator('.video-card .buryat-keyboard')).toBeVisible();
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
    await page.screenshot({path:'visual-artifacts/desktop-1440-course.png', fullPage:true});
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
    await expect(page.locator('[data-buryat-keyboard-for="courseAnswer"]')).toBeVisible();
    await page.screenshot({path:'visual-artifacts/mobile-320-course.png', fullPage:true});
    await assertNoHorizontalOverflow(page);
    await context.close();
  });
});


test.describe('grammar reference', () => {
  test('mobile grammar page is navigable, searchable and has Buryat helper keys', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    const page = await context.newPage();
    await page.goto(`${baseURL}/grammar/possessive`, {waitUntil:'networkidle'});
    await expect(page.getByRole('heading', {name:'Притяжание: мой, наш, твой'})).toBeVisible();
    await expect(page.locator('#grammarSelect')).toBeVisible();
    await expect(page.locator('.grammar-sidebar')).toBeHidden();
    await expect(page.locator('#grammarContent')).toContainText('үрэмни');
    await expect(page.locator('#grammarContent')).toContainText('үрэмнай');
    await expect(page.locator('[data-buryat-keyboard-for="grammarSearch"]')).toBeVisible();
    await page.locator('#grammarSearch').fill('гармония');
    await expect(page.locator('#grammarSearchResults')).toBeVisible();
    await page.screenshot({path:'visual-artifacts/mobile-390-grammar.png', fullPage:true});
    await assertNoHorizontalOverflow(page);
    await context.close();
  });
});


test('desktop grammar reference keeps navigation visible and clean', async ({browser}) => {
  const context = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await context.newPage();
  await page.goto(`${baseURL}/grammar/vowels`, {waitUntil:'networkidle'});
  await expect(page.locator('.grammar-sidebar')).toBeVisible();
  await expect(page.locator('#grammarNav .grammar-nav-link')).toHaveCount(9);
  await expect(page.locator('#grammarContent')).toContainText('Важное исключение: притяжание');
  await page.screenshot({path:'visual-artifacts/desktop-1440-grammar.png', fullPage:true});
  await assertNoHorizontalOverflow(page);
  await context.close();
});


test.describe('feedback and public issues', () => {
  test('guest can inspect existing issues but cannot submit', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    const page = await context.newPage();
    await page.route('https://api.github.com/repos/ValeriiOsodoev/buryad/issues?state=all&per_page=100', async (route) => {
      await route.fulfill({
        status:200,
        contentType:'application/json',
        body:JSON.stringify([
          {
            number:42,
            title:'Исправить форму үрэмнай',
            body:'Проверить объяснение притяжательной формы.',
            html_url:'https://github.com/ValeriiOsodoev/buryad/issues/42',
            created_at:'2026-09-18T10:00:00Z',
            state:'open',
            labels:[{name:'language'}],
          },
        ]),
      });
    });

    await page.goto(`${baseURL}/feedback`, {waitUntil:'networkidle'});
    await expect(page.getByRole('heading', {name:'Предложения и Issues'})).toBeVisible();
    await expect(page.locator('#issuesList .issue-card')).toHaveCount(1);
    await expect(page.locator('#issuesList')).toContainText('үрэмнай');
    await expect(page.locator('#feedbackAuthGate')).toBeVisible();
    await expect(page.locator('#feedbackForm')).toBeHidden();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({path:'visual-artifacts/mobile-390-feedback.png', fullPage:true});
    await context.close();
  });

  test('desktop feedback page explains issue format clearly', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    const page = await context.newPage();
    await page.route('https://api.github.com/repos/ValeriiOsodoev/buryad/issues?state=all&per_page=100', async (route) => {
      await route.fulfill({status:200, contentType:'application/json', body:'[]'});
    });
    await page.goto(`${baseURL}/feedback`, {waitUntil:'networkidle'});
    await expect(page.locator('.feedback-guide')).toContainText('Что такое Issue?');
    await expect(page.locator('.feedback-guide')).toContainText('Одна тема');
    await expect(page.locator('a[href="https://github.com/ValeriiOsodoev/buryad/issues"]')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({path:'visual-artifacts/desktop-1440-feedback.png', fullPage:true});
    await context.close();
  });
});


test.describe('project support', () => {
  test('support page explains noncommercial model on mobile', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    const page = await context.newPage();
    await page.goto(`${baseURL}/support`, {waitUntil:'networkidle'});
    await expect(page.getByRole('heading', {name:'Поддержать проект'})).toBeVisible();
    await expect(page.locator('.support-hero')).toContainText('полностью некоммерческий');
    await expect(page.locator('#supportEmpty')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({path:'visual-artifacts/mobile-390-support.png', fullPage:true});
    await context.close();
  });

  test('support page stays clean on desktop', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    const page = await context.newPage();
    await page.goto(`${baseURL}/support`, {waitUntil:'networkidle'});
    await expect(page.locator('.support-principles')).toContainText('Поддержка не даёт платных преимуществ');
    await expect(page.locator('.support-open-actions a[href="/feedback"]')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({path:'visual-artifacts/desktop-1440-support.png', fullPage:true});
    await context.close();
  });
});


test.describe('daily ritual and speaking practice', () => {
  test('mobile daily ritual exposes four guided stages without overflow', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle'});
    await page.locator('#daily').scrollIntoViewIfNeeded();
    await expect(page.locator('#dailySteps .daily-step')).toHaveCount(4);
    await expect(page.locator('#dailySummary')).toContainText('4 этапов');
    await expect(page.locator('#dailySteps')).toContainText('Разбудить язык');
    await expect(page.locator('#dailySteps')).toContainText('Поговорить');
    await expect(page.locator('#dailySteps')).toContainText('Перестроить фразы');
    await expect(page.locator('#dailySteps')).toContainText('Услышать');
    await assertNoHorizontalOverflow(page);
    await page.screenshot({path:'visual-artifacts/mobile-390-daily.png', fullPage:true});
    await context.close();
  });

  test('desktop speaking mode and automaticity drill are usable', async ({browser}) => {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    const page = await context.newPage();
    await page.goto(baseURL, {waitUntil:'networkidle'});
    await page.locator('#speaking').scrollIntoViewIfNeeded();
    await expect(page.locator('#speakingScenarioList .speaking-scenario')).toHaveCount(12);
    await expect(page.locator('#speakingPrompt')).not.toHaveText('Загрузка…');
    await expect(page.locator('#patternSet option')).toHaveCount(6);
    await expect(page.locator('#patternPrompt')).not.toHaveText('Загрузка…');
    await assertNoHorizontalOverflow(page);
    await page.screenshot({path:'visual-artifacts/desktop-1440-speaking.png', fullPage:true});
    await context.close();
  });
});
