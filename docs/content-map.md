# Ella Lee Homes — content and asset map

Canonical site structure (information architecture) after unification:

Top-level nav (`partials/nav.html`):

| Label | Target |
|--------|--------|
| Portfolio | `projects.html` |
| Build | `process.html` |
| Sell | `sell.html` |
| Our Story | `our-story.html` |
| Learn | dropdown, built by `assets/site-nav-dd.js` |
| Schedule a Consultation | `index.html#inquiry`, or `contact.html` on the help/legal/article pages |

---

## Source authority

| Source | Role |
|--------|------|
| WordPress media (`https://ellaleehomes.com/wp-content/uploads/...`) | Primary for photography, video, and logo CDN fallback |
| [`uploads/`](/uploads/) in repo | Logo (`Monogram_Navy.png`), the footer photo (`footer-bg.jpg`) and the homepage photography in `uploads/home/` |

---

## Page inventory

| File | Role |
|------|------|
| [`src/index.html`](../src/index.html) | Home: keyhole intro, hero video, story, experience timeline, project strip, testimonials, giving back, inquiry, FAQ |
| [`src/projects.html`](../src/projects.html) | Portfolio grid, filters |
| [`src/project.html`](../src/project.html) | Project detail shell; content driven by `?slug=` + embedded `PROJECTS` data |
| [`src/process.html`](../src/process.html) | Process phases |
| [`src/sell.html`](../src/sell.html) | Selling a home through Ella Lee |
| [`src/our-story.html`](../src/our-story.html) | About / founders |
| [`src/our-story-print.html`](../src/our-story-print.html) | Print-oriented deck version of Our Story |
| [`src/why-us.html`](../src/why-us.html) | Differentiators |
| [`src/investors.html`](../src/investors.html) | Developer / investor offering |
| [`src/stories.html`](../src/stories.html) | Article index |
| [`src/contact.html`](../src/contact.html) | Contact form |
| [`src/client-portal.html`](../src/client-portal.html) | Client portal entry |
| [`src/faq.html`](../src/faq.html) | FAQ |
| [`src/privacy.html`](../src/privacy.html), [`terms`](../src/terms.html), [`disclaimer`](../src/disclaimer.html) | Legal |
| `src/steps-to-building-a-custom-home.html` | Article |
| `src/how-to-find-a-custom-home-builder.html` | Article |
| `src/is-custom-home-building-a-good-investment.html` | Article |
| `src/new-luxury-essentials-custom-homes-arizona.html` | Article |
| `src/exploring-the-costs-of-building-your-dream-home-a-comprehensive-guide.html` | Article |
| `src/why-choosing-a-professional-home-builder-matters-for-your-custom-house.html` | Article |

Every one of these must have an entry in `PAGES` in `scripts/build-html.mjs` or the
build fails.

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
