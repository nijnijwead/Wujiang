const assert = require('assert');
const path = require('path');
const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');

const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
const expected = [
  { zh: '新月', en: 'The Ethereal Nights' },
  { zh: '生灵', en: 'The Villagers' },
  { zh: '亡魂', en: 'The Forgotten' },
  { zh: '内脏', en: 'The Interior' },
  { zh: '烈日', en: 'The Lucid Days' },
  { zh: '苟活', en: 'The Alive' },
  { zh: '存在', en: 'The Reflections' }
];

const openScenery = (index) => {
  document.querySelector(`[data-scenery="${index}"]:not([data-clone])`).click();
};

const closeDetail = () => document.querySelector('[data-close]').click();

const readScenery = (index) => {
  const key = String(index).padStart(2, '0');
  const story = window.WUJIANG_SCENERY_STORIES?.[key] || {};
  return {
    title: document.querySelector('.story-title')?.textContent.trim() || '',
    paragraphs: [...document.querySelectorAll('.story-paragraph')].map((node) => node.textContent.trim()),
    galleryCount: document.querySelectorAll('[data-gallery-list] .story-entry').length,
    frameRole: document.querySelector('[data-detail-frame]').getAttribute('role'),
    frameLabel: document.querySelector('[data-detail-frame]').getAttribute('aria-label'),
    storyLabel: document.querySelector('[data-story-copy]').getAttribute('aria-label'),
    contentLang: document.querySelector('[data-story-copy-inner]').getAttribute('lang'),
    titleZh: story.titleZh || '',
    bodyZh: story.bodyZh || '',
    titleEn: story.titleEn || '',
    bodyEn: story.bodyEn || ''
  };
};

async function checkLanguage(page, language) {
  const results = [];
  for (let index = 1; index <= expected.length; index += 1) {
    await page.evaluate(openScenery, index);
    await page.waitForTimeout(120);
    const state = await page.evaluate(readScenery, index);
    const wantedTitle = expected[index - 1][language];
    const wantedBody = state[language === 'en' ? 'bodyEn' : 'bodyZh'];
    const rendered = `${state.title}\n${state.paragraphs.join('\n')}`;
    assert.strictEqual(state.title, wantedTitle, `scenery ${index} ${language} title`);
    assert.ok(state.paragraphs.length > 0, `scenery ${index} ${language} body`);
    assert.strictEqual(state.paragraphs.join('\n\n'), wantedBody.trim(), `scenery ${index} ${language} full body`);
    if (language === 'en') {
      assert.ok(!/[\u3400-\u9fff\uf900-\ufaff]/.test(rendered), `scenery ${index} English contains Chinese`);
      assert.strictEqual(state.contentLang, 'en', `scenery ${index} English content language`);
    } else {
      assert.ok(!/[A-Za-z]/.test(rendered), `scenery ${index} Chinese contains English`);
      assert.strictEqual(state.contentLang, 'zh-Hans', `scenery ${index} Chinese content language`);
    }
    assert.ok(state.galleryCount > 0, `scenery ${index} gallery`);
    assert.strictEqual(state.frameRole, 'button');
    assert.strictEqual(state.frameLabel, language === 'zh' ? '显示风景文本' : 'Show scenery text');
    assert.strictEqual(state.storyLabel, language === 'zh' ? '风景文本' : 'Scenery text');
    results.push({ scenery: index, title: state.title, galleryCount: state.galleryCount });
    await page.evaluate(closeDetail);
    await page.waitForTimeout(80);
  }
  return results;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce'
  });
  const reducedPage = await reducedContext.newPage();
  reducedPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  reducedPage.on('pageerror', (error) => errors.push(error.message));
  reducedPage.on('requestfailed', (request) => {
    errors.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
  });
  await reducedPage.goto(url, { waitUntil: 'domcontentloaded' });
  await reducedPage.evaluate(() => document.fonts.ready);

  const english = await checkLanguage(reducedPage, 'en');
  await reducedPage.click('[data-language-toggle]');
  const chinese = await checkLanguage(reducedPage, 'zh');
  await reducedContext.close();

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    errors.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  await page.evaluate(openScenery, 1);
  await page.waitForTimeout(350);
  const beforeFade = await page.evaluate(() => {
    const detail = document.querySelector('[data-detail]');
    const copy = document.querySelector('[data-story-copy]');
    return {
      open: detail.classList.contains('is-open'),
      mode: detail.dataset.detailMode,
      reading: detail.classList.contains('is-reading'),
      settled: detail.classList.contains('is-story-settled'),
      copyOpacity: Number(getComputedStyle(copy).opacity),
      title: document.querySelector('.story-title')?.textContent.trim() || '',
      galleryCount: document.querySelectorAll('[data-gallery-list] .story-entry').length
    };
  });
  assert.strictEqual(beforeFade.open, true);
  assert.strictEqual(beforeFade.mode, 'scenery');
  assert.strictEqual(beforeFade.reading, false);
  assert.strictEqual(beforeFade.settled, true);
  assert.strictEqual(beforeFade.copyOpacity, 0);
  assert.strictEqual(beforeFade.title, 'The Ethereal Nights');

  await page.waitForFunction(() => {
    const detail = document.querySelector('[data-detail]');
    return detail.classList.contains('is-reading') && detail.classList.contains('is-story-settled');
  }, null, { timeout: 8000 });
  const afterFade = await page.evaluate(() => {
    const copy = document.querySelector('[data-story-copy]');
    const portrait = document.querySelector('[data-detail-frame]');
    return {
      reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
      copyOpacity: Number(getComputedStyle(copy).opacity),
      portraitOpacity: Number(getComputedStyle(portrait).opacity),
      paragraphs: [...document.querySelectorAll('.story-paragraph')].map((node) => node.textContent.trim()),
      copyScrollable: copy.scrollHeight > copy.clientHeight,
      fontSize: getComputedStyle(document.querySelector('.story-title')).fontSize,
      fontWeight: getComputedStyle(document.querySelector('.story-title')).fontWeight
    };
  });
  assert.strictEqual(afterFade.reading, true);
  assert.strictEqual(afterFade.copyOpacity, 1);
  assert.strictEqual(afterFade.portraitOpacity, 0);
  assert.strictEqual(afterFade.paragraphs.length, 2);
  assert.ok(afterFade.paragraphs[0].startsWith('The new moon is the name of this series.'));
  assert.ok(!/[\u3400-\u9fff\uf900-\ufaff]/.test(afterFade.paragraphs.join('\n')));
  assert.strictEqual(afterFade.fontWeight, '300');
  await page.screenshot({ path: '/tmp/wujiang-scenery-story-desktop.png' });

  await page.click('[data-story-copy]');
  await page.waitForFunction(() => {
    const detail = document.querySelector('[data-detail]');
    return !detail.classList.contains('is-reading') && detail.classList.contains('is-story-settled');
  }, null, { timeout: 7000 });
  const backToPhoto = await page.evaluate(() => ({
    reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
    portraitOpacity: Number(getComputedStyle(document.querySelector('[data-detail-frame]')).opacity),
    copyOpacity: Number(getComputedStyle(document.querySelector('[data-story-copy]')).opacity)
  }));
  assert.strictEqual(backToPhoto.reading, false);
  assert.strictEqual(backToPhoto.portraitOpacity, 1);
  assert.strictEqual(backToPhoto.copyOpacity, 0);

  await page.click('[data-detail-frame]');
  await page.waitForFunction(() => {
    const detail = document.querySelector('[data-detail]');
    return detail.classList.contains('is-reading') && detail.classList.contains('is-story-settled');
  }, null, { timeout: 7000 });
  const backToText = await page.evaluate(() => ({
    reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
    copyOpacity: Number(getComputedStyle(document.querySelector('[data-story-copy]')).opacity)
  }));
  assert.strictEqual(backToText.reading, true);
  assert.strictEqual(backToText.copyOpacity, 1);

  await page.evaluate(() => document.querySelector('[data-language-toggle]').click());
  const switchedLanguage = await page.evaluate(readScenery, 1);
  assert.strictEqual(switchedLanguage.title, '新月');
  assert.strictEqual(switchedLanguage.paragraphs.join('\n\n'), switchedLanguage.bodyZh.trim());
  assert.ok(!/[A-Za-z]/.test(`${switchedLanguage.title}\n${switchedLanguage.paragraphs.join('\n')}`));
  assert.strictEqual(switchedLanguage.contentLang, 'zh-Hans');
  assert.strictEqual(switchedLanguage.frameLabel, '显示风景文本');
  assert.strictEqual(switchedLanguage.storyLabel, '风景文本');

  await page.evaluate(() => document.querySelector('[data-language-toggle]').click());
  const switchedBack = await page.evaluate(readScenery, 1);
  assert.strictEqual(switchedBack.title, 'The Ethereal Nights');
  assert.strictEqual(switchedBack.paragraphs.join('\n\n'), switchedBack.bodyEn.trim());
  assert.ok(!/[\u3400-\u9fff\uf900-\ufaff]/.test(`${switchedBack.title}\n${switchedBack.paragraphs.join('\n')}`));
  assert.strictEqual(switchedBack.contentLang, 'en');

  console.log(JSON.stringify({ english, chinese, beforeFade, afterFade, backToPhoto, backToText, switchedLanguage, switchedBack, errors }, null, 2));
  await context.close();
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
