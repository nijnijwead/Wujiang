const path = require('path');
const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');

const url = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const setup of [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 },
    { label: 'reduced', width: 1440, height: 900, reducedMotion: 'reduce' }
  ]) {
    const page = await browser.newPage({
      viewport: { width: setup.width, height: setup.height },
      reducedMotion: setup.reducedMotion || 'no-preference'
    });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('[data-portrait="1"]').click());
    await page.waitForTimeout(1000);

    const portraitState = await page.evaluate(() => ({
      title: document.querySelector('[data-detail-title]').textContent,
      reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
      portraitOpacity: getComputedStyle(document.querySelector('[data-detail-frame]')).opacity,
      portraitVisibility: getComputedStyle(document.querySelector('[data-detail-frame]')).visibility,
      entries: document.querySelectorAll('.story-entry').length,
      wallTiles: document.querySelectorAll('.wall-tile').length
    }));
    await page.screenshot({ path: `/tmp/wujiang-story-${setup.label}-portrait.png` });

    await page.waitForTimeout(2200);
    const transitionMid = await page.evaluate(() => ({
      reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
      transitioning: document.querySelector('[data-detail]').classList.contains('is-story-transitioning'),
      copyOpacity: Number(getComputedStyle(document.querySelector('[data-story-copy]')).opacity),
      portraitOpacity: Number(getComputedStyle(document.querySelector('[data-detail-frame]')).opacity)
    }));
    await page.waitForFunction(() => document.querySelector('[data-detail]').classList.contains('is-story-settled'), null, { timeout: 6000 });
    const storyState = await page.evaluate(() => {
      const box = (selector) => {
        const value = document.querySelector(selector).getBoundingClientRect();
        return {
          x: Math.round(value.x), y: Math.round(value.y),
          width: Math.round(value.width), height: Math.round(value.height),
          ratio: +(value.width / value.height).toFixed(3)
        };
      };
      const copy = document.querySelector('[data-story-copy]');
      const gallery = document.querySelector('[data-story-gallery]');
      const images = [...document.querySelectorAll('.story-photo img')];
      return {
        reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
        settled: document.querySelector('[data-detail]').classList.contains('is-story-settled'),
        copyOpacity: getComputedStyle(copy).opacity,
        copyInert: copy.inert,
        portraitOpacity: getComputedStyle(document.querySelector('[data-detail-frame]')).opacity,
        portraitVisibility: getComputedStyle(document.querySelector('[data-detail-frame]')).visibility,
        story: box('[data-story]'),
        gallery: box('[data-story-gallery]'),
        firstPhoto: box('.story-photo'),
        firstCaption: box('.story-caption'),
        entries: document.querySelectorAll('.story-entry').length,
        captions: [...document.querySelectorAll('.story-caption-text')].slice(0, 5).map((node) => node.textContent),
        captionNumbers: [...document.querySelectorAll('.story-caption-number')].slice(0, 6).map((node) => node.textContent),
        captionPlaceholders: [...document.querySelectorAll('.story-caption-text')].filter((node) => /说明待补充|Caption forthcoming/.test(node.textContent)).length,
        firstImages: images.slice(0, 4).map((image) => ({
          src: image.getAttribute('src'), complete: image.complete, width: image.naturalWidth
        })),
        galleryScrollable: gallery.scrollHeight > gallery.clientHeight,
        copyOverflow: getComputedStyle(copy).overflowY,
        copyScrollable: copy.scrollHeight > copy.clientHeight,
        paragraphs: document.querySelectorAll('.story-paragraph').length,
        firstParagraph: document.querySelector('.story-paragraph')?.textContent.slice(0, 48) || '',
        storyFont: getComputedStyle(document.querySelector('.story-paragraph')).fontFamily,
        storyWeight: getComputedStyle(document.querySelector('.story-paragraph')).fontWeight,
        fontLoaded: document.fonts.check('300 16px "DengXian Light"')
      };
    });
    console.log(`${setup.label}: ${JSON.stringify({ portraitState, transitionMid, storyState, errors }, null, 2)}`);
    await page.screenshot({ path: `/tmp/wujiang-story-${setup.label}-text.png` });

    await page.click('[data-story-copy]');
    await page.waitForTimeout(150);
    const returnMid = await page.evaluate(() => ({
      reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
      transitioning: document.querySelector('[data-detail]').classList.contains('is-story-transitioning'),
      copyOpacity: Number(getComputedStyle(document.querySelector('[data-story-copy]')).opacity),
      portraitOpacity: Number(getComputedStyle(document.querySelector('[data-detail-frame]')).opacity)
    }));
    await page.waitForFunction(() => document.querySelector('[data-detail]').classList.contains('is-story-settled'), null, { timeout: 6000 });
    const portraitAgain = await page.evaluate(() => ({
      reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
      settled: document.querySelector('[data-detail]').classList.contains('is-story-settled'),
      copyOpacity: Number(getComputedStyle(document.querySelector('[data-story-copy]')).opacity),
      portraitOpacity: Number(getComputedStyle(document.querySelector('[data-detail-frame]')).opacity),
      focusOnPortrait: document.activeElement === document.querySelector('[data-detail-frame]')
    }));

    await page.click('[data-detail-frame]');
    await page.waitForFunction(() => document.querySelector('[data-detail]').classList.contains('is-story-settled'), null, { timeout: 6000 });
    const textAgain = await page.evaluate(() => ({
      reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
      settled: document.querySelector('[data-detail]').classList.contains('is-story-settled'),
      copyOpacity: Number(getComputedStyle(document.querySelector('[data-story-copy]')).opacity),
      portraitOpacity: Number(getComputedStyle(document.querySelector('[data-detail-frame]')).opacity),
      focusOnText: document.activeElement === document.querySelector('[data-story-copy]')
    }));
    console.log(`${setup.label} toggles: ${JSON.stringify({ returnMid, portraitAgain, textAgain }, null, 2)}`);
    await page.close();
  }

  const blank = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await blank.goto(url, { waitUntil: 'domcontentloaded' });
  await blank.waitForTimeout(500);
  await blank.evaluate(() => document.querySelector('[data-portrait="5"]').click());
  await blank.waitForFunction(() => {
    const detail = document.querySelector('[data-detail]');
    return detail.classList.contains('is-reading') && detail.classList.contains('is-story-settled');
  }, null, { timeout: 7000 });
  await blank.waitForTimeout(100);
  const blankState = await blank.evaluate(() => ({
    reading: document.querySelector('[data-detail]').classList.contains('is-reading'),
    placeholder: document.querySelector('.story-copy-empty')?.textContent || '',
    paragraphs: document.querySelectorAll('.story-paragraph').length,
    entries: document.querySelectorAll('.story-entry').length
  }));
  console.log(`blank: ${JSON.stringify(blankState, null, 2)}`);
  await blank.close();

  const updated = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const updatedErrors = [];
  updated.on('console', (message) => {
    if (message.type() === 'error') updatedErrors.push(message.text());
  });
  updated.on('pageerror', (error) => updatedErrors.push(error.message));
  await updated.goto(url, { waitUntil: 'domcontentloaded' });
  await updated.evaluate(() => document.fonts.ready);
  await updated.waitForTimeout(500);

  const openPortrait = async (number) => {
    await updated.evaluate((portrait) => document.querySelector(`.portrait-card[data-portrait="${portrait}"]`).click(), number);
    await updated.waitForTimeout(900);
  };

  await openPortrait(3);
  const portraitThree = await updated.evaluate(() => ({
    entries: [...document.querySelectorAll('.story-entry')].map((entry) => ({
      number: entry.dataset.photo,
      caption: entry.querySelector('.story-caption-text')?.textContent || ''
    })),
    placeholders: document.body.textContent.includes('说明待补充') || document.body.textContent.includes('Caption forthcoming')
  }));
  await updated.screenshot({ path: '/tmp/wujiang-story-updated-03.png' });

  await updated.keyboard.press('Escape');
  await updated.waitForTimeout(250);
  await openPortrait(6);
  const portraitSix = await updated.evaluate(() => ({
    paragraphs: document.querySelectorAll('.story-paragraph').length,
    firstParagraph: document.querySelector('.story-paragraph')?.textContent.slice(0, 42) || ''
  }));
  await updated.screenshot({ path: '/tmp/wujiang-story-updated-06.png' });

  await updated.keyboard.press('Escape');
  await updated.waitForTimeout(250);
  await openPortrait(7);
  const portraitSeven = await updated.evaluate(() => ({
    paragraphs: document.querySelectorAll('.story-paragraph').length,
    firstParagraph: document.querySelector('.story-paragraph')?.textContent.slice(0, 42) || ''
  }));
  await updated.screenshot({ path: '/tmp/wujiang-story-updated-07.png' });

  console.log(`updated: ${JSON.stringify({ portraitThree, portraitSix, portraitSeven, errors: updatedErrors }, null, 2)}`);
  await updated.close();

  await browser.close();
})();
