#!/usr/bin/env node
/*
 * check-sanitizer.mjs — run a snippet through GitHub's own Markdown renderer and report
 * what survived sanitisation.
 *
 * GitHub strips HTML in Markdown per-tag and per-attribute. Before relying on <picture>,
 * a `media` query, or an `align` attribute, ask the renderer instead of guessing.
 *
 *   node scripts/check-sanitizer.mjs snippet.html
 *   echo '<picture>…</picture>' | node scripts/check-sanitizer.mjs
 *   node scripts/check-sanitizer.mjs snippet.html --context OWNER/REPO
 *
 * Requires: the GitHub CLI (`gh`), authenticated. No other dependencies.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
let context;
let fileArg;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--context') {
    context = argv[++i];
  } else if (!argv[i].startsWith('--') && fileArg === undefined) {
    fileArg = argv[i];
  }
}

// Only read stdin when it is actually piped. Reading fd 0 on an interactive terminal
// blocks forever, which looks exactly like the script hanging.
const readStdin = () => {
  if (process.stdin.isTTY) return '';
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

const text = fileArg ? fs.readFileSync(fileArg, 'utf8') : readStdin();
if (!text.trim()) {
  console.error('usage: check-sanitizer.mjs <snippet.html> [--context OWNER/REPO]');
  console.error('   or: echo "<picture>…</picture>" | check-sanitizer.mjs');
  process.exit(2);
}

const payload = { mode: 'gfm', text };
if (context) payload.context = context;

const tmp = path.join(os.tmpdir(), `gh-markdown-${process.pid}.json`);
fs.writeFileSync(tmp, JSON.stringify(payload));

let html;
try {
  // NOTE: endpoint is `markdown` with NO leading slash. A leading slash makes Git Bash on
  // Windows rewrite it into a filesystem path and gh fails with "invalid API endpoint".
  html = execFileSync('gh', ['api', '-X', 'POST', 'markdown', '--input', tmp], {
    encoding: 'utf8',
  });
} catch (err) {
  console.error('gh call failed — is the GitHub CLI installed and authenticated?');
  console.error(String(err.stderr || err.message).trim());
  process.exit(1);
} finally {
  fs.rmSync(tmp, { force: true });
}

console.log('--- rendered HTML ---');
console.log(html.trim());
console.log('\n--- survived sanitisation ---');

const checks = [
  ['<picture>', /<picture>/],
  ['<source>', /<source\b/],
  ['media="(prefers-color-scheme: …)"', /media="\(prefers-color-scheme/],
  ['srcset', /srcset=/],
  ['alt', /alt=/],
  ['width', /width=/],
  ['height', /height=/],
  ['align (float)', /align=/],
  ['GitHub <themed-picture> wrapper', /<themed-picture/],
];

let missingRequested = false;
for (const [label, re] of checks) {
  const inInput = re.test(text) || label.startsWith('GitHub');
  if (!inInput) continue; // only report on things the snippet actually used
  const kept = re.test(html);
  console.log(`${kept ? 'OK  ' : 'LOST'}  ${label}`);
  if (!kept && !label.startsWith('GitHub')) missingRequested = true;
}

if (missingRequested) {
  console.log('\nSomething you wrote was stripped. Move presentation attributes onto the');
  console.log('inner <img> — GitHub allows attributes per tag, and <img> keeps the most.');
  process.exit(1);
}
