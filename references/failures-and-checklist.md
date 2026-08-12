# Failure gallery and pre-ship checklist

Seven real failures. All were invisible in the source; all were caught by rendering or
grepping rather than by reading.

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

You fixed the hero and shipped. The cover image at the bottom, the diagrams, and the
generated stat cards still have the same bug — and they are below the fold, so nobody
notices for months. Grep the whole file for ink colours and hardcoded `theme=` parameters
before calling it done. This is the most common way this work ends up half-finished.

## 6. The size shift

The two variants have different intrinsic dimensions, so the page reflows slightly when a
reader switches theme. Set both `width` and `height`.

## 7. Two files, one edited

Technique A's standing cost is drift. If you hand-maintain both variants, they diverge —
usually silently, and usually noticed only when someone spots that the dark logo is a
version behind. Derive one from the other with a committed script.

---

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
- [ ] Grepped the rest of the file for the same bug — ink colours, `theme=` parameters
