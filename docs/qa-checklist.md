# QA: header, nav, drawer, footer, section lines

Run `npm install` once, then `npm run dev`. Open the URL printed by BrowserSync
(default `http://localhost:3000`). Everything below is served from `dist/`.

## Automated first

| Command | What it covers |
|---|---|
| `npm run build` | Copy rules (`check-copy`), the build, and the launch report |
| `python3 -I scripts/qa.py --static` | The punch-list items that can be read from the built pages. Writes `qa-out/` |
| `npm run qa:chrome` | The menu, footer and section lines in a real browser at 1024 to 1920 and 390px. Needs Playwright with Chromium (`PLAYWRIGHT_PATH` if it is not next to the repo). About 90 seconds |
| `npm run launch:report` | Everything still blocking launch, by ID |

The list below is the by-eye pass for what those cannot judge.

## Routes

1. **Home** — `index.html` (intro + hero video)
2. **Portfolio** — `previous-projects.html`
3. **Build** — `build-your-home.html`
4. **Our Story** — `our-story.html`
5. **Project detail** — `project.html?slug=68th` (or another slug from the gallery)
6. **A help page** — `faq.html`
7. **An article** — any page under Stories (the bar is the neutral dark one from the top)
8. **Contact** — `contact.html` (the Buildertrend form on a linen panel)

## Header

- **Monogram** loads (`assets/elh-monogram.svg`) and links home: `#top` on the
  homepage, `index.html` everywhere else
- **Same five entries** on every page: Home, Portfolio, Build, Our Story, Learn
- **The links sit in the middle of the page**, not just in the middle of the space between the logo and the button. At 1324px the group is centred to within 2px
- **`aria-current="page"`** on Home on the homepage; Portfolio on the portfolio
  and project detail; Build on the build page; Our Story on both Our Story pages
- **"Start your build"** goes to `contact.html` on every page
- **Scroll down** (about 8px): the bar slides away. **Scroll up** (about 6px): it
  returns as a neutral dark bar (grey, blurred), never blue. At the top it is
  transparent over a hero, and neutral dark on the light article pages
- **The only blue** is the solid navy bar while Learn or the phone menu is open
- Pressing **Tab** while the bar is hidden brings it back; the bar never hides
  while focus is inside it
- With reduced motion on there is no sliding, only an immediate hide and show

## Learn panel

- Opens flush under the bar with no seam; the bar goes solid navy while it is open
- Still flush after scrolling and after a window resize
- Contains Sell Your Home as its last item: Sell is not a top-level entry
- `Esc` closes it and puts focus back on Learn

## Mobile and tablet (up to 899px)

- Horizontal links and the "Start your build" pill hide; the burger appears at the right
- Drawer opens over a scrim, locks body scroll, traps focus, and `Esc` closes it
- Drawer lists Portfolio, Build, Our Story, then the Learn group
- "Start your build" at the drawer's foot is navy text on gold, not cream
- **Build page**: the phase timeline fills bar by bar as each card crosses
  mid-screen; upcoming phases sit dimmed behind a rule that turns gold on arrival
- **Portfolio**: the sqft tab row scrolls inside itself; the page never scrolls
  sideways. Check 900 to 1030px in particular.
- **Sticky parts** (FAQ headings, Why Us and Developers cards, the Build timeline)
  stay clear of the bar when it is showing and use the freed space when it hides

## Footer

- Gold line, then "40+ homes". The **sq ft built** figure sits next to it only once
  `sqftBuilt` is set in `site-facts.json`; until then no cell appears and nothing is a placeholder
- "Office:" before the address, never "Address:" or "Studio"
- No 50+, 200K+ or 5.0 badge

## Section lines

- On every page except Home, no horizontal line between sections. Only the hero line
  (under the page title) and the gold footer line remain. Lines inside a card, row,
  table or form are components, not section dividers

## Intro

- First arrival at `index.html` plays the intro
- Navigating away and back via the nav skips it (`sessionStorage.elhSkipIntro`)
- A hard reload plays it again

## Editing workflow

- Change navigation markup once in `partials/nav.html` (or
  `partials/nav-dropdown.html` for the Learn panel)
- Nav behaviour lives only in `assets/elh-nav.js`, which writes
  `data-elh-nav-state` (`top`, `shown`, `hidden`, `open`) on `<html>`. Anything that
  has to follow the bar (sticky parts) uses `var(--sticky-top)` from `assets/site-body.css`
- Shared header styling in `assets/site-nav.css`
- Page-specific HTML/CSS lives under `src/`; built output is **`dist/`** only
