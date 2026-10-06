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
| Start your build | `contact.html` on every page (the Buildertrend form lives there) |

The Learn panel carries Why Ella Lee, Developers & Investors, Stories & Insights,
Contact Us, Client Portal, FAQ, Warranty, Homeowner Resources and Sell Your Home.
Sell is not a top-level entry — it is the last item in Learn.

---

## Source authority

| Source | Role |
|--------|------|
| [`uploads/`](/uploads/) in repo | Every image and video the site shows. Hand-placed photos in `uploads/home/` and `uploads/*.jpg`; migrated project and article photos in `uploads/w/` and `uploads/d/` (WebP, three sizes). See [`media.md`](media.md) |
| Old WordPress media, Google Drive, Zillow | **Not allowed at launch** (Fact Sheet section 6). Still referenced until `scripts/migrate-media.mjs` has run; `npm run check:assets` counts what is left |
| `assets/elh-*.svg` | Monogram and wordmark; the nav draws its mark from here, not from `uploads/` |

---

## Page inventory

| File | Role |
|------|------|
| [`src/index.html`](../src/index.html) | Home: key intro, hero video, story, experience timeline, project strip, testimonials, giving back, FAQ, "Start your build" |
| [`src/previous-projects.html`](../src/previous-projects.html) | Portfolio grid, style and sqft filters |
| [`src/project.html`](../src/project.html) | Project detail shell; content driven by `?slug=` + embedded `PROJECTS` data |
| [`src/build-your-home.html`](../src/build-your-home.html) | Build phases (scroll-scrubbed timeline) |
| [`src/sell-your-home.html`](../src/sell-your-home.html) | Selling a home through Ella Lee |
| [`src/our-story.html`](../src/our-story.html) | About / founder |
| [`docs/archive/our-story-print.html`](archive/our-story-print.html) | **Archived, not published.** Old print version of Our Story. It carried copy the Fact Sheet rules out (invented client quotes, "9 neighborhoods", "premier"), so it was taken out of the build. Re-sync it from `src/our-story.html` before using it again. |
| [`src/why-us.html`](../src/why-us.html) | Differentiators |
| [`src/developers.html`](../src/developers.html) | Developer / investor offering |
| [`src/stories.html`](../src/stories.html) | Article index |
| [`src/contact.html`](../src/contact.html) | Contact: the Buildertrend lead form on a linen panel. The only form on the site |
| [`src/client-portal.html`](../src/client-portal.html) | Client portal: a button to the Buildertrend login (appears once `buildertrendLoginUrl` is set in `site-facts.json`) |
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

## `uploads/` assets

| Path | Status | Notes |
|------|--------|--------|
| `uploads/home/*.jpg` | OK | Homepage and hero photography, including `story.jpg` (Our Story hero) and `shay.jpg` |
| `uploads/footer-bg.jpg` | OK | Footer backdrop |
| `uploads/w/<year>/<month>/` and `uploads/d/` | Created by `scripts/migrate-media.mjs --optimize` | Migrated WordPress and Drive photos, three WebP widths each. Empty until the tool has run with network access |
| `uploads/video/` | Waiting on Shay (punch item 41) | The new home hero video and its poster |
| `uploads/Monogram_Navy.png` | Unused | Superseded by `assets/elh-monogram.svg`; kept as a brand original |

---

## Media that still loads from outside the site

Run `npm run check:assets` for the current count. At the start of the launch work it was 1,572 references to 1,438 unique files: old WordPress (`ellaleehomes.com/wp-content/uploads/...`), Google Drive project galleries, and three Zillow photos. Most sit in the project data block of `project.html`. The plan to move them all on-site is in [`media.md`](media.md).

**Video:** the home hero still plays `wp-content/uploads/2025/03/Elh-Website-Vid-5-11.m4v` until Shay's new video arrives.

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
| Start your build | the closing band on each page | A button to `contact.html`; the Buildertrend form lives only on the Contact page |

The homepage intro is suppressed on internal trips home: any nav link resolving
to the homepage sets `sessionStorage.elhSkipIntro`, which `index.html` reads in a
pre-paint inline script. It still plays on first arrival and on hard reloads.

---

## Maintenance

- Store every image on the site (`uploads/`, optimised by `scripts/migrate-media.mjs`). Do not add new links to WordPress, Google Drive or Zillow; `npm run check:assets` fails the launch build on them.
- After editing [`partials/nav.html`](../partials/nav.html), run `npm run build` so `dist/` updates.
- Nav behaviour lives only in [`assets/elh-nav.js`](../assets/elh-nav.js). `assets/home.js` is homepage content behaviour and must not re-bind the drawer or the Learn panel.
