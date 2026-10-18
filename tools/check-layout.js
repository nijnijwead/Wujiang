const path = require('path');
const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');

const url = 'file://' + path.resolve(__dirname, '..', 'index.html');

const rect = (node) => {
  const box = node.getBoundingClientRect();
  return {
    x: Math.round(box.x), y: Math.round(box.y),
    width: Math.round(box.width), height: Math.round(box.height),
    ratio: +(box.width / box.height).toFixed(3)
  };
};

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

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const home = await page.evaluate(() => {
      const box = (selector) => {
        const node = document.querySelector(selector);
        const value = node.getBoundingClientRect();
        return {
          x: Math.round(value.x), y: Math.round(value.y),
          width: Math.round(value.width), height: Math.round(value.height),
          ratio: +(value.width / value.height).toFixed(3)
        };
      };
      const rail = document.querySelector('[data-rail]');
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        home: box('.home'),
        rail: box('[data-rail]'),
        card: box('[data-portrait]:not([data-clone])'),
        cardCount: document.querySelectorAll('[data-portrait]:not([data-clone])').length,
        cardDepth: [...document.querySelectorAll('[data-portrait]:not([data-clone])')].slice(0, 4).map((card) => ({
          scale: getComputedStyle(card).getPropertyValue('--card-scale').trim(),
          blur: getComputedStyle(card).getPropertyValue('--card-blur').trim(),
          opacity: getComputedStyle(card).getPropertyValue('--card-opacity').trim(),
          rect: (() => {
            const value = card.getBoundingClientRect();
            return { x: Math.round(value.x), width: Math.round(value.width), height: Math.round(value.height) };
          })()
        })),
        railScrollWidth: rail.scrollWidth,
        railClientWidth: rail.clientWidth,
        footer: box('.rail-footer')
      };
    });
    console.log(`${setup.label} home: ${JSON.stringify(home, null, 2)}`);
    await page.screenshot({ path: `/tmp/wujiang-${setup.label}-home.png` });

    await page.locator('[data-portrait]:not([data-clone])').nth(1).click();
    await page.waitForTimeout(220);
    console.log(`${setup.label} transition: ${JSON.stringify(await page.evaluate(() => ({
      clone: !!document.querySelector('.zoom-clone'),
      frameHidden: getComputedStyle(document.querySelector('[data-detail-frame]')).visibility,
      focused: document.activeElement?.getAttribute('data-close') !== null
    })))}`);
    await page.screenshot({ path: `/tmp/wujiang-${setup.label}-transition.png` });
    await page.waitForTimeout(1300);
    const detail = await page.evaluate(() => {
      const box = (selector) => {
        const node = document.querySelector(selector);
        const value = node.getBoundingClientRect();
        return {
          x: Math.round(value.x), y: Math.round(value.y),
          width: Math.round(value.width), height: Math.round(value.height),
          ratio: +(value.width / value.height).toFixed(3)
        };
      };
      return {
        open: document.querySelector('[data-detail]').classList.contains('is-open'),
        hidden: document.querySelector('[data-detail]').getAttribute('aria-hidden'),
        title: document.querySelector('[data-detail-title]').textContent,
        portrait: box('[data-detail-frame]'),
        story: box('[data-story]'),
        gallery: box('[data-story-gallery]'),
        galleryEntries: document.querySelectorAll('.story-entry').length,
        galleryImages: [...document.querySelectorAll('.story-photo img')].slice(0, 12).map((img) => ({
          src: img.getAttribute('src'), complete: img.complete,
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight
        })),
        caption: (() => {
          const value = document.querySelector('.story-caption').getBoundingClientRect();
          return { x: Math.round(value.x), width: Math.round(value.width) };
        })(),
        portraitImages: [...document.querySelectorAll('[data-portrait]:not([data-clone]) img')].map((img) => ({
          src: img.getAttribute('src'), complete: img.complete,
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight
        }))
      };
    });
    console.log(`${setup.label} detail: ${JSON.stringify(detail, null, 2)}`);
    await page.screenshot({ path: `/tmp/wujiang-${setup.label}-detail.png` });

    await page.locator('[data-close]').click();
    await page.waitForTimeout(450);
    console.log(`${setup.label} closed: ${await page.locator('[data-detail]').getAttribute('aria-hidden')}`);
    if (errors.length) console.log(`${setup.label} errors: ${JSON.stringify(errors)}`);
    await page.close();
  }

  await browser.close();
})();
