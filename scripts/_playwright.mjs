/*
 * Shared Playwright resolver.
 *
 * Playwright is often installed globally rather than in the project being audited, so a
 * bare `import('playwright')` fails in exactly the repos where this skill is most useful.
 * Try the local resolution first, then an explicit override, then fail with instructions
 * rather than a stack trace.
 *
 *   PLAYWRIGHT_IMPORT=file:///D:/npm-global/node_modules/playwright/index.mjs node script.mjs
 */
export async function loadChromium() {
  const candidates = [process.env.PLAYWRIGHT_IMPORT, 'playwright', 'playwright-core'].filter(
    Boolean,
  );
  const errors = [];
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      if (mod.chromium) return mod.chromium;
    } catch (err) {
      errors.push(`${spec}: ${err.message.split('\n')[0]}`);
    }
  }
  console.error('Could not load Playwright. Tried:\n  ' + errors.join('\n  '));
  console.error('\nFix with either:');
  console.error('  npm i -D playwright && npx playwright install chromium');
  console.error('  PLAYWRIGHT_IMPORT=file:///abs/path/to/playwright/index.mjs <command>');
  process.exit(1);
}
