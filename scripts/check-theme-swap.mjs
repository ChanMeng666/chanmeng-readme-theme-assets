#!/usr/bin/env node
/*
 * check-theme-swap.mjs — prove that a page actually loads a DIFFERENT image in light and
 * dark, instead of silently loading the same one twice.
 *
 *   node scripts/check-theme-swap.mjs path/to/page.html
 *   node scripts/check-theme-swap.mjs path/to/page.html --shots out/
 *
 * Reads `img.currentSrc` — the property reporting which source the browser actually chose
 * — for every <img> on the page, under an emulated light and dark colour scheme. Exits
 * non-zero if a <picture> resolved to the same file in both.
 *
 * IMPORTANT: pass a real file on disk, not a snippet. A page created with setContent()
 * lives at about:blank and cannot load file:// sub-resources, so every local image comes
 * back broken and you will blame your markup.
 *
 * Requires: Playwright (see _playwright.mjs for resolution and overrides).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadChromium } from './_playwright.mjs';

const argv = process.argv.slice(2);
let shotsDir = null;
let file;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--shots') {
    shotsDir = argv[++i];
  } else if (!argv[i].startsWith('--') && file === undefined) {
    file = argv[i];
  }
}

if (!file) {
  console.error('usage: check-theme-swap.mjs <page.html> [--shots <dir>]');
  process.exit(2);
}
if (!fs.existsSync(file)) {
  console.error(`no such file: ${file}`);
  process.exit(2);
}
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

const url = pathToFileURL(path.resolve(file)).href;
const chromium = await loadChromium();
const browser = await chromium.launch();

const CANVAS = { light: '#ffffff', dark: '#0d1117' };
const seen = {};

for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({
    colorScheme: scheme,
    viewport: { width: 1000, height: 700 },
    deviceScaleFactor: 1.5,
  });
  await page.goto(url);
  // Give animated SVGs and any lazy decode a moment to settle.
  await page.waitForTimeout(1200);

  seen[scheme] = await page.evaluate(() =>
    [...document.querySelectorAll('img')].map((img) => ({
      alt: (img.alt || '').slice(0, 48),
      resolved: (img.currentSrc || img.src).split('/').pop(),
      themed: !!img.closest('picture'),
      w: img.naturalWidth,
      h: img.naturalHeight,
    })),
  );

  if (shotsDir) {
    await page.addStyleTag({ content: `html,body{background:${CANVAS[scheme]} !important}` });
    await page.screenshot({ path: path.join(shotsDir, `theme-${scheme}.png`), fullPage: true });
  }
  await page.close();
}
await browser.close();

const rows = seen.light.map((l, i) => ({ light: l, dark: seen.dark[i] ?? {} }));
let failed = false;

console.log(`${'alt'.padEnd(30)} ${'light'.padEnd(34)} ${'dark'.padEnd(34)} verdict`);
for (const { light, dark } of rows) {
  const same = light.resolved === dark.resolved;
  let verdict;
  if (!light.themed) {
    verdict = same ? 'plain <img> (no swap intended)' : 'changed?';
  } else if (same) {
    verdict = 'SAME FILE — <source> not matching';
    failed = true;
  } else {
    verdict = 'swapped';
    if (light.w !== dark.w || light.h !== dark.h) {
      verdict += ` — SIZE DRIFT ${light.w}x${light.h} vs ${dark.w}x${dark.h}`;
    }
  }
  console.log(
    `${light.alt.padEnd(30)} ${String(light.resolved).padEnd(34)} ${String(dark.resolved).padEnd(34)} ${verdict}`,
  );
  if (light.w === 0 || dark.w === 0) {
    console.log('    ^ naturalWidth 0 — the image failed to load; check the path.');
    failed = true;
  }
}

if (shotsDir) console.log(`\nScreenshots written to ${shotsDir}`);
process.exit(failed ? 1 : 0);
