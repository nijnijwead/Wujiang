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

  const home = await page.evaluate(() => ({
    title: document.title,
    wordmark: document.querySelector('.wordmark').textContent.trim(),
    dragHint: [...document.querySelectorAll('.rail-footer *')].some((node) => node.textContent.trim() === 'Drag')
  }));

  await page.click('[data-about-open]');
  await page.waitForTimeout(400);
  const about = await page.evaluate(() => ({
    open: document.querySelector('[data-about]').classList.contains('is-open'),
    hidden: document.querySelector('[data-about]').getAttribute('aria-hidden'),
    title: document.querySelector('#about-title').textContent,
    headline: document.querySelector('.about-headline').textContent,
    paragraphs: [...document.querySelectorAll('.about-text p')].map((node) => node.textContent),
    opacity: getComputedStyle(document.querySelector('.about-body')).opacity,
    fontFamily: getComputedStyle(document.querySelector('.about-text p')).fontFamily,
    fontWeight: getComputedStyle(document.querySelector('.about-text p')).fontWeight,
    fontLoaded: document.fonts.check('300 16px "DengXian Light"'),
    scrollable: document.querySelector('.about-body').scrollHeight > document.querySelector('.about-body').clientHeight
  }));
  await page.screenshot({ path: '/tmp/wujiang-about-en.png' });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  const closed = await page.evaluate(() => ({
    open: document.querySelector('[data-about]').classList.contains('is-open'),
    hidden: document.querySelector('[data-about]').getAttribute('aria-hidden'),
    focus: document.activeElement?.hasAttribute('data-about-open')
  }));

  await page.click('[data-language-toggle]');
  await page.waitForTimeout(200);
  await page.click('[data-about-open]');
  await page.waitForTimeout(400);
  const chinese = await page.evaluate(() => ({
    documentTitle: document.title,
    wordmark: document.querySelector('.wordmark').textContent.trim(),
    aboutTitle: document.querySelector('#about-title').textContent,
    bodyLabel: document.querySelector('[data-about-body]').getAttribute('aria-label'),
    headline: document.querySelector('.about-headline').textContent
  }));
  await page.screenshot({ path: '/tmp/wujiang-about-zh.png' });

  console.log(JSON.stringify({ home, about, closed, chinese, errors }, null, 2));
  await browser.close();
})();
