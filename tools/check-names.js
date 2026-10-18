const path = require('path');
const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');

const url = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const setup of [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport: { width: setup.width, height: setup.height } });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      try { localStorage.clear(); } catch { /* local file storage can be unavailable */ }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);

    const readNames = () => page.evaluate(() => [...document.querySelectorAll('[data-portrait]:not([data-clone])')].map((card) => {
      const primary = card.querySelector('.portrait-name-primary');
      const image = card.querySelector('img');
      const portrait = card.getBoundingClientRect();
      const label = primary.getBoundingClientRect();
      return {
        number: card.dataset.portrait,
        primary: primary.textContent,
        ariaLabel: card.getAttribute('aria-label'),
        alt: image.alt,
        color: getComputedStyle(primary).color,
        fontFamily: getComputedStyle(primary).fontFamily,
        fontWeight: getComputedStyle(primary).fontWeight,
        insidePortrait: label.left >= portrait.left && label.right <= portrait.right && label.bottom <= portrait.bottom
      };
    }));

    const english = await readNames();
    await page.screenshot({ path: `/tmp/wujiang-names-${setup.label}-en.png` });

    await page.click('[data-language-toggle]');
    await page.waitForTimeout(250);
    const chinese = await readNames();
    await page.screenshot({ path: `/tmp/wujiang-names-${setup.label}-zh.png` });

    await page.evaluate(() => document.querySelector('[data-portrait="3"]').click());
    await page.waitForTimeout(1000);
    const detail = await page.evaluate(() => {
      const name = document.querySelector('.detail-portrait-name');
      const primary = document.querySelector('.detail-portrait-name-primary');
      const portrait = document.querySelector('[data-detail-frame]').getBoundingClientRect();
      const label = name.getBoundingClientRect();
      return {
        primary: primary.textContent,
        color: getComputedStyle(primary).color,
        framePortrait: document.querySelector('[data-detail]').dataset.portrait,
        frameLabel: document.querySelector('[data-detail-frame]').getAttribute('aria-label'),
        imageAlt: document.querySelector('[data-detail-image]').alt,
        insidePortrait: label.left >= portrait.left && label.right <= portrait.right && label.bottom <= portrait.bottom
      };
    });
    await page.screenshot({ path: `/tmp/wujiang-names-${setup.label}-detail.png` });

    console.log(`${setup.label}: ${JSON.stringify({ english, chinese, detail, errors }, null, 2)}`);
    await page.close();
  }

  await browser.close();
})();
