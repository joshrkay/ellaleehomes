# Ella Lee Homes — static site

Source templates live in **`src/`**. Shared navigation is **`partials/nav.html`** and the shared footer is **`partials/footer.html`**. The build merges the partials into each page and writes **`dist/`**. Pages can opt out of the nav and cursor partials via `PAGES` in `scripts/build-html.mjs` — the homepage does, since it ships its own header.

## Commands

```bash
npm install
npm run build    # generate dist/
npm run dev      # rebuild on change + BrowserSync at http://localhost:3000
```

Preview production-like files from **`dist/`** only (paths assume `assets/` and `uploads/` siblings).

Every `.html` in `src/` must appear in the `PAGES` table in `scripts/build-html.mjs`; the build fails if one is missing, so a new page cannot silently stop shipping. Each entry sets the nav's `theme-*` class, where its "Schedule a Consultation" button points, and which top-level nav entry is current.

## Layout

| Path | Purpose |
|------|---------|
| `src/*.html` | Page templates (contain `<!-- FOOTER_PARTIAL -->`, and `<!-- NAV_PARTIAL -->` / `<!-- CURSOR_PARTIAL -->` unless the page opts out) |
| `partials/nav.html` | Site-wide nav |
| `partials/footer.html` | Site-wide footer (`__HOME__` resolves per page at build) |
| `assets/site-nav.css` | Shared nav / header styles (incl. per-page `theme-*`) |
| `assets/site-nav-dd.js` | Nav "Learn" dropdown |
| `assets/site-nav-contrast.js` | Switches the nav to its on-light treatment |
| `assets/site-footer.css` | Shared footer styles, plus the `.grain` page texture |
| `assets/home.js` | Homepage behaviour (nav, drawer, timeline, project strip, FAQ, form) |
| `assets/article.css` | Long-form article pages |
| `assets/elh-*.svg` | Monogram and wordmark marks |
| `uploads/Monogram_Navy.png` | Logo used by nav |
| `uploads/home/` | Homepage photography |
| `docs/content-map.md` | Content / asset inventory |
| `docs/qa-checklist.md` | Header QA |

WordPress media URLs are used for photography where local files were missing; see the content map.
