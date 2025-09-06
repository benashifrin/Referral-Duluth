/*
  Record a high-resolution (4K) video of the /qrcode page.
  Usage:
    - npm run record:qrcode              (default 12s)
    - DURATION=20 npm run record:qrcode  (seconds)
    - URL=https://example.com/qrcode npm run record:qrcode
*/

const fs = require('fs');
const path = require('path');

async function main() {
  const { chromium } = require('playwright');

  const URL = process.env.URL || 'https://www.bestdentistduluth.com/qrcode';
  const DURATION = Number(process.env.DURATION || 12); // seconds
  const OUTDIR = path.join(process.cwd(), 'videos');

  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // 4K UHD capture
    viewport: { width: 3840, height: 2160 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUTDIR, size: { width: 3840, height: 2160 } },
    // Ensure consistent visuals
    colorScheme: 'light',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Playwright',
  });

  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Give the page some time to render animations
  await page.waitForTimeout(DURATION * 1000);

  // Retrieve video path (available after page.close())
  const video = page.video && page.video();
  await page.close();
  let vpath = null;
  if (video) {
    try { vpath = await video.path(); } catch {}
  }
  await context.close();
  await browser.close();

  console.log('\nRecorded video saved to:', vpath ? vpath : OUTDIR);
  console.log('Note: Playwright saves WebM. Convert to MP4 via ffmpeg if needed:');
  console.log('  ffmpeg -i "' + (vpath || 'videos/output.webm') + '" -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p videos/qrcode.mp4');
}

main().catch((err) => {
  console.error('Recording failed:', err);
  process.exit(1);
});
