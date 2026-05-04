# Ella Lee Homes — static site

Source templates live in **`src/`**. Shared navigation is **`partials/nav.html`**. The build merges nav into each page and writes **`dist/`**.

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
| `src/*.html` | Page templates (contain `<!-- NAV_PARTIAL -->`) |
| `partials/nav.html` | Site-wide nav |
| `assets/site-nav.css` | Shared nav / header styles |
| `uploads/Monogram_Navy.png` | Logo used by nav |
| `docs/content-map.md` | Content / asset inventory |
| `docs/qa-checklist.md` | Header QA |

WordPress media URLs are used for photography where local files were missing; see the content map.
