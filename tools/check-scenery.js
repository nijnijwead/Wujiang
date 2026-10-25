const path = require('path');
const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');

const url = 'file://' + path.resolve(__dirname, '..', 'index.html');

const readRailState = (label) => {
  const root = document.querySelector('#scenery');
  const rail = root.querySelector('[data-rail]');
  const railRect = rail.getBoundingClientRect();
  const railCenter = railRect.left + railRect.width / 2;
  const cards = [...root.querySelectorAll('.portrait-card')];
  const realCards = [...root.querySelectorAll('.portrait-card:not([data-clone])')];
  const nearest = cards.reduce((best, card) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - railCenter);
    return distance < best.distance ? { card, distance } : best;
  }, { card: cards[0], distance: Infinity });
  const styles = nearest.card ? getComputedStyle(nearest.card) : null;
  return {
    label,
    realCount: realCards.length,
    cloneCount: cards.length - realCards.length,
    scrollable: rail.scrollWidth > rail.clientWidth,
    footer: root.querySelector('.rail-count').textContent.trim(),
    current: root.querySelector('[data-current]').textContent,
    progress: root.querySelector('[data-progress]').style.width,
    centerDistance: Math.round(nearest.distance),
    centerScale: styles ? Number(styles.getPropertyValue('--card-scale')) : 0,
    centerBlur: styles ? styles.getPropertyValue('--card-blur') : '',
    images: realCards.map((card) => card.querySelector('img').getAttribute('src')),
    alts: realCards.map((card) => card.querySelector('img').alt)
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
    page.on('requestfailed', (request) => errors.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);

    const initial = await page.evaluate(readRailState, 'initial');
    const sceneryTop = await page.evaluate(() => document.querySelector('#scenery').offsetTop);
    await page.evaluate((top) => window.scrollTo(0, top), sceneryTop);
    await page.waitForTimeout(900);

    const centered = await page.evaluate(readRailState, 'centered');
    await page.screenshot({ path: `/tmp/wujiang-scenery-${setup.label}.png` });

    await page.click('#scenery [data-next]');
    await page.waitForTimeout(900);
    const afterNext = await page.evaluate(readRailState, 'after-next');

    await page.click('#scenery .portrait-card:not([data-clone])', { force: true });
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `/tmp/wujiang-scenery-detail-${setup.label}.png` });
    const sceneryClickOpenedDetail = await page.evaluate(() => {
      const detail = document.querySelector('[data-detail]');
      return {
        open: detail.classList.contains('is-open'),
        mode: detail.dataset.detailMode,
        title: document.querySelector('[data-detail-title]').textContent,
        number: document.querySelector('[data-detail-number]').textContent,
        total: document.querySelector('[data-detail-total]').textContent,
        galleryCount: document.querySelectorAll('[data-gallery-list] .story-entry').length
      };
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const sceneryCollections = [];
    for (let index = 1; index <= 7; index += 1) {
      await page.evaluate((sceneryIndex) => {
        document.querySelector(`[data-scenery="${sceneryIndex}"]:not([data-clone])`).click();
      }, index);
      await page.waitForTimeout(180);
      sceneryCollections.push(await page.evaluate((sceneryIndex) => ({
        scenery: sceneryIndex,
        mode: document.querySelector('[data-detail]').dataset.detailMode,
        galleryCount: document.querySelectorAll('[data-gallery-list] .story-entry').length,
        firstImage: document.querySelector('[data-gallery-list] img')?.getAttribute('src') || '',
        emptyVisible: !document.querySelector('[data-gallery-empty]').hidden
      }), index));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(120);
    }

    await page.evaluate(() => window.scrollTo(0, document.querySelector('#portrait-index').offsetTop));
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector('[data-portrait="1"]:not([data-clone])').click());
    await page.waitForTimeout(900);
    const portraitStillOpens = await page.evaluate(() => document.querySelector('[data-detail]').classList.contains('is-open'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);

    console.log(JSON.stringify({
      setup: setup.label,
      initial,
      centered,
      afterNext,
      sceneryClickOpenedDetail,
      sceneryCollections,
      portraitStillOpens,
      errors
    }, null, 2));

    await page.close();
  }

  await browser.close();
})();
