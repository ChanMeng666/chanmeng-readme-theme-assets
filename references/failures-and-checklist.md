# Failure gallery and pre-ship checklist

Eight real failures. Seven were invisible in the source and caught by rendering. The
eighth — **#8, the palette grep that cried wolf** — went the other way: grepping *created*
a false alarm that only rendering could clear. Read that one first if you are auditing an
existing README, because it is the mistake this workflow actively encourages.

---

## 1. The heading that vanished

A bare `<img>` on the line immediately above a `### Heading`, with no blank line between,
makes CommonMark treat both as one type-7 HTML block — and the heading stops rendering.

Keep the blank line. This bites whenever you edit image markup that sits near a heading,
which is exactly what this work involves.

## 2. The stale image

You overwrote a published asset and camo is still serving the old bytes. Publish under a
**new filename** instead of fighting the cache.

## 3. The float that stopped floating

You moved `align="right"` from the `<img>` up to the `<picture>`, reasoning that the
wrapper is now the outer element. GitHub's sanitiser allows attributes **per tag**; do not
assume `align` is allowed on `<picture>`. Leave presentation attributes on the `<img>`,
which is verified to keep them.

## 4. The fallback nobody sees — until they do

The `<img>` branch renders in every plain-Markdown context: npm package pages, raw viewers,
editors, mirrors, and anything that does not implement `<picture>`. Put the **dark** variant
there and every one of those surfaces gets a dark slab on a light page.

## 5. The half-fixed README

You fixed the hero and shipped. A diagram further down, or a chart, or a transparent-PNG
screenshot, still has the same bug — and it is below the fold, so nobody notices for
months. Sweep the whole file before calling it done.

Sweep with #8 in hand, though: the sweep produces candidates, and confirming each one by
rendering is part of the job, not an optional extra.

## 6. The size shift

The two variants have different intrinsic dimensions, so the page reflows slightly when a
reader switches theme. Set both `width` and `height`.

## 7. Two files, one edited

Technique A's standing cost is drift. If you hand-maintain both variants, they diverge —
usually silently, and usually noticed only when someone spots that the dark logo is a
version behind. Derive one from the other with a committed script.

## 8. The palette grep that cried wolf

The most likely mistake **this skill will cause you to make**, so it is worth more words
than the rest.

Auditing a README, I grepped an animated cover for fills and got 9× `#070607` against 1×
`#E2E2DF`. Near-black dominating a palette, one stray light colour: textbook ink on
transparency. I reported it as broken, wrote it into two repos, and pushed.

It was fine. The file's **first paint operation** was
`<rect width="1280" height="640" fill="#E2E2DF"/>` — a full-bleed plate covering the whole
canvas. The ink sat on that plate and rendered correctly in both themes. I had counted
colour *declarations* and treated frequency as area, when the single declaration was the
background.

Two more false positives came from the same audit: a visitor-counter map pinned to
`theme=github_dark` (NASA satellite imagery — inherently dark, self-contained, reads as a
photograph on either canvas) and stat cards pinned to `theme=dark` (self-contained cards
carrying their own background; a dark card on a white page is a style choice, not a
legibility failure).

The distinction the grep cannot see:

> **Ink on transparency fails. Ink on its own plate does not.**

So:

- A palette grep, and a `theme=` grep, produce **candidates**. Never verdicts.
- Before concluding, check for a full-bleed background:
  `grep -oE '<rect[^>]*width="(100%|[0-9]{3,})"[^>]*fill="[^"]*"' asset.svg | head -3`
- Then **render on both canvases and look**. It costs one screenshot.
- Reporting a false positive is not a harmless over-report. It sends someone to "fix"
  working assets, and if you write it down it outlives the conversation.

## Checklist

Before shipping a theme-aware asset:

- [ ] Decided A / B / C / redesign deliberately — "do I control the markup, or only a URL?"
- [ ] Considered whether a mid-tone redesign removes the need for two assets entirely
- [ ] `<img>` is last in the `<picture>` and holds the **light** variant
- [ ] `alt` on the `<img>` only, describing content and not the theme
- [ ] `width` **and** `height` on the `<img>`; both variants checked for intrinsic-size drift
- [ ] Presentation attributes (`align`, …) left on the `<img>`, not moved to `<picture>`
- [ ] Ran the sanitiser check and confirmed nothing was stripped
- [ ] Confirmed `img.currentSrc` differs between emulated light and dark
- [ ] Screenshotted on `#ffffff` and `#0d1117` at the size readers will actually see
- [ ] If a float or a `<br clear="all">` is involved, re-checked the text wrap
- [ ] Blank line preserved between any bare `<img>` and a following `###` heading
- [ ] The derived variant is produced by a committed script, not hand-copied
- [ ] Swept the rest of the file for the same bug — ink colours, `theme=` parameters
- [ ] Every candidate the sweep produced was confirmed by RENDERING, not by its palette:
      an asset with a full-bleed background plate is fine and must not be reported (#8)
