# Ella Lee Homes — content and asset map

Canonical site structure (information architecture) after unification:

Top-level nav (`partials/nav.html`):

| Label | Target |
|--------|--------|
| Home | `index.html`, or `#top` on the homepage |
| Portfolio | `previous-projects.html` |
| Build | `build-your-home.html` |
| Our Story | `our-story.html` |
| Learn | mega-panel (`partials/nav-dropdown.html`), opened by `assets/elh-nav.js` |
| Get Started | `index.html#inquiry`, or `contact.html` on the help/legal/article pages |

The Learn panel carries Why Ella Lee, Developers & Investors, Stories & Insights,
Contact Us, Client Portal, FAQ, Warranty, Homeowner Resources and Sell Your Home.
Sell is not a top-level entry — it is the last item in Learn.

---

## Source authority

| Source | Role |
|--------|------|
| WordPress media (`https://ellaleehomes.com/wp-content/uploads/...`) | Primary for photography, video, and logo CDN fallback |
| [`uploads/`](/uploads/) in repo | The footer photo (`footer-bg.jpg`) and the homepage photography in `uploads/home/` |
| `assets/elh-*.svg` | Monogram and wordmark; the nav draws its mark from here, not from `uploads/` |

---

## Page inventory

| File | Role |
|------|------|
| [`src/index.html`](../src/index.html) | Home: key intro, hero video, story, experience timeline, project strip, testimonials, giving back, inquiry, FAQ |
| [`src/previous-projects.html`](../src/previous-projects.html) | Portfolio grid, style and sqft filters |
| [`src/project.html`](../src/project.html) | Project detail shell; content driven by `?slug=` + embedded `PROJECTS` data |
| [`src/build-your-home.html`](../src/build-your-home.html) | Build phases (scroll-scrubbed timeline) |
| [`src/sell-your-home.html`](../src/sell-your-home.html) | Selling a home through Ella Lee |
| [`src/our-story.html`](../src/our-story.html) | About / founders |
| [`src/our-story-print.html`](../src/our-story-print.html) | Print-oriented deck version of Our Story |
| [`src/why-us.html`](../src/why-us.html) | Differentiators |
| [`src/developers.html`](../src/developers.html) | Developer / investor offering |
| [`src/stories.html`](../src/stories.html) | Article index |
| [`src/contact.html`](../src/contact.html) | Contact form |
| [`src/client-portal.html`](../src/client-portal.html) | Client portal entry |
| [`src/faq.html`](../src/faq.html), [`warranty`](../src/warranty.html), [`homeowner-resources`](../src/homeowner-resources.html) | Help |
| [`src/privacy.html`](../src/privacy.html), [`terms`](../src/terms.html), [`disclaimer`](../src/disclaimer.html), [`code-of-conduct`](../src/code-of-conduct.html) | Legal |
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
| `uploads/home/*.jpg` | OK | Homepage and hero photography, including `story.jpg` (Our Story hero) |
| `uploads/footer-bg.jpg` | OK | Footer backdrop |
| `uploads/Monogram_Navy.png` | Unused | Superseded by `assets/elh-monogram.svg`; kept as a brand original |
| `uploads/IMG_*.jpg` (legacy) | Replaced | Replaced in templates with equivalent `wp-content` JPEG URLs where local files were missing |

---

## WordPress media referenced in HTML/JS (representative)

Hero and marketing imagery use dates under `wp-content/uploads/2025/` (02, 03, 04, 06, 10, 11, 12). `project.html` embeds large gallery arrays for Mitchell Home and similar projects under `2025/02/` sequential JPEGs.

**Video:** `wp-content/uploads/2025/03/Elh-Website-Vid-5-11.m4v` (hero).

**Portfolio cards (`previous-projects.html`):** Mixed dates; placeholders use `2025/01/placeholder.jpg`.

**Logo:** the nav and drawer use `assets/elh-monogram.svg`; the footer and hero lockups use `assets/elh-wordmark.svg`. No CDN round-trip.

---

## Section mapping (home → sections)

| Section | Anchor / region | Primary content |
|---------|-----------------|-----------------|
| Intro | `.elh-intro` | Brand intro; plays on first arrival only (see `elhSkipIntro` below) |
| Hero | `#hero`, `#hero-scroll-zone` | Video + scroll narrative |
| Why Us | `#experience` | Pillars / imagery row |
| Portfolio teaser | featured homes | Links to `project.html?slug=` |
| About / meet | `#meet` | Team imagery tabs |
| Inquire | `#inquiry` | Contact CTA — the nav's "Get Started" target |

The homepage intro is suppressed on internal trips home: any nav link resolving
to the homepage sets `sessionStorage.elhSkipIntro`, which `index.html` reads in a
pre-paint inline script. It still plays on first arrival and on hard reloads.

---

## Maintenance

- Prefer **absolute WP URLs** for large rotating galleries to avoid bloating the repo; keep **logo** (and favicons if added) under `uploads/` when you need fully offline builds.
- After editing [`partials/nav.html`](../partials/nav.html), run `npm run build` so `dist/` updates.
- Nav behaviour lives only in [`assets/elh-nav.js`](../assets/elh-nav.js). `assets/home.js` is homepage content behaviour and must not re-bind the drawer or the Learn panel.
