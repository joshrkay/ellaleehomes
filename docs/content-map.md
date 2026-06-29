# Ella Lee Homes — content and asset map

Canonical site structure (information architecture) after unification:

| Label | Target |
|--------|--------|
| Why Us | `why-us.html` |
| Portfolio | `projects.html` |
| Process | `process.html` |
| About | `our-story.html` |
| Investors | `investors.html` |
| Schedule a Consultation (nav CTA) | `contact.html` |

Footer also links: Sell a Home → `sell.html`, Client Portal → `client-portal.html`,
Stories → `stories.html`, FAQ → `faq.html`, and Privacy/Terms/Disclaimer.

---

## Source authority

| Source | Role |
|--------|------|
| WordPress media (`https://ellaleehomes.com/wp-content/uploads/...`) | Primary for photography, video, and logo CDN fallback |
| [`uploads/`](/uploads/) in repo | Local copy of logo (`Monogram_Navy.png`) for offline and stable relative URLs |

---

## Page inventory

| File | Role |
|------|------|
| [`src/index.html`](../src/index.html) | Home: loader, hero video, experience, meet team, featured homes, 10% giving strip, CTA |
| [`src/projects.html`](../src/projects.html) | Portfolio grid, filters |
| [`src/process.html`](../src/process.html) | Process phases |
| [`src/project.html`](../src/project.html) | Project detail shell; content driven by `?slug=` + embedded `PROJECTS` data |
| [`src/our-story.html`](../src/our-story.html) | About / origin story |
| [`src/why-us.html`](../src/why-us.html) | Trust & differentiation: 7 reasons, testimonials |
| [`src/investors.html`](../src/investors.html) | Developers & investors: pillars, stats, inventory |
| [`src/contact.html`](../src/contact.html) | Conversion endpoint: contact info + inquiry form (nav CTA target) |
| [`src/sell.html`](../src/sell.html) | Sell Your Home: comparison table, cash-offer form |
| [`src/client-portal.html`](../src/client-portal.html) | Buildertrend login utility page |
| [`src/stories.html`](../src/stories.html) | Journal/blog index with category filter |
| [`src/faq.html`](../src/faq.html) | FAQ accordion |
| [`src/privacy.html`](../src/privacy.html), [`terms.html`](../src/terms.html), [`disclaimer.html`](../src/disclaimer.html) | Legal placeholders (pending legal review) |

New content pages share `assets/site-pages.css` (and `assets/site-pages.js` for the FAQ accordion). All pages are registered in the `PAGES` array in `scripts/build-html.mjs`.

Build output: **`dist/`** (run `npm run build`). Preview: `npm run dev`. The former root-level `*.html` files were removed; **edit `src/` and `partials/`, not `dist/` directly**.

---

## Relative `uploads/` assets (must exist or use mapped WP URL)

| Path | Status | Notes |
|------|--------|--------|
| `uploads/Monogram_Navy.png` | OK | Synced from WP (`ELLA-LEE-HOMES-Updated-LOGO-1-01.png`); used by nav |
| `uploads/IMG_*.jpg` (legacy) | Replaced | Replaced in templates with equivalent `wp-content` JPEG URLs where local files were missing |

---

## WordPress media referenced in HTML/JS (representative)

Hero and marketing imagery use dates under `wp-content/uploads/2025/` (02, 03, 04, 06, 10, 11, 12). `project.html` embeds large gallery arrays for Mitchell Home and similar projects under `2025/02/` sequential JPEGs.

**Video:** `wp-content/uploads/2025/03/Elh-Website-Vid-5-11.m4v` (hero).

**Portfolio cards (`projects.html`):** Mixed dates; placeholders use `2025/01/placeholder.jpg`.

**Logo (live site header reference):** `wp-content/uploads/2025/04/ELLA-LEE-HOMES-Updated-LOGO-1-01.png` (full wordmark; exported into repo as `uploads/Monogram_Navy.png`).

---

## Section mapping (home → sections)

| Section | Anchor / region | Primary content |
|---------|-----------------|-----------------|
| Loader | `#loader` | Brand intro |
| Hero | `#hero`, `#hero-scroll-zone` | Video + scroll narrative |
| Why Us | `#experience` | Pillars / imagery row |
| Portfolio teaser | featured homes | Links to `project.html?slug=` |
| About / meet | `#meet` | Team imagery tabs |
| Inquire | `#cta` | Contact CTA |

---

## Maintenance

- Prefer **absolute WP URLs** for large rotating galleries to avoid bloating the repo; keep **logo** (and favicons if added) under `uploads/` when you need fully offline builds.
- After editing [`partials/nav.html`](../partials/nav.html), run `npm run build` so `dist/` updates.
