---
name: readme-theme-assets
description: Use when a README, docs page, or profile page needs images that work in BOTH GitHub light and dark themes — a logo/wordmark that vanishes on dark, a diagram or chart with near-black labels on transparency, an app screenshot with a baked-in theme, a generated stat card / badge / visitor map pinned to one theme, or any animated SVG banner. Picks between the four real techniques (a `<picture>` source swap, baking a background into the asset, parameterising a generator URL, or a redesign that needs no swap), derives the second variant with a committed script instead of a hand-copy, and proves the result with GitHub's own Markdown renderer plus a two-theme browser check. Also use to audit an existing README for assets that silently fail in one theme.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Theme-aware visual assets for GitHub

## The problem

A README renders on a canvas whose colour you do not control: GitHub light is `#ffffff`,
GitHub dark is `#0d1117`. An asset that assumes one is broken for roughly half of readers.

The worst case — and the easiest to miss — is **single-colour artwork on transparency**,
because it fails silently and completely rather than looking slightly off. A logo drawn in
`#070607` on a transparent background is perfect on white and is a black shape on a
near-black page in dark mode.

**You are the wrong person to eyeball this.** You author in one theme and rarely look at
the other. Use the checks in `references/verification.md` instead of trusting your eyes.

## The one fact that drives every decision

**GitHub's theme is a site setting, not the operating system's.** A reader can run a light
OS with GitHub set to dark, or set GitHub to "auto". Any technique keyed off the OS
preference alone will disagree with the page it sits on for those readers.

This is why the media query *inside* an SVG is the wrong tool here even though it works
(see Technique D) — and why `<picture>` is the right one.

## Choose the technique

The choice collapses to one question: **do you control the surrounding markup, or only a
URL?**

| | Technique | Use when | Cost |
|---|---|---|---|
| **A** | `<picture>` + `prefers-color-scheme` source | You control the markup — a README, issue, docs page | Two assets to keep in sync |
| **B** | Bake a background into the asset | You can hand over only **one URL** — a profile field, chat embed, badge slot, someone else's README | A visible card in both themes |
| **C** | Parameterised generator (`?theme=…`) | A service produces the image | Needs the generator to have both themes |
| **D** | Media query inside the SVG | Not on GitHub | Silently wrong for a whole class of readers |

Techniques compose. C is not an alternative to A — the usual best answer for a generated
image is **A wrapping two C URLs**.

**Before any of them, ask whether the asset needs a swap at all.** Mid-tone colours survive
both canvases; pure white and pure near-black do not. A mark that can carry a mid-tone
accent instead of pure ink is one asset instead of two, with nothing to keep in sync.
Prefer that whenever the design allows it.

Full detail, including the derivation pitfalls for B: `references/techniques.md`.

## The canonical snippet

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="path/to/dark-variant.svg">
  <img src="path/to/light-variant.svg" width="160" height="153" alt="Meaningful description">
</picture>
```

Five rules, all load-bearing:

1. **`<img>` is last and is the fallback.** Every renderer that does not understand
   `<picture>` — npm package pages, raw viewers, editors, mirrors — shows it. Put the
   **light** variant there; most non-GitHub surfaces are light.
2. **`alt` on the `<img>` only.** One description of the content, which is the same in both
   variants. Never "dark version of…".
3. **Sizing and presentation attributes on the `<img>`, not the `<picture>`.** GitHub is
   verified to keep `width` / `height` / `align` on the inner `<img>`. Do not assume it
   keeps anything on `<picture>`.
4. **One `<source>` is enough.** Light is the default; you only branch for dark.
5. **Keep it on one line** inside a Markdown paragraph. Line breaks in inline HTML can
   introduce stray text nodes and trip CommonMark's HTML-block rules.

## Workflow

1. **Audit — find candidates.** Grep rather than scroll:
   - near-black / near-white fills in local SVGs: `grep -oE '#[0-9a-fA-F]{6}' asset.svg | sort | uniq -c | sort -rn`
   - hardcoded generator themes: `grep -oE 'https://[^"]*theme=[^"&]*' README.md | sort -u`
   - transparent PNGs with dark subjects, screenshots, diagrams, charts

   **A grep produces candidates, never verdicts.** The decisive question is not which
   colours appear but whether the asset has its **own background**:

   ```bash
   # a full-bleed plate? then the ink sits on it and the asset is almost certainly fine
   grep -oE '<rect[^>]*width="(100%|[0-9]{3,})"[^>]*fill="[^"]*"' asset.svg | head -3
   ```

   **Ink on transparency fails; ink on its own plate does not.** See failure #8 — this
   exact step produced three false positives in the session this skill came from.
2. **Render before reporting.** Put the candidates on `#ffffff` and `#0d1117` and look.
   Self-contained cards, photographs, and anything with a plate will survive both. Only
   then do you have a finding.
3. **Choose** A / B / C / redesign per the table above.
4. **Derive, never fork.** If a second variant is needed, write a script that produces it
   from the source and commit both. Two hand-maintained copies always drift.
5. **Verify** with `scripts/check-sanitizer.mjs` then `scripts/check-theme-swap.mjs`, then
   screenshot on both canvases. See `references/verification.md`.
6. **Sweep.** Fixing one asset and shipping is the most common half-done outcome — re-run
   the audit over the whole file before calling it finished, applying step 2 to each
   candidate so the sweep does not generate noise.

## Scripts

All are Node, dependency-light, and take paths as arguments — no repo-specific constants.

| Script | What it answers |
|---|---|
| `scripts/check-sanitizer.mjs` | Does GitHub's Markdown pipeline keep my `<picture>` / `<source>` / `srcset` / `align`? (uses `gh api`) |
| `scripts/check-theme-swap.mjs` | Does a different file actually load in light vs dark? (Playwright, reads `img.currentSrc`) |
| `scripts/probe-color-scheme.mjs` | Does this browser propagate `prefers-color-scheme` into an `<img>`-loaded SVG? (re-run to re-test an engine) |

## Where this applies

Anything whose legibility depends on the page background:

- **Logos and wordmarks** — the canonical case and the worst failure.
- **App screenshots** — the highest-value, most-missed use: if you already ship a light and
  a dark build, show readers the UI in the theme they are already in.
- **Architecture / flow diagrams** exported with transparent backgrounds and dark labels.
  Consider a native ```mermaid fence instead — GitHub renders and themes those itself.
- **Charts and plots** — axis labels and gridlines are usually near-black on transparent.
- **Generated stat cards, badges, visitor maps** — technique C + A.
- **Terminal recordings** (asciinema SVG) and **code screenshots** (Carbon) — both bake in
  a theme.
- **Animated SVG banners and covers.**
- **Signatures, QR codes, scans** — these need a light plate; technique B.
- **Photos with transparent cut-outs** — a dark-edged subject disappears on dark.

## Reference files

- `references/techniques.md` — the four techniques in depth; what GitHub's pipeline does to
  your markup; the five pitfalls of deriving a background variant of an SVG.
- `references/verification.md` — the three checks, runnable, plus the environment gotchas
  that waste the most time.
- `references/failures-and-checklist.md` — seven real failure modes and the pre-ship
  checklist.
