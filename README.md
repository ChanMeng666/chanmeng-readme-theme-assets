<div align="center">

# chanmeng-readme-theme-assets

**Make README images work in GitHub's light *and* dark themes — and prove it.**

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill for the moment you
realise your logo is a black shape on a near-black page for half your readers.

![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-d97757)
![Node.js](https://img.shields.io/badge/Node.js-scripts-339933)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

</div>

---

## The problem

A README renders on a canvas you do not control — `#ffffff` in GitHub light, `#0d1117` in
dark. Single-colour artwork on transparency fails **silently and completely**: a mark drawn
in `#070607` is perfect on white and invisible on dark. Nobody notices, because authors
look at one theme.

## What this skill does

Picks the right fix out of four (not one), derives the second asset with a committed script
instead of a hand-copy, and verifies the result against GitHub's own renderer rather than
your eyes.

| | Technique | Use when |
|---|---|---|
| **A** | `<picture>` + `prefers-color-scheme` source | You control the markup |
| **B** | Bake a background into the asset | You can hand over only one URL |
| **C** | Parameterised generator (`?theme=…`) | A service produces the image |
| **D** | Media query inside the SVG | Not on GitHub — see below |

The choice collapses to one question: **do you control the markup, or only a URL?**

## The fact everyone gets wrong

**GitHub's theme is a site setting, not the operating system's.** A reader can run a light
OS with GitHub set to dark.

This matters because of a claim you will find repeated widely — that a media query *inside*
an `<img>`-loaded SVG does nothing. **That is false**, at least in Chromium; this repo ships
the probe that measures it (`scripts/probe-color-scheme.mjs`, green under a light scheme,
red under dark). The technique still should not be used on GitHub — but for the real reason:
it follows the **OS** preference, so a light-OS/dark-GitHub reader gets the wrong branch.
`<picture>` is right because GitHub binds it to the site setting.

## Scripts

Dependency-light Node, no repo-specific constants, paths as arguments.

```bash
# Does GitHub's Markdown pipeline keep my <picture>/<source>/srcset/align? (needs `gh`)
node scripts/check-sanitizer.mjs snippet.html

# Does a different file actually load in light vs dark? (needs Playwright)
node scripts/check-theme-swap.mjs page.html --shots out/

# Does this browser propagate prefers-color-scheme into an <img>-loaded SVG?
node scripts/probe-color-scheme.mjs
```

`check-theme-swap.mjs` reads `img.currentSrc` under both emulated schemes and fails if a
`<picture>` resolved to the same file twice — the silent no-op this whole class of bug hides
behind. It also flags intrinsic-size drift between variants, which reflows the page when a
reader switches theme.

If Playwright is installed globally rather than in the project:

```bash
PLAYWRIGHT_IMPORT=file:///abs/path/to/playwright/index.mjs node scripts/check-theme-swap.mjs page.html
```

## Layout

```
SKILL.md                                  # the skill: decision table, snippet, workflow
references/
  techniques.md                           # the four techniques; what GitHub does to your markup
  verification.md                         # the three checks + environment gotchas
  failures-and-checklist.md               # seven real failure modes + pre-ship checklist
scripts/
  check-sanitizer.mjs                     # GitHub Markdown API probe
  check-theme-swap.mjs                    # currentSrc under both schemes
  probe-color-scheme.mjs                  # in-SVG media query probe
  _playwright.mjs                         # shared resolver (local → global → clear error)
```

## Install

### As a Claude Code plugin (recommended)

```text
/plugin install chanmeng-readme-theme-assets --marketplace ChanMeng666/chanmeng-readme-theme-assets
```

On Claude Code older than 2.1.275, add the marketplace first:

```text
/plugin marketplace add ChanMeng666/chanmeng-readme-theme-assets
/plugin install chanmeng-readme-theme-assets@chanmeng-readme-theme-assets
```

### Manual install

```bash
git clone https://github.com/ChanMeng666/chanmeng-readme-theme-assets.git
ln -s "$PWD/chanmeng-readme-theme-assets" ~/.claude/skills/chanmeng-readme-theme-assets
```

## Provenance

Written from shipping this on a real profile README and a real logo repo, not from
documentation. Every factual claim in `references/` is tagged **[verified]** (measured with
the scripts here) or **[inferred]** (reasoning that was not fully testable offline), so a
reader can tell which is which.

Two of the claims that shipped here started out wrong, which is why the tagging exists and
why failure #8 is in the gallery: one was inherited from another repo's docs, repeated, and
then disproved by measurement; the other was a false alarm this skill's own audit step
produced, cleared only by rendering the file. Both corrections are in the history rather
than quietly edited away.

## License

MIT © Chan Meng
