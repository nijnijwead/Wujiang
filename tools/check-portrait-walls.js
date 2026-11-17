const assert = require('assert');
const path = require('path');
const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');

const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
const expectedCounts = [14, 11, 15, 17, 11, 5, 9];
const expectedNames = ['JA', 'CC', 'Big Brother Belial', 'Pangge', 'Chicken-Wing Bro', 'Dazhi', 'Miscellaneous'];
const expectedCaptionCounts = [7, 5, 5, 5, 4, 0, 0];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    errors.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);

  const galleries = [];
  for (let portrait = 1; portrait <= 7; portrait += 1) {
    await page.evaluate((number) => {
      document.querySelector(`[data-portrait="${number}"]:not([data-clone])`).click();
    }, portrait);
    await page.waitForTimeout(180);

    const gallery = await page.evaluate(() => {
      const entries = [...document.querySelectorAll('[data-gallery-list] .story-entry')];
      const firstImages = entries.slice(0, 2).map((entry) => entry.querySelector('img'));
      return {
        name: document.querySelector('[data-detail-title]').textContent,
        count: entries.length,
        emptyVisible: !document.querySelector('[data-gallery-empty]').hidden,
        firstSources: firstImages.map((image) => image.getAttribute('src')),
        allSources: entries.map((entry) => entry.querySelector('img')?.getAttribute('src') || ''),
        captionCount: entries.filter((entry) => entry.querySelector('.story-caption-text')).length,
        firstCaption: entries.find((entry) => entry.querySelector('.story-caption-text'))
          ?.querySelector('.story-caption-text')?.textContent || '',
        firstLoaded: firstImages.every((image) => image.complete && image.naturalWidth > 0),
        lastSource: entries.at(-1)?.querySelector('img')?.getAttribute('src') || ''
      };
    });

    assert.strictEqual(gallery.count, expectedCounts[portrait - 1], `portrait ${portrait} gallery count`);
    assert.strictEqual(gallery.name, expectedNames[portrait - 1], `portrait ${portrait} name`);
    assert.strictEqual(gallery.emptyVisible, false, `portrait ${portrait} empty state`);
    assert.strictEqual(gallery.firstLoaded, true, `portrait ${portrait} first images loaded`);
    assert.strictEqual(gallery.captionCount, expectedCaptionCounts[portrait - 1], `portrait ${portrait} caption count`);
    assert.ok(
      gallery.allSources.every((src) => src.startsWith(`assets/wall/${String(portrait).padStart(2, '0')}/`)),
      `portrait ${portrait} must use its explicit wall directory`
    );
    if (portrait === 3) {
      assert.ok(gallery.firstCaption.startsWith('Is this Gaojiachong?'), 'portrait 3 English caption');
    }
    if (portrait === 4) {
      assert.ok(gallery.firstCaption.startsWith('Why were you taking pictures in class?'), 'portrait 4 English caption');
    }
    galleries.push({ portrait, ...gallery });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }

  assert.deepStrictEqual(errors, []);
  console.log(JSON.stringify({ galleries, errors }, null, 2));
  await context.close();
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
