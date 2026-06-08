# Ella Lee Homes — static site

Source templates live in **`src/`**. Shared navigation is **`partials/nav.html`**. The build merges nav into each page and writes **`dist/`**.

## Commands

```bash
npm install
npm run build    # generate dist/
npm run dev      # rebuild on change + BrowserSync at http://localhost:3000
```

Preview production-like files from **`dist/`** only (paths assume `assets/` and `uploads/` siblings).

## Alternate edition — `v2/`

A second, self-contained edition inspired by [Horizonte Village](https://horizonte-village.com/),
[Nueve](https://nueve.gr/) and [Merise](https://www.merise.ae/): a warm cream + deep-slate palette,
large imagery and a **"choose your journey" gateway** where visitors pick the **Homeowners** or
**Investors** path before entering a tailored landing experience.

| File | Purpose |
|------|---------|
| `v2/index.html` | Gateway — homeowners vs investors split (hover-expand) |
| `v2/homeowners.html` | Residences experience (build your forever home) |
| `v2/investors.html` | Investment experience (build lasting returns) |
| `v2/v2.css` / `v2/v2.js` | Shared styles + interactions for the edition |

It does **not** use the nav/footer/cursor partial pipeline — open `v2/index.html` directly, or run
`npm run build` (the folder is copied verbatim to `dist/v2/`).

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
