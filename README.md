# Ella Lee Homes — static site

Source templates live in **`src/`**. Shared navigation is **`partials/nav.html`** and the shared footer is **`partials/footer.html`**. The build merges the partials into each page and writes **`dist/`**. Every page takes both partials, the homepage included — its header is the one `partials/nav.html` was cut from.

## Commands

```bash
npm install
npm run build    # generate dist/
npm run dev      # rebuild on change + BrowserSync at http://localhost:3000
```

Preview production-like files from **`dist/`** only (paths assume `assets/` and `uploads/` siblings).

Every `.html` in `src/` must appear in the `PAGES` table in `scripts/build-html.mjs`; the build fails if one is missing, so a new page cannot silently stop shipping. Each entry sets where the nav's "Get Started" button points, which top-level nav entry is current, and the page's sitemap URL.

## Layout

| Path | Purpose |
|------|---------|
| `src/*.html` | Page templates (contain `<!-- NAV_PARTIAL -->` and `<!-- FOOTER_PARTIAL -->`) |
| `partials/nav.html` | Site-wide nav: header bar, Learn panel slot, mobile drawer (`__HREF_*__` / `__ARIA_*__` resolve per page at build) |
| `partials/nav-dropdown.html` | The "Learn" mega-panel, injected into the nav |
| `partials/footer.html` | Site-wide footer (`__HOME__` resolves per page at build) |
| `assets/elh-nav.js` | All nav behaviour: scroll states, `--elh-nav-h`, Learn panel, mobile drawer |
| `assets/site-nav.css` | Shared nav / header styles |
| `assets/site-footer.css` | Shared footer styles, plus the `.grain` page texture |
| `assets/home.js` | Homepage behaviour (intro, timeline, project strip, FAQ, form) |
| `assets/article.css` | Long-form article pages |
| `assets/elh-*.svg` | Monogram and wordmark marks |
| `uploads/home/` | Homepage photography |
| `docs/content-map.md` | Content / asset inventory |
| `docs/qa-checklist.md` | Header QA |

WordPress media URLs are used for photography where local files were missing; see the content map.
