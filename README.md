# Ground Floor

Educational website for running open-source LLMs locally in regulated industries.
Built with Astro + Tailwind CSS. Runs locally on Mac during development.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Commands

| Command          | Action                               |
|:-----------------|:-------------------------------------|
| `npm run dev`    | Start dev server at localhost:4321   |
| `npm run build`  | Build production site to `./dist/`   |
| `npm run preview`| Preview production build locally     |

## Adding content

### New experiment

Create `src/content/experiments/NN-slug.md` with frontmatter:

```yaml
---
title: "Your experiment title"
date: 2026-05-11
week: 2
industry: "medical"         # medical | legal | financial | hr | ...
hardware: "m4-mini"
task: "document-drafting"
model: "Llama-3.1-8B-Instruct-Q4_K_M"
verdict: "viable"           # viable | partial | not-yet
hypothesis: "One sentence stating what you expected to find."
youtube: "https://youtube.com/watch?v=..."   # optional
linkedin: "https://linkedin.com/posts/..."   # optional
description: "One sentence for card and SEO."
---

Your writeup here.
```

### New industry

Create `src/content/industries/slug.md`:

```yaml
---
name: "Full Industry Name"
shortName: "Short Name"
regulation: ["Regulation 1", "Regulation 2"]
whyLocal: "One paragraph explaining why local LLMs matter for this industry."
commonUseCases:
  - "Use case one"
  - "Use case two"
maturityNote: "Optional caveats about AI maturity in this vertical."
---

Markdown body with more detail.
```

### New hardware

Create `src/content/hardware/slug.md`:

```yaml
---
name: "Machine Name"
priceUsd: 599
ramGb: 16
chip: "Apple M4"
tier: "entry"               # entry | mid | high | workstation
suitableModels:
  - "Llama 3.1 8B (Q4_K_M)"
suitableFor:
  - "Single-user document drafting"
notSuitableFor:
  - "Multi-user concurrent access"
---

Markdown body.
```

## Deploy to Cloudflare Pages

1. Push to GitHub
2. In Cloudflare Pages: Connect repository → Framework preset: **Astro**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Node version: 18 or higher

No adapter needed — static output works natively with Cloudflare Pages.

## Update the site URL

Edit `astro.config.mjs` and set `site` to your actual Cloudflare Pages URL (or custom domain):

```js
site: 'https://yourdomain.com',
```

## Design system

- **Palette:** Option A warm minimal (#FAF8F4 bg, #1A1A1A text, #B5472A rust accent)
- **Display font:** Fraunces (Google Fonts)
- **Body font:** Inter (Google Fonts)
- **Mono font:** JetBrains Mono (Google Fonts)
- **Max prose width:** 68ch
- **Max layout width:** 1200px
