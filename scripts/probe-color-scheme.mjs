#!/usr/bin/env node
/*
 * probe-color-scheme.mjs — does THIS browser propagate prefers-color-scheme into an
 * <img>-loaded SVG?
 *
 *   node scripts/probe-color-scheme.mjs
 *
 * Renders a tiny SVG whose fill is green by default and red under
 * `@media (prefers-color-scheme: dark)`, loads it through <img>, and samples the rendered
 * pixel under each emulated scheme.
 *
 * Why this exists: it is widely claimed that an <img>-loaded SVG gets no
 * prefers-color-scheme hook. That is FALSE in Chromium — this probe is how that was
 * established, and it is here so the claim can be re-tested on a new engine or version
 * rather than repeated on faith.
 *
 * It does NOT make the in-SVG media query a good idea for a GitHub README: it follows the
 * OPERATING SYSTEM preference, while GitHub's theme is a SITE setting, so a reader with a
 * light OS and GitHub set to dark gets the wrong branch. Use <picture>. See
 * references/techniques.md, Technique D.
 *
 * Requires: Playwright (see _playwright.mjs).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadChromium } from './_playwright.mjs';

const LIGHT = 'rgb(0,170,0)';
const DARK = 'rgb(255,0,0)';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-probe-'));
fs.writeFileSync(
  path.join(dir, 'probe.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
<style>
  rect { fill: #00aa00; }
  @media (prefers-color-scheme: dark) { rect { fill: #ff0000; } }
</style>
<rect width="80" height="80"/>
</svg>
`,
);
// A real file on disk, not setContent(): an about:blank document cannot load file://
// sub-resources and the <img> would come back broken.
fs.writeFileSync(
  path.join(dir, 'probe.html'),
  `<body style="margin:0;background:#888"><img src="probe.svg" width="80" height="80" style="position:absolute;left:0;top:0"></body>`,
);

const chromium = await loadChromium();
const browser = await chromium.launch();
const results = {};

for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ colorScheme: scheme, viewport: { width: 120, height: 120 } });
  await page.goto(pathToFileURL(path.join(dir, 'probe.html')).href);
  await page.waitForTimeout(400);

  const shot = await page.screenshot({ clip: { x: 10, y: 10, width: 1, height: 1 } });
  const rgb = await page.evaluate(
    (b64) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = c.height = 1;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          res(`rgb(${d[0]},${d[1]},${d[2]})`);
        };
        img.src = 'data:image/png;base64,' + b64;
      }),
    shot.toString('base64'),
  );

  results[scheme] = rgb;
  const label = rgb === DARK ? 'dark rule applied' : rgb === LIGHT ? 'light rule applied' : 'unexpected';
  console.log(`emulated OS scheme ${scheme.padEnd(5)} → pixel ${rgb.padEnd(14)} (${label})`);
  await page.close();
}

await browser.close();
fs.rmSync(dir, { recursive: true, force: true });

const propagates = results.light === LIGHT && results.dark === DARK;
console.log(
  `\nThis engine ${propagates ? 'DOES' : 'does NOT'} propagate prefers-color-scheme into an <img>-loaded SVG.`,
);
console.log('Either way: use <picture> on GitHub — the site theme is not the OS theme.');
