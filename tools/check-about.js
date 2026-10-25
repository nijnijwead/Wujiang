const path = require('path');
const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');

const url = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const about = await page.evaluate(() => {
    const aboutBox = document.querySelector('[data-about]').getBoundingClientRect();
    const homeBox = document.querySelector('#portrait-index').getBoundingClientRect();
    const afterBox = document.querySelector('#what-remains').getBoundingClientRect();
    const afterSection = document.querySelector('#what-remains');
    const bodyStyle = getComputedStyle(document.querySelector('.about-text p'));
    return {
      title: document.title,
      wordmark: document.querySelector('.wordmark').textContent.trim(),
      scrollY,
      aboutTop: Math.round(aboutBox.top),
      aboutHeight: Math.round(aboutBox.height),
      homeBelowAbout: homeBox.top >= aboutBox.bottom - 1,
      afterBelowHome: afterBox.top >= homeBox.bottom - 1,
      afterHasHomeFlag: afterSection.hasAttribute('data-home'),
      verticalScrollable: document.documentElement.scrollHeight > innerHeight,
      headline: document.querySelector('.about-headline').textContent,
      subheads: [...document.querySelectorAll('.about-subhead')].map((node) => node.textContent),
      paragraphs: [...document.querySelectorAll('.about-text p')].map((node) => node.textContent),
      copyWidths: [...document.querySelectorAll('.about-copy')].map((node) => Math.round(node.getBoundingClientRect().width)),
      fontFamily: bodyStyle.fontFamily,
      fontWeight: bodyStyle.fontWeight,
      bodyFontSize: parseFloat(bodyStyle.fontSize),
      bodyLineHeight: parseFloat(bodyStyle.lineHeight),
      bodyLeading: +(parseFloat(bodyStyle.lineHeight) / parseFloat(bodyStyle.fontSize)).toFixed(2),
      fontLoaded: document.fonts.check('300 16px "DengXian Light"')
    };
  });
  await page.screenshot({ path: '/tmp/wujiang-about-en.png' });

  const homeTop = await page.evaluate(() => document.querySelector('#portrait-index').offsetTop);
  await page.evaluate((top) => window.scrollTo(0, top), homeTop);
  await page.waitForTimeout(300);
  const home = await page.evaluate(() => ({
    scrollY,
    homeTop: Math.round(document.querySelector('#portrait-index').getBoundingClientRect().top),
    horizontalScrollable: document.querySelector('[data-rail]').scrollWidth > document.querySelector('[data-rail]').clientWidth
  }));
  const scrollBeforeAbout = await page.evaluate(() => scrollY);
  await page.click('[data-about-open]');
  await page.waitForTimeout(350);
  const aboutOverlay = await page.evaluate(() => ({
    open: document.querySelector('[data-about-dialog]').classList.contains('is-open'),
    scrollY,
    imageCount: document.querySelectorAll('[data-about-dialog] img').length,
    paragraphs: document.querySelectorAll('[data-about-dialog-copy] .about-text p').length,
    title: document.querySelector('#about-dialog-title').textContent,
    hash: location.hash
  }));
  await page.screenshot({ path: '/tmp/wujiang-about-overlay.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const afterAboutClose = await page.evaluate(() => ({
    scrollY,
    open: document.querySelector('[data-about-dialog]').classList.contains('is-open'),
    focusedAboutLink: document.activeElement === document.querySelector('[data-about-open]')
  }));

  const afterTop = await page.evaluate(() => document.querySelector('#what-remains').offsetTop);
  await page.evaluate((top) => window.scrollTo(0, top - 120), afterTop);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    scrollY,
    heading: document.querySelector('#what-remains-title').textContent,
    paragraphs: [...document.querySelectorAll('#what-remains .about-text p')].map((node) => node.textContent),
    afterInert: document.querySelector('#what-remains').inert,
    sectionOrder: ['about', 'portrait-index', 'what-remains', 'scenery'].map((id) => document.getElementById(id).offsetTop)
  }));
  await page.screenshot({ path: '/tmp/wujiang-about-after.png' });

  await page.click('[data-language-toggle]');
  await page.waitForTimeout(200);
  const chinese = await page.evaluate(() => ({
    documentTitle: document.title,
    wordmark: document.querySelector('.wordmark').textContent.trim(),
    aboutLabel: document.querySelector('[data-about-open]').textContent,
    bodyLabel: document.querySelector('[data-about-body]').getAttribute('aria-label'),
    headline: document.querySelector('.about-headline').textContent
  }));
  await page.screenshot({ path: '/tmp/wujiang-about-zh.png' });

  console.log(JSON.stringify({ about, home, scrollBeforeAbout, aboutOverlay, afterAboutClose, after, chinese, errors }, null, 2));
  await browser.close();
})();
