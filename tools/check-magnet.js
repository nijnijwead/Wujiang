const path = require('path');
const { chromium } = require('/Applications/ChatGPT.app/Contents/Resources/cua_node/lib/node_modules/playwright');

const url = 'file://' + path.resolve(__dirname, '..', 'index.html');

const readSection = (selector) => {
  const section = document.querySelector(selector);
  const rect = section.getBoundingClientRect();
  const viewport = document.documentElement.clientHeight;
  const visible = Math.max(0, Math.min(rect.bottom, viewport) - Math.max(rect.top, 0));
  return {
    scrollY: Math.round(window.scrollY),
    top: Math.round(rect.top),
    coverage: Number((visible / viewport).toFixed(3)),
    viewport
  };
};

const scrollAndWait = async (page, top) => {
  await page.evaluate((y) => window.scrollTo(0, y), top);
  await page.waitForTimeout(1250);
};

const sampleSpring = async (page, top, duration = 1500) => {
  await page.evaluate((y) => window.scrollTo(0, y), top);
  return page.evaluate(async (sampleDuration) => {
    const samples = [];
    const started = performance.now();

    return new Promise((resolve) => {
      const sample = () => {
        const time = performance.now() - started;
        samples.push({ time: Math.round(time), scrollY: window.scrollY });
        if (time < sampleDuration) requestAnimationFrame(sample);
        else resolve(samples);
      };
      requestAnimationFrame(sample);
    });
  }, duration);
};

const summarizeSpring = (samples, target) => {
  const positions = samples.map((sample) => sample.scrollY);
  const lastMoving = [...samples].reverse().find((sample) => Math.abs(sample.scrollY - target) > 0.75);
  return {
    frames: new Set(positions.map((position) => Math.round(position))).size,
    target: Number(target.toFixed(2)),
    start: Number(positions[0].toFixed(2)),
    max: Number(Math.max(...positions).toFixed(2)),
    min: Number(Math.min(...positions).toFixed(2)),
    overshootPx: Number((Math.max(...positions) - target).toFixed(2)),
    settleMs: lastMoving?.time ?? 0,
    finalY: Number(positions.at(-1).toFixed(2))
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const setup of [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 }
  ]) {
    const portraitPage = await browser.newPage({ viewport: { width: setup.width, height: setup.height } });
    await portraitPage.goto(url, { waitUntil: 'domcontentloaded' });
    await portraitPage.evaluate(() => document.fonts.ready);

    const portraitStart = await portraitPage.evaluate(() => document.querySelector('#portrait-index').offsetTop);
    const viewport = setup.height;

    await scrollAndWait(portraitPage, portraitStart - Math.round(viewport * 0.2));
    const portraitMagnetized = await portraitPage.evaluate(readSection, '#portrait-index');

    await portraitPage.reload({ waitUntil: 'domcontentloaded' });
    await portraitPage.evaluate(() => document.fonts.ready);
    await scrollAndWait(portraitPage, portraitStart - Math.round(viewport * 0.3));
    const portraitReleased = await portraitPage.evaluate(readSection, '#portrait-index');

    await portraitPage.reload({ waitUntil: 'domcontentloaded' });
    await portraitPage.evaluate(() => document.fonts.ready);
    await portraitPage.evaluate((top) => window.scrollTo(0, top), portraitStart - Math.round(viewport * 0.2));
    await portraitPage.waitForTimeout(190);
    await portraitPage.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 80 })));
    await portraitPage.waitForTimeout(1000);
    const portraitInterrupted = await portraitPage.evaluate(readSection, '#portrait-index');

    const sceneryPage = await browser.newPage({ viewport: { width: setup.width, height: setup.height } });
    await sceneryPage.goto(url, { waitUntil: 'domcontentloaded' });
    await sceneryPage.evaluate(() => document.fonts.ready);
    const sceneryStart = await sceneryPage.evaluate(() => document.querySelector('#scenery').offsetTop);

    await scrollAndWait(sceneryPage, sceneryStart - Math.round(viewport * 0.2));
    const sceneryMagnetized = await sceneryPage.evaluate(readSection, '#scenery');

    await sceneryPage.reload({ waitUntil: 'domcontentloaded' });
    await sceneryPage.evaluate(() => document.fonts.ready);
    await scrollAndWait(sceneryPage, sceneryStart - Math.round(viewport * 0.3));
    const sceneryReleased = await sceneryPage.evaluate(readSection, '#scenery');

    results.push({
      setup: setup.label,
      portraitMagnetized,
      portraitReleased,
      portraitInterrupted,
      sceneryMagnetized,
      sceneryReleased
    });

    await portraitPage.close();
    await sceneryPage.close();
  }

  for (const motion of [
    { label: 'standard', reducedMotion: 'no-preference' },
    { label: 'reduce', reducedMotion: 'reduce' }
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.emulateMedia({ reducedMotion: motion.reducedMotion });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const portraitStart = await page.evaluate(() => document.querySelector('#portrait-index').offsetTop);
    const samples = await sampleSpring(page, portraitStart - 180);
    results.push({ motion: motion.label, spring: summarizeSpring(samples, portraitStart) });
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
