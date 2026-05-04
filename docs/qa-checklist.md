# Local QA — header, nav, logo

Run `npm install` once, then `npm run dev`. Open the URL printed by BrowserSync (default `http://localhost:3000`).

## Routes

1. **Home** — `index.html` (loader + dark hero)
2. **Portfolio** — `projects.html`
3. **Process** — `process.html`
4. **Project detail** — `project.html?slug=68th` (or another slug from the gallery)

## Checks

- **Logo** loads in the nav (relative `uploads/Monogram_Navy.png` after build)
- **Same nav labels** on every page: Why Us, Portfolio, Process, About, Investors, Inquire
- **`aria-current="page"`** on Portfolio when on projects or project detail; on Process when on process page
- **Logo link** goes to `index.html`
- **Inquire** goes to `index.html#cta`
- **Why Us** goes to `index.html#experience`
- **Resize** below 600px: horizontal links hide (same as before); logo scales down

## Editing workflow

- Change navigation markup once in `partials/nav.html`
- Adjust shared header styling in `assets/site-nav.css`
- Page-specific HTML/CSS lives under `src/`; built output is **`dist/`** only
