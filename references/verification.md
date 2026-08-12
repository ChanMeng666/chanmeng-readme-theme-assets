# Verification

Do not eyeball this in whichever theme you happen to be using. Three cheap checks catch
everything in `failures-and-checklist.md`.

---

## 1. Ask GitHub what it does with your markup

Authoritative, because it is literally GitHub's renderer, and it costs one API call.

```bash
node scripts/check-sanitizer.mjs snippet.html
# or pipe it:
echo '<picture>…</picture>' | node scripts/check-sanitizer.mjs
```

Under the hood:

```bash
cat > /tmp/md.json <<'JSON'
{"mode":"gfm","context":"OWNER/REPO","text":"<picture><source media=\"(prefers-color-scheme: dark)\" srcset=\"dark.svg\"><img src=\"light.svg\" width=\"160\" alt=\"x\"></picture>"}
JSON
gh api -X POST markdown --input /tmp/md.json
```

Read the output for: did `<picture>` / `<source>` / `srcset` survive? Did your presentation
attributes (`align`, `width`) survive?

> **Gotcha.** The endpoint is `markdown` with **no leading slash**. A leading `/` makes Git
> Bash on Windows rewrite it into a filesystem path and `gh` fails with
> `invalid API endpoint: "C:/Program Files/Git/markdown"`.

---

## 2. Prove the right file loads in each theme

Render GitHub's *output* — not your input — and read `img.currentSrc`, the property that
reports which source the browser actually chose.

```bash
node scripts/check-theme-swap.mjs path/to/page.html
```

Expect two different filenames. The same filename twice means the `<source>` is not
matching and the swap is silently doing nothing.

---

## 3. Screenshot both themes on the real canvas

Set the page background to `#ffffff` and `#0d1117` and look, at the size readers will
actually see (a hero at 160px, an icon at 48px). This is what catches what no assertion
will: a card edge that reads as a seam, a mid-tone that goes muddy, particles escaping a
clip, a logo cramped against its own frame.

---

## Environment gotchas that waste the most time

- **`page.setContent()` cannot load `file://` sub-resources.** The document is
  `about:blank`, so every local image renders as a broken-image icon and you will conclude
  your markup is wrong when it is fine. Write a real HTML file next to the assets and
  `page.goto()` it. This is the single most common false alarm in this workflow.
- Use **relative** paths inside that scratch HTML, for the same reason.
- `deviceScaleFactor: 1.5`–`2` makes small-size checks legible.
- Playwright may be installed globally rather than in the project. The scripts here try a
  local resolve first and fall back to a clear message; if you hit it, either
  `npm i -D playwright` or point `PLAYWRIGHT_IMPORT` at a global install, e.g.
  `PLAYWRIGHT_IMPORT=file:///D:/npm-global/node_modules/playwright/index.mjs`.

---

## Verifying an animated SVG variant

If the derived asset is animated, prove the derivation changed nothing but the background:

- **Differential timeline.** Load source and variant, pause every animation, seek both to
  the same set of instants (include the loop seam — e.g. 99.5 s, 99.9 s, 0 s, 0.2 s on a
  100 s loop) and compare computed styles. They should be identical. This catches a
  structural selector that retargeted when you edited the tree.
- **Reduced motion.** Cancel every animation and assert the static state: overlay groups at
  `opacity: 0`, base nodes at `opacity: 1` with no transform. Then state what the fallback
  now looks like, since a background changes it.
- **Through `<img>`.** The final check — `<img>`-loaded SVG is a different rendering mode
  (no scripts, no external resources) and it is how GitHub serves the file.

```js
// seek every animation in the document to t milliseconds
await page.evaluate((t) => {
  document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; });
}, 4800);
```

> `getBBox()` returns an `SVGRect`, which does **not** survive structured cloning out of
> `page.evaluate()`. Read `x`/`y`/`width`/`height` into a plain object inside the callback
> or you will get `{}` back.
