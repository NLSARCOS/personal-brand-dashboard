/**
 * slide-renderer.js — Motor de rendering HTML→PNG para el dashboard
 * Adaptado de open-carrusel. Hermes llama POST /api/render-slides para generar PNGs.
 */
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIMENSIONS = {
  '1:1':  { width: 1080, height: 1080 },
  '4:5':  { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 }
};

// Singleton browser
let browser = null;
let exportCount = 0;

async function getBrowser() {
  if (exportCount >= 50 && browser) {
    await browser.close().catch(() => {});
    browser = null;
    exportCount = 0;
  }
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    exportCount = 0;
  }
  return browser;
}

/**
 * Wraps slide body HTML into a full document at exact dimensions.
 * Same contract as open-carrusel's wrapSlideHtml.
 */
function wrapSlideHtml(bodyHtml, ratio = '4:5') {
  const { width, height } = DIMENSIONS[ratio] || DIMENSIONS['4:5'];

  // Extract font families from CSS
  const families = new Set();
  const regex = /font-family:\s*['"]?([^;'"}\n]+?)['"]?\s*[;}"]/g;
  let m;
  while ((m = regex.exec(bodyHtml)) !== null) {
    const generics = ['serif','sans-serif','monospace','cursive','system-ui','inherit','initial'];
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/['"]/g, '');
      if (name && !generics.includes(name.toLowerCase())) families.add(name);
    }
  }

  let fontLink = '';
  if (families.size > 0) {
    const params = [...families].map(f =>
      `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`
    ).join('&');
    fontLink = `<link href="https://fonts.googleapis.com/css2?${params}&display=swap" rel="stylesheet">`;
  }

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=${width}, initial-scale=1">
${fontLink}
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${width}px; height:${height}px; overflow:hidden; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/**
 * Renders one slide HTML to a PNG buffer at exact dimensions.
 */
async function renderSlideToPng(bodyHtml, ratio = '4:5') {
  const { width, height } = DIMENSIONS[ratio] || DIMENSIONS['4:5'];
  const fullHtml = wrapSlideHtml(bodyHtml, ratio);

  const br = await getBrowser();
  const page = await br.newPage();

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for Google Fonts to load
    await page.waitForFunction(
      () => document.fonts.ready.then(() =>
        [...document.fonts].every(f => f.status === 'loaded')
      ),
      { timeout: 8000 }
    ).catch(() => {}); // proceed even if fonts timeout

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height }
    });

    exportCount++;

    // Post-process: sRGB + optimize
    return await sharp(screenshot).toColorspace('srgb').png().toBuffer();
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Renders multiple slides and saves them to disk.
 * Returns array of file paths.
 */
async function renderCarousel(slides, ratio = '4:5', outputDir = 'exports') {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
  for (let i = 0; i < slides.length; i++) {
    const buffer = await renderSlideToPng(slides[i].html, ratio);
    const filename = `slide-${i + 1}-${Date.now()}.png`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, buffer);
    results.push({ slide: i + 1, filename, path: `/exports/${filename}`, size: buffer.length });
  }
  return results;
}

module.exports = { wrapSlideHtml, renderSlideToPng, renderCarousel, DIMENSIONS };
