# Ella Lee Homes: static site

Source templates live in **`src/`**. Shared navigation is **`partials/nav.html`** and the shared footer is **`partials/footer.html`**. The build merges the partials into each page and writes **`dist/`**. Every page takes both partials, the homepage included: its header is the one `partials/nav.html` was cut from.

The plan to launch is **`docs/launch-plan.md`**. Open questions for Shay, Rebecca, Buildertrend and counsel are in **`docs/needs-confirmation.md`**. The client's rules for copy are in **`docs/fact-sheet.md`**.

## Commands

```bash
npm install
npm run build          # copy check, then dist/, then the launch report
npm run dev            # rebuild on change + BrowserSync at http://localhost:3000
npm run check:copy     # banned wording only (also the first step of build)
npm run launch:report  # everything that still blocks go-live, as a list
npm run check:launch   # the same, but exits 1 while any blocker remains
npm run check:assets   # media that still loads from the old WordPress site, Google Drive or Zillow
npm run check:projects # the portfolio data: errors and warnings
npm run projects:csv   # data/projects.csv, the sheet for Rebecca
npm run projects:import -- returned.csv   # her answers: a diff, saved only with --write
npm run qa:chrome      # browser checks on the menu, footer and section lines (Playwright with Chromium)
python3 scripts/qa.py --static   # punch-list checks read from dist/; without --static it also drives a browser (pip install playwright pillow)
node scripts/migrate-media.mjs   # move every old-site, Drive and Zillow image onto this site (docs/media.md)
```

Preview production-like files from **`dist/`** only (paths assume `assets/` and `uploads/` siblings).

Every `.html` in `src/` must appear in the `PAGES` table in `scripts/build-html.mjs`; the build fails if one is missing, so a new page cannot silently stop shipping. Each entry sets which top-level nav entry is current and the page's sitemap URL.

## The portfolio

The homes are written down once, in `data/projects.json`. The build fills the portfolio page's cards, tab counts and ItemList, the project page's `PROJECTS` data and the sitemap's project URLs from it, and `npm run check:projects` checks it (each error is a `[P]` launch blocker). Rebecca's records come in through `npm run projects:csv` and `npm run projects:import`. `data/README.md` has the fields, how to add a home, and the disagreements still to resolve.

## Guards

`npm run build` fails on banned wording (`scripts/check-copy.mjs`, rules from `docs/fact-sheet.md`). Add a rule in the same commit that removes the wording it bans, because Vercel runs the same build.

The build also prints a launch report (`scripts/check-launch.mjs`). It only reports until go-live. On the go-live deploy set `ELH_LAUNCH=1` as a Vercel environment variable (not `VERCEL_ENV`: staging is the Production environment) and the build refuses to ship while any blocker remains.

## Facts the site cannot invent

`site-facts.json` holds values that are not known yet (sq ft built, the Buildertrend login URL, the launch date). `null` means not supplied: the build leaves the slot out instead of shipping a placeholder, and `npm run check:launch` fails until it is set. In a page, `{{key}}` is filled when set and `<!-- fact:key -->...<!-- /fact:key -->` is kept only when set.

## Layout

| Path | Purpose |
|------|---------|
| `src/*.html` | Page templates (contain `<!-- NAV_PARTIAL -->` and `<!-- FOOTER_PARTIAL -->`) |
| `partials/nav.html` | Site-wide nav: header bar, Learn panel slot, mobile drawer (`__HREF_*__` / `__ARIA_*__` resolve per page at build) |
| `partials/nav-dropdown.html` | The "Learn" mega-panel, injected into the nav |
| `partials/footer.html` | Site-wide footer (`__HOME__` resolves per page at build) |
| `data/projects.json` | The portfolio: one record per home; see `data/README.md`. `data/projects.csv` is the same list as a sheet |
| `site-facts.json` | Facts not supplied yet; see above |
| `data/reviews.json` | The Google reviews: one source for Home, Why Us, Developers and Our Story, filled in and checked by `scripts/lib/reviews.mjs`. How to add one: `data/README.md` |
| `assets/elh-nav.js` | All nav behaviour: scroll states, `--elh-nav-h`, Learn panel, mobile drawer |
| `assets/site-nav.css` | Shared nav / header styles |
| `assets/site-footer.css` | Shared footer styles, plus the `.grain` page texture |
| `assets/home.js` | Homepage behaviour (intro, timeline, project strip, FAQ) |
| `assets/article.css` | Long-form article pages |
| `assets/elh-*.svg` | Monogram and wordmark marks |
| `scripts/check-copy.mjs` | Banned-wording guard (`scripts/lib/regions.mjs` reads only visible text) |
| `scripts/check-launch.mjs`, `scripts/check-assets.mjs` | Go-live gate and the off-site media scan |
| `scripts/validate-projects.mjs`, `scripts/lib/projects*.mjs` | Checks on the portfolio data; the generators, the CSV and the import behind it |
| `scripts/qa.py` | Full QA against the built site. Writes to `qa-out/` (gitignored), never to `docs/`. |
| `uploads/home/` | Homepage photography |
| `docs/` | Plan, fact sheet, open questions, punch list. Older versions are in `docs/archive/`. |

Photos and video must all live on this site at launch. Anything still loading from the old WordPress site, Google Drive or Zillow is reported by `npm run check:assets`.
