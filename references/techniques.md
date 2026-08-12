# The four techniques, in depth

Claims marked **[verified]** were measured with the methods in `verification.md`. Claims
marked **[inferred]** are reasoning that was not fully testable locally — re-check them if
you are going to depend on them.

---

## What GitHub actually does to your markup

GitHub sanitises HTML in Markdown aggressively, so know what survives before you rely on
it. Real input and real output from `POST /markdown`:

Input:

```html
<a href="https://example.com"><picture><source media="(prefers-color-scheme: dark)" srcset="/assets/dark.svg"><img src="/assets/light.svg" align="right" width="160" alt="Example"></picture></a>
```

Output:

```html
<p dir="auto"><a href="https://example.com" rel="nofollow"><themed-picture data-catalyst-inline="true"><picture><source media="(prefers-color-scheme: dark)" srcset="/assets/dark.svg"><img src="/assets/light.svg" align="right" width="160" alt="Example"></picture></themed-picture></a></p>
```

- `<picture>`, `<source>`, `media`, `srcset` all survive. **[verified]**
- Presentation attributes on the inner `<img>` survive — `align`, `width`, `alt`.
  **[verified]**
- `<picture>` nests inside `<a>` and the nesting survives. **[verified]**
- GitHub wraps the whole thing in **`<themed-picture data-catalyst-inline="true">`**, a
  Catalyst web component. It is `display: inline` and does not disturb layout.
  **[verified]**
- That wrapper's evident purpose is to bind the source swap to **GitHub's own theme
  setting** rather than leaving it to the raw media query. **[inferred]** — this is the
  mechanism that makes technique A correct for a light-OS/dark-GitHub reader and technique
  D wrong. Reproducing GitHub's client-side behaviour offline was not possible; if you
  need certainty, load the live page with the site theme and the OS theme deliberately set
  to disagree.

Images are proxied through **camo**, which caches aggressively. Overwriting a published
asset in place can serve stale bytes; publishing under a **new filename** sidesteps it.

---

## Technique A — `<picture>`

The default answer whenever you own the markup. Snippet and the five rules are in
`SKILL.md`. Three further notes:

### With a float

The case most likely to break and least likely to be tested. `align="right"` on an `<img>`
becomes `float: right`, and a README relies on that to wrap text around a hero logo.
Wrapping the `<img>` in `<picture>` puts two inline ancestors (`<themed-picture>`,
`<picture>`) between the float and its containing block.

**It still works** — the float escapes the inline ancestors and the text wrap is unchanged.
**[verified]** by rendering GitHub's real output under both emulated schemes. Verify it
again whenever you add `<picture>` to a floated image, and remember any matching
`<br clear="all">` further down still applies.

### Paths

Root-relative paths (`/public/brands/foo.svg`) work on github.com but are **not portable**
— anything mirroring the README off github.com will fail to resolve them. Repo-relative
paths (`assets/anime/foo.svg`) are more portable. Pick one convention per repo.

### Intrinsic size

If the two variants have different intrinsic dimensions and you set only `width`, the page
reflows slightly when the theme changes. Set both `width` and `height`, or keep the
variants proportional.

---

## Technique B — bake the background into the asset

When the consumer gets only a URL, the asset must carry its own background. This is a real
derivation with real pitfalls.

### Derive, never fork

Hand-maintaining two copies guarantees drift. Write a script that produces the variant from
the source, commit both, and say so in the generated file's header — then technique A's
"keep in sync" cost becomes "re-run the script".

### Five things that go wrong

1. **Measure the artwork; do not assume it has a margin.** Use `getBBox()` in a real
   browser. A real case: a mark's head spanned x 0.2–275.8, y 0.4–262.8 inside a 276×263
   viewBox — edge to edge, so a flush background rect would have put ink hard against all
   four sides.
2. **Pad by widening the root `viewBox`, not by wrapping the artwork in a `<g>`.** A
   wrapper changes the element tree, and any CSS in the file using structural selectors
   (`svg > path:nth-of-type(2)` is a real example) silently retargets. A widened viewBox
   leaves every coordinate exactly as authored.
3. **Clip to the background shape.** Anything authored to overflow the art box and be cut
   off by the viewBox edge — falling particles, bleeding rules — becomes visible in the new
   padding and floats loose outside your card. Put `clip-path` on the **root element**, for
   the same tree-shape reason as (2).
4. **Watch line endings.** If the source is CRLF and your script writes LF, the diff
   between source and variant is 100% noise. Detect and restore the source's endings.
5. **Re-check accessibility state.** A background rect is static and unconditionally
   visible, which may interact with a `prefers-reduced-motion` contract the file has. State
   explicitly what the reduced-motion fallback now looks like.

### Naming

Follow the repo's existing variant grid rather than inventing a token. If static assets are
named `<ink>-on-white` / `-transparent`, the derived animated variant is
`<behavior>-on-white`, not `<behavior>-tile` or `<behavior>-card`.

---

## Technique C — parameterised generators

Many README images come from a service that already takes a `theme` parameter. The mistake
is hardcoding one theme and shipping it to both canvases.

Combine C with A — two URLs to the same generator:

```html
<picture>
  <source media="(prefers-color-scheme: dark)"
          srcset="https://example.vercel.app/api?user=me&theme=github_dark">
  <img src="https://example.vercel.app/api?user=me&theme=github_light" alt="…">
</picture>
```

Two cautions:

- **Confirm the light theme exists** before writing the URL. A generator that returns 200
  with a silent fallback on an unknown theme name will hide your typo — this is real
  observed behaviour, not a hypothetical.
- If you own the generator, ship theme **pairs** rather than single themes. Modelling a
  theme as `{ name, dark, light }` is the right shape.

---

## Technique D — self-adapting SVG, and why not to use it here

The tempting idea: put the media query inside the SVG and ship one file.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <style>
    rect { fill: #00aa00; }
    @media (prefers-color-scheme: dark) { rect { fill: #ff0000; } }
  </style>
  <rect width="80" height="80"/>
</svg>
```

**This does work in an `<img>`-loaded SVG in Chromium.** **[verified]** — sampling the
rendered pixel gives `rgb(0,170,0)` under an emulated light scheme and `rgb(255,0,0)` under
dark. You will find claims that it cannot work; for Chromium that claim is false. Re-test
any engine you care about with `scripts/probe-color-scheme.mjs`.

Use it on GitHub anyway? **No**, for two independent reasons:

1. **It follows the OS preference, not GitHub's theme setting.** A reader with a light OS
   and GitHub set to dark gets the light branch on a dark page — the original bug, now
   affecting only some readers and correspondingly harder to spot. Technique A avoids this
   because of the `<themed-picture>` binding. **[inferred]**
2. **Engine support is not uniform.** Confirmed in Chromium only.

It remains legitimate where you control the rendering context and know the engine — an
Electron app, a docs site you build, a design-system preview page. It is not a README
technique.

> Legacy note: GitHub previously supported `#gh-dark-mode-only` / `#gh-light-mode-only`
> URL-fragment suffixes. `<picture>` superseded them. Not tested here; do not write new
> code against the fragment approach.
