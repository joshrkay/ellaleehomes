# Ella Lee Homes — content and asset map

Canonical site structure (information architecture) after unification:

| Label | Target |
|--------|--------|
| Why Us | `index.html#experience` |
| Portfolio | `projects.html` |
| Process | `process.html` |
| About | `index.html#meet` |
| Investors | `#` (placeholder until a page exists) |
| Inquire | `index.html#cta` |

---

## Source authority

| Source | Role |
|--------|------|
| WordPress media (`https://ellaleehomes.com/wp-content/uploads/...`) | Primary for photography, video, and logo CDN fallback |
| [`uploads/`](/uploads/) in repo | Local copy of logo (`Monogram_Navy.png`) for offline and stable relative URLs |

---

## Page inventory

| File | Role |
|------|------|
| [`src/index.html`](../src/index.html) | Home: loader, hero video, experience, meet team, featured homes, CTA |
| [`src/projects.html`](../src/projects.html) | Portfolio grid, filters |
| [`src/process.html`](../src/process.html) | Process phases |
| [`src/project.html`](../src/project.html) | Project detail shell; content driven by `?slug=` + embedded `PROJECTS` data |

Build output: **`dist/`** (run `npm run build`). Preview: `npm run dev`. The former root-level `*.html` files were removed; **edit `src/` and `partials/`, not `dist/` directly**.

---

## Relative `uploads/` assets (must exist or use mapped WP URL)

| Path | Status | Notes |
|------|--------|--------|
| `uploads/Monogram_Navy.png` | OK | Synced from WP (`ELLA-LEE-HOMES-Updated-LOGO-1-01.png`); used by nav |
| `uploads/IMG_*.jpg` (legacy) | Replaced | Replaced in templates with equivalent `wp-content` JPEG URLs where local files were missing |

---

## WordPress media referenced in HTML/JS (representative)

Hero and marketing imagery use dates under `wp-content/uploads/2025/` (02, 03, 04, 06, 10, 11, 12). `project.html` embeds large gallery arrays for Mitchell Home and similar projects under `2025/02/` sequential JPEGs.

**Video:** `wp-content/uploads/2025/03/Elh-Website-Vid-5-11.m4v` (hero).

**Portfolio cards (`projects.html`):** Mixed dates; placeholders use `2025/01/placeholder.jpg`.

**Logo (live site header reference):** `wp-content/uploads/2025/04/ELLA-LEE-HOMES-Updated-LOGO-1-01.png` (full wordmark; exported into repo as `uploads/Monogram_Navy.png`).

---

## Section mapping (home → sections)

| Section | Anchor / region | Primary content |
|---------|-----------------|-----------------|
| Loader | `#loader` | Brand intro |
| Hero | `#hero`, `#hero-scroll-zone` | Video + scroll narrative |
| Why Us | `#experience` | Pillars / imagery row |
| Portfolio teaser | featured homes | Links to `project.html?slug=` |
| About / meet | `#meet` | Team imagery tabs |
| Inquire | `#cta` | Contact CTA |

---

## Maintenance

- Prefer **absolute WP URLs** for large rotating galleries to avoid bloating the repo; keep **logo** (and favicons if added) under `uploads/` when you need fully offline builds.
- After editing [`partials/nav.html`](../partials/nav.html), run `npm run build` so `dist/` updates.
