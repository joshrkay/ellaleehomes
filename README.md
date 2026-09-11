# Ella Lee Homes — static site

Source templates live in **`src/`**. Shared navigation is **`partials/nav.html`** and the shared footer is **`partials/footer.html`**. The build merges the partials into each page and writes **`dist/`**. Pages can opt out of the nav and cursor partials via `PAGES` in `scripts/build-html.mjs` — the homepage does, since it ships its own header.

## Commands

```bash
npm install
npm run build    # generate dist/
npm run dev      # rebuild on change + BrowserSync at http://localhost:3000
```

Preview production-like files from **`dist/`** only (paths assume `assets/` and `uploads/` siblings).

## Layout

| Path | Purpose |
|------|---------|
| `src/*.html` | Page templates (contain `<!-- FOOTER_PARTIAL -->`, and `<!-- NAV_PARTIAL -->` / `<!-- CURSOR_PARTIAL -->` unless the page opts out) |
| `partials/nav.html` | Site-wide nav |
| `partials/footer.html` | Site-wide footer (`__HOME__` resolves per page at build) |
| `assets/site-nav.css` | Shared nav / header styles |
| `assets/site-footer.css` | Shared footer styles (image fill, display font, hovers) |
| `assets/home.js` | Homepage behaviour (nav, drawer, timeline, project strip, FAQ, form) |
| `assets/elh-*.svg` | Monogram and wordmark marks |
| `uploads/Monogram_Navy.png` | Logo used by nav |
| `uploads/home/` | Homepage photography |
| `docs/content-map.md` | Content / asset inventory |
| `docs/qa-checklist.md` | Header QA |

WordPress media URLs are used for photography where local files were missing; see the content map.
