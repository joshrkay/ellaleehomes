# Local QA — header, nav, logo

Run `npm install` once, then `npm run dev`. Open the URL printed by BrowserSync (default `http://localhost:3000`).

## Routes

1. **Home** — `index.html` (loader + dark hero)
2. **Portfolio** — `projects.html`
3. **Process** — `process.html`
4. **Project detail** — `project.html?slug=68th` (or another slug from the gallery)
5. **Content pages** — `why-us.html`, `investors.html`, `contact.html`, `sell.html`, `client-portal.html`, `stories.html`, `faq.html`
6. **Legal** — `privacy.html`, `terms.html`, `disclaimer.html`

## Checks

- **Logo** loads in the nav (relative `uploads/Monogram_Navy.png` after build)
- **Same nav labels** on every page: Why Us, Portfolio, Process, About, Investors, and the **Schedule a Consultation** CTA
- **`aria-current="page"`** on Portfolio when on projects or project detail; on Process when on process page; on Why Us / Investors / About on their pages
- **Logo link** goes to `index.html`
- **Schedule a Consultation** (nav CTA) goes to `contact.html`
- **Why Us** goes to `why-us.html`; **Investors** goes to `investors.html`; **About** goes to `our-story.html`
- **Resize** below 600px: horizontal links hide (same as before); logo scales down

## Editing workflow

- Change navigation markup once in `partials/nav.html`
- Adjust shared header styling in `assets/site-nav.css`
- Page-specific HTML/CSS lives under `src/`; built output is **`dist/`** only
