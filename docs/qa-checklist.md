# Local QA — header, nav, drawer

Run `npm install` once, then `npm run dev`. Open the URL printed by BrowserSync
(default `http://localhost:3000`). Everything below is served from `dist/`.

## Routes

1. **Home** — `index.html` (intro + hero video)
2. **Portfolio** — `previous-projects.html`
3. **Build** — `build-your-home.html`
4. **Our Story** — `our-story.html`
5. **Project detail** — `project.html?slug=68th` (or another slug from the gallery)
6. **A help page** — `faq.html` (checks the `contact.html` CTA target)

## Header

- **Monogram** loads (`assets/elh-monogram.svg`) and links home — `#top` on the
  homepage, `index.html` everywhere else
- **Same five entries** on every page: Home, Portfolio, Build, Our Story, Learn
- **`aria-current="page"`** on Home on the homepage; Portfolio on the portfolio
  and project detail; Build on the build page; Our Story on both Our Story pages
- **"Get Started"** goes to `index.html#inquiry`, or `contact.html` on the
  help, legal and article pages
- **Scroll down** past the hero: the bar goes solid navy and hides; scroll up and
  it returns. Over the first screen it is transparent.

## Learn panel

- Opens flush under the bar with no seam — the bar turns solid, drops its blur
  and its bottom border while the panel is open
- Still flush after scrolling (the bar compacts; `--elh-nav-h` tracks it)
- Contains Sell Your Home as its last item — Sell is not a top-level entry
- `Esc` closes it

## Mobile (≤767px)

- Horizontal links and the "Get Started" pill hide; the burger appears
- Drawer opens over a scrim, locks body scroll, and `Esc` closes it
- Drawer lists **Home**, Portfolio, Build, Our Story, then the Learn group
- "Start Your Build" at the drawer's foot is navy text on gold, not cream
- **Build page** — the phase timeline fills bar by bar as each card crosses
  mid-screen; upcoming phases sit dimmed behind a rule that turns gold on arrival
- **Portfolio** — the sqft tab row scrolls inside itself; the page never scrolls
  sideways. Check the 900–1030px range in particular.

## Intro

- First arrival at `index.html` plays the intro
- Navigating away and back via the nav skips it (`sessionStorage.elhSkipIntro`)
- A hard reload plays it again

## Editing workflow

- Change navigation markup once in `partials/nav.html` (or
  `partials/nav-dropdown.html` for the Learn panel)
- Nav behaviour lives only in `assets/elh-nav.js`
- Shared header styling in `assets/site-nav.css`
- Page-specific HTML/CSS lives under `src/`; built output is **`dist/`** only
