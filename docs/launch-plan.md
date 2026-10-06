# Ella Lee Homes: Launch Plan

Prepared October 6, 2026 for Josh (site builder).

Inputs: Website Fact Sheet (Oct 2), Legal Pages Draft (Oct 2), Merged Punch List (re-checked Oct 2), and a read-only audit of the repo at `f56504b`, the commit staging serves. File and line references are to that commit and will drift as work lands.

## 1. Summary

The build is green and `check-copy` passes. Of the 35 open punch-list items, checked against the code:

| Group | Count | Items |
|---|---|---|
| Unblocked build work | 15 | N1, N4, N5, N7 (removal), N9, N10, N11, N13, N14, N15, A4, 53, 57, 58, 62 (tooling) |
| Waiting on someone else | 10 | N3, N6, N8, N12, 11, 13, 33, 41, 45, 50 |
| Done, superseded, or not ours | 10 | N2 and N16 (Buildertrend settings), A1 and A2 (superseded), 9, 17, 27, 43, 44, 61 |

**Where the work stands (October 6, first execution pass)**

Everything that needs nothing from anyone else is built, merged to the working branch and checked: `npm run build` (green), `python3 scripts/qa.py --static` (88 pass, 0 fail, 11 blocked on inputs, 6 for a person to judge) and `npm run qa:chrome` (100 pass in Chromium). The live per-item list is `docs/punch-list.md`; every open question is in `docs/needs-confirmation.md`.

| WP | State | What is left, and who holds it |
|---|---|---|
| WP0 Foundation | Done | Guards, launch gate, `site-facts.json`, docs, hygiene |
| WP1 Leads | Done in code | Buildertrend fields and a test lead (B1 to B4); the login URL (S2, B3); attorney review (L1) |
| WP2 Chrome | Done | Sq ft figure (S1); S9 and S10 answers; Safari and a phone |
| WP3 Copy and SEO | Done | S11 to S13 answers; title pattern |
| WP4 Page fixes | Done | S16; look at the strip, hero gradient and Developers on staging |
| WP5 Portfolio data | Phase A done (one data file, validator, Rebecca's sheet and importer) | Phase B: her records (R1 to R5). Phase C: per-project pages and redirects (J4) |
| WP6 Build timeline | Waiting | Shay's wording (S4) |
| WP7 Media | Tooling done and tested in simulation | Run it where the old site and Drive are reachable; Zillow originals (R5); the hero video (S6) |
| WP8 Shay's content | Reviews source done | Reviews, Our Story copy, "See the craft" line (S5 to S8) |
| WP9 Launch gate | Gate and checklist done | Cutover: `docs/launch-checklist.md` |

**Critical path to launch**

1. Buildertrend form live on Contact and one test lead received (N15). Top blocker.
2. Every image and video on the new site (62). The real job is 1,436 unique files, more than ten times what the punch list counts, and it has to finish before DNS moves.
3. Rebecca's house records (N8, 11, 13).
4. Shay's content: hero video, Our Story copy, reviews, sq ft figure, build-timeline wording.
5. Attorney review of the legal text.
6. Cutover.

**Recommended order.** WP0 foundation, WP1 leads, WP3 copy and SEO sweep, WP2 chrome, WP4 page fixes, then WP5 portfolio pipeline and WP7 media tooling in parallel. WP6, WP8 and the data imports land as inputs arrive. WP9 launch gate last. About 8 builder-days are unblocked today. Calendar time is set by the asks in section 6, so send those first: they have the longest lead times.

**Five findings that change the plan** (detail in section 2)

1. At cutover, 854 WordPress images, the hero video and the share image on 9 pages stop loading.
2. Staging is the Vercel Production deployment, and `ellaleehomes.com` is not attached yet. Once it is, every merge to the default branch goes live.
3. `check-copy` contradicts the Oct 2 Fact Sheet (it bans the design phase that N12 restores) and has no rules for em dashes, "Studio", "daily", `<form`, or "Appraised at". It runs inside `npm run build`, so a wrong rule blocks deploys.
4. Portfolio facts are hand-copied into 7 places and already disagree. The three generator scripts are dead, and two of them would overwrite today's data.
5. The body font is not matched: Inter loads on 12 of 24 pages, and `site-body.css` forces it with `!important`.

## 2. Ground truth and findings beyond the documents

### How this was checked

- Seven read-only audits of the code (chrome, forms and portal, legal and SEO, portfolio, home page, page content, media and QA and docs), plus my own sweeps: an em-dash classifier that separates visible copy from titles, meta, JSON-LD and code comments, a Fact Sheet rule sweep, and a dry run of the client's approved wording against the 44 `check-copy` rules (0 hits).
- About 30 claims were spot-checked directly against the code and held; anything I could not reproduce was left out. One of my own first-pass results (fonts) was re-run and corrected.
- Vercel and GitHub were read directly. The latest Production deployment is `f56504b`, deployed Oct 2 at 15:25 UTC, so the repo is what staging serves. The default branch is `claude/implement-ella-lee-homes-lh0JL`. Two old PRs (#7, #8) are open; they predate the current site.
- Not verified: see Appendix B. The big one is that this environment's network policy blocks `ellaleehomes.com`, so staging and the live WordPress site could not be loaded.

### Launch-blocking, and not in the documents

1. **Cutover cliff.** External media at HEAD: 1,570 references, 1,436 unique. WordPress 854 files, Google Drive 579 (IDs only, no filenames), Zillow 3, one YouTube embed. 92% sits in one JS data block (`project.html:547-2602`). The hero video is also on WordPress (`index.html:274`). Nine pages point `og:image` at WordPress (`contact`, `client-portal`, `our-story`, six articles), so share previews break at cutover. The punch list's "about 100 / 9 / 6" counts static HTML only.
2. **Staging is Production.** Vercel lists only `ellaleehomes-kappa.vercel.app` as a domain. The default branch deploys as Production. Deployment Protection (Vercel login) covers everything except custom domains, so staging is not indexable today, and the custom domain will be public the moment it is attached.
3. **No list of old WordPress URLs exists** in the repo or documents. The only hint is 17 old project URLs in `scripts/wp-project-media.json` (`/mitchell/`, `/dc1/` and so on); none is redirected. There is no `404.html`.
4. **The legal draft does not match the site yet.** It says the contact form and portal are Buildertrend (true only after N15 and N6; today there are six inert forms and the current Privacy page never mentions Buildertrend). It lists OpenStreetMap and CARTO maps (Leaflet was removed Oct 1; the map is a hand-drawn SVG). It lists YouTube (only the portal walkthrough, which N7 removes). It says no analytics or advertising cookies, which is true at HEAD: the only storage is first-party `sessionStorage` (`elhSkipIntro`). The current Terms say "Last updated January 29, 2020", before the 2021 founding.
5. **`check-copy` blocks the work Shay asked for.** Rules at `check-copy.mjs:25, 28, 35, 40, 41` ban "design phase", "permitting", "sketch", "4 phases" and "concept to completion"; N12 needs the design phase back. A simulated run on the old timeline page trips lines 23, 25, 28, 35 and 40.

### Conflicts between the Fact Sheet and the code

6. **Label.** "Home appraised at" appears in about 30 places across previous-projects (22 cards plus the intro sentence), Why Us (5), Developers (3), the project page (stat and related tiles) and `disclaimer.html:113`. The Fact Sheet wants the short label "Completed home value" on cards and the full definition once per page. The legal draft already uses the definition.
7. **Em dashes.** 167 are visible to visitors or search engines, in 21 files, not 14 pages: 96 in body text, 23 in alt and aria text, 8 in meta and og, 5 in JSON-LD, 35 in JS data strings (almost all project descriptions). Another 55 sit in CSS, HTML and JS comments and do not count. Page titles have none. `check-copy` has no rule.
8. **Banned wording that is live.** "Studio" instead of "Office" at `contact.html:412`, `developers.html:961`, `sell-your-home.html:762`, `our-story.html:1017` (map pin). "daily photos" at `faq.html:112, 120, 312, 316` and `homeowner-resources.html:128`. Developers carries "cutting-edge", "sustainable practices" and "Innovative, Sustainable Solutions" (`developers.html:7, 11, 710, 755, 758-761`). Energy and smart-home claims appear in three articles, Developers and Our Story, and the one approved sentence appears nowhere. "Mediterranean Contemporary" and "5.2 bath" (Charter Oak) are off-spec.
9. **Claims on the site that the Fact Sheet does not contain.** The Fact Sheet says to ask before writing these: Contact hours (`contact.html:417-422`), "has led every build" (`index.html:296`), "a real number" and a line-item budget (`:646`), "update it at every milestone" (`:627`), "built by Milco Development" (`project.html:1310`), "Investment Build" badges, off-market inventory (`developers.html:693, 794, 851`), two footer lines (`footer.html:11, 36`), and the Code of Conduct promises.
10. **Home page.** The H1 is "Custom Homes in Arizona, Built Right." (`index.html:280`); "custom home builder in Arizona" is only in the title. Buttons say "Send Inquiry" and "Contact" instead of "Start your build". The home FAQ block's "Straight answers" is the subhead (`:617`), not the heading.
11. **Body font.** DM Serif Display loads everywhere (partly via `@import` in `site-footer.css:12`). Inter loads on only 12 pages. Missing on: client-portal, code-of-conduct, contact, developers, disclaimer, faq, homeowner-resources, our-story, privacy, terms, warranty, why-us. On those, body text renders in the system font.
12. **Sell page tone.** Chips "No Hassle / No Repairs / No Waiting" (`sell-your-home.html:496`), "Receive an Offer / Get Paid" (`:585-599`) and a 7-row "Smarter Way to Sell" table with absolutes (`:604-696`) read as the cash-buyer ad the voice rules rule out.
13. **Reviews.** The same five reviews are hard-coded in four places (Home, Why Us, Developers, Our Story). Relative dates ("3 years ago") go stale. One quote repeats a banned promise ("on time, within budget"), one contains an em dash, and all five link to the business Maps page, not to a review. On Home the strip hides cards 4 and 5 with no scrollbar or arrows.

### Structure and hygiene

14. **Portfolio data.** 25 project slugs (22 with specs). The same facts live in `project.html`, the portfolio cards (x25) and JSON-LD (x22), Developers (x3), the Home strip (x6), Why Us (x5) and the Our Story map (x22). Larkspur's location is written four ways. `generate-projects-grid.mjs`, `apply-projects-from-wp.mjs` and `fetch-wp-project-images.mjs` are wired into nothing, hold 17 stale projects, and re-running `apply` deletes 8 live ones.
15. **Nav.** Desktop already hides on scroll down, but only past `#top`, which exists only on Home, so every other page hides from the first scroll. The navy fill at 80px applies on 23 pages and on every phone view. A literal "blue only when Learn is open" leaves a transparent bar over light sections, and the six article pages are solid navy on purpose because they open on linen.
16. **QA harness.** `scripts/qa.py` overwrites `docs/qa-report.md`, `asset-migration.md` and the CSV on every run, with no flag. Checks 1, 2, 9b and the timeline check will fail or go stale. It needs Python Playwright; Node Playwright and Chromium work in this environment.
17. **Docs.** `docs/website-plan.md` section 1 (cited by `check-copy` as the source of truth) contradicts the Fact Sheet on architect, cost-plus, budget and timeline. `docs/punch-list.md` is the Oct 1 version.
18. **Repo and SEO hygiene.** Two zip files (24.6 MB, 91% of the git pack) are tracked and unreferenced. The sitemap omits three live project pages. `project.html` has no static canonical or H1 (JS fills them). 1,271 internal links point at `.html` URLs and each costs a 308. The Search Console verification token is only on two pages. `robots.txt` welcomes 13 named AI crawlers and also disallows `/client-portal` (which hides its `noindex` from Google; pick one).

## 3. Work packages

Each package is one PR into the default branch. Merges deploy to staging, so run `npm run build` locally first. Effort: S is up to an hour, M up to half a day, L over half a day. Day figures are rough builder-days.

| WP | Scope | Effort | Needs from others |
|---|---|---|---|
| WP0 | Foundation: guardrails, docs, hygiene | 0.5 d | none |
| WP1 | Leads: Buildertrend, CTAs, portal, legal text | 1.5 d | S2, S3, B1 to B4, L1 |
| WP2 | Chrome: nav, lines, footer | 1.25 d | S1, S9, S10 |
| WP3 | Copy and SEO sweep | 1.3 d | S11 to S13 |
| WP4 | Page fixes | 2 d | S11, S16 |
| WP5 | Portfolio data pipeline | 2 d, then 1 h per data drop | R1 to R5, S15 |
| WP6 | Build timeline (N12) | 0.5 d | S4 |
| WP7 | Media migration (62) | 2.5 d | J1, R3, S6, S14 |
| WP8 | Shay's content | 1.5 d | S5 to S8 |
| WP9 | Launch gate and cutover | 1 d plus DNS | all of the above, S17 |

### WP0 Foundation (do first)

Make the repo safe to change quickly, and make the guardrails match the Oct 2 Fact Sheet.

- Refactor `scripts/check-copy.mjs` to allow file-scoped rules and to scan only visible text, attributes, meta and JSON-LD for dash rules (skip HTML comments, `<style>` and JS comments). Add always-on rules for leaked notes (`For Josh`, `For Shay`, `written by Claude`, `general template`, `reviewed by counsel`). New rules land in the same PR as the fix they enforce, never before, because Vercel runs `npm run build` and a failing rule blocks the deploy.
- Add a launch gate behind `ELH_LAUNCH=1` (or a `build:launch` script): `[launch date]` present, sq ft unset, external media hosts, `og:image` or `og:url` on the old host, stray `noindex`. Run it in report-only mode inside `npm run build` now, strict only at cutover. Use a script flag, not `VERCEL_ENV`, because staging is Production. Prototypes of the leaked-note rules, the launch rule and an asset scanner (0.3 s, no dependencies; reports 1,572 error references at HEAD) were built and tested during the audit. They live in the planning session's scratch space and are not committed, so budget S to recreate each.
- `site-facts.json` with `{"sqftBuilt": null}` for N3.
- Docs: add `docs/fact-sheet.md` (Oct 2 text) and repoint the `check-copy` header at it. Make `docs/punch-list.md` the live list (Oct 2 items plus these package IDs). Make `docs/needs-confirmation.md` the only open-questions log (paste section 6). Archive `docs/website-plan.md`. Send `qa.py` output to a gitignored `qa-out/`.
- Hygiene: `git rm` both zip files (history keeps them), delete the three dead portfolio scripts, gitignore `uploads/wp/` and `qa-out/`.

Done when: build green, docs agree with the Fact Sheet, and the launch gate prints a baseline.

### WP1 Leads: Buildertrend, CTAs, portal, legal (N15, N6, N7, A1, A2, A4)

Ship these together. The legal draft describes the Buildertrend form and portal, so the legal text and N15 belong in the same release.

1. **Contact** (`contact.html:432-473`). Replace the form with the Buildertrend embed from the N15 box, verbatim. The PDF text wraps `scrolling="no"` into `scrol` and `ling`; re-join it, and copy the long `builderID` token exactly (it decodes to builder 68763, so the extracted text is intact). Keep `id="btIframe"` and put the script before the iframe. No `lazy`, `defer` or `sandbox`. Add only a `title`. Put it on a linen `#EAE5DC` panel in the right column with the heading and contact details beside it; stack on mobile; no `.reveal` on the panel (invisible if JS fails); use a navy focus ring (gold fails on linen). Under the iframe add a phone and email fallback and a `<noscript>`. Delete the form CSS (`:166-211, 219-222`), the dead `#nav` script (`:484-495`) and the empty `.section-divider`. Fix `og:image` and `og:url`. "Studio" label becomes "Office". Ask about the Hours block (S11).
2. **The other five forms.** Remove them from `index.html:577-611` (and `home.js:337-344`, `.elh-h4:hover` at `index.html:163`), `build-your-home.html:564-598`, `why-us.html:1005-1039`, `developers.html:969-1003` and `sell-your-home.html:754-824`. Keep the eyebrow, the "Start your build" heading, "Every inquiry is read personally" and the contact lines, and add one button to `contact.html` (Sell: "Start the Conversation"). Reuse the existing `.elh-fh1` pill. Fix "send the form above" (`index.html:673`). Delete only the form-only CSS (`.cta-form*`, `.cta-field*`, `.cta-submit*` and wrappers that held only the form); keep every selector the retained content still uses (on Sell: `.cta-eyebrow`, `.cta-text`, `.cta-sub`, `.cta-meta`, `.cta-meta-row`, `.cta-meta-label`).
3. **CTA routing.** Everything goes to `contact.html`. Delete `CTA_HOME`, `CTA_CONTACT` and every `cta:` in `build-html.mjs` (lines 32-34, 54, 59-102, 120); hard-code the link in `partials/nav.html` (`:18, 51`) and `partials/footer.html:12`. Relabel the footer and home-FAQ buttons from "Contact" to "Start your build". Normalize capitalization to "Start your build", and remove "Start the conversation" outside Sell (`faq.html:346`), "Start Your Build page" (`faq.html:160, 336`) and "schedule a consultation" (`how-to-find-a-custom-home-builder.html:241`).
4. **Client Portal.** Delete the login frame (`client-portal.html:450-455`) and the video block (`:461-469`). The wrong number 480-938-4113 is inside the YouTube video; it is not in any repo file. Add one centered button, `target="_blank" rel="noopener"`, to the Buildertrend login URL (S2, B3). Do not reuse the bare `buildertrend.net` link at `:456`. Delete the dead `.login-card*`, `.video-*`, `.portal-grid` and `.section-divider` CSS and the dead `#nav` script. Fix `og:image` and `og:url`.
5. **Legal text (A4).** In `privacy.html`, `terms.html` and `disclaimer.html`, replace the hero line, the inside of `div.legal-prose` and the last-updated line; keep each page's hero and markup; skip the "For Josh / For Shay" box. Leave `[launch date]` literal until WP9. Keep the Terms link to Privacy; add a Disclaimer link to Warranty. A splice-ready version was built and checked during the audit (it builds, passes `check-copy`, and matches the draft word for word); it is in the planning session's scratch space and not committed, so recreating it is S. Update the draft's section 3 to match the final site: drop OpenStreetMap and CARTO, keep YouTube only if a video stays, keep Buildertrend. Shay approves any change to approved text.
6. **Guards, landing in this PR.** Fail on `<form` anywhere except Contact, any `#inquiry` link, `onsubmit` or `data-elh-submit`, a "Get Started" label, "Start the conversation" outside Sell, `<iframe` anywhere except Contact, `NewLoginFrame`, `938-4113`; require exactly one `btIframe` and the script on Contact. Update `qa.py` checks 1 and 2 (they expect six forms and the old iframe), X5k (throws on a missing form), 48, FS7b and X4k.
7. **Tests.** Automated: static scan of `dist/` (one `btIframe` plus script on Contact, zero forms elsewhere, zero `#inquiry`, CTA hrefs). Human with Buildertrend access: send one test lead from staging and again from `ellaleehomes.com` after cutover; confirm it appears in lead management with every N16 field, shows "Thank you. We'll be in touch.", reaches the right inbox, then delete it. A cross-origin iframe and a real lead cannot be automated.

Done when: one Buildertrend form on Contact, zero other forms, all CTAs reach Contact, legal pages carry the draft text, and a test lead is confirmed.

### WP2 Chrome (N13, N14, N11, N3, N61)

- **N14 centering (S).** The header is a flex row with `space-between`, so the links centre in the space left between the 48px logo and the 187px CTA, which puts them 65 to 72px left of centre from 768 to 1920px (69.6 at 1324, matching staging). Use `grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)` in `partials/nav.html:3`; tested in a scratch copy at 0.0 offset at every width. Below about 880px the CTA wraps, so move the burger collapse from 767 to 899 in `site-nav.css:65` and `elh-nav.js:30`.
- **N13 hide and show (M).** Rewrite the state in `assets/elh-nav.js` as `data-elh-nav-state` = `top | shown | hidden | open`, with the styles in `site-nav.css` (move the inline header styles out of `nav.html`). Hide after at least 8px of downward scroll once past the nav height, on every page including Home and phones; show after 6px up or at the top; transparent in all states except `open` (Learn or the drawer), which is navy. Reset `lastY` when Learn closes (today closing it hides the bar instantly). Never hide while focus is inside the nav; `focusin` shows it; Esc closes Learn and returns focus. Respect `prefers-reduced-motion`. Remove the `data-elh-nav-clear` and `-solid` flags once decided. Nine pages also carry a separate static `--nav-h: 88px` (`article.css:13`, `site-hero.css:3`, `build-your-home.html:137`, `developers.html:178`, `why-us.html:259`) and some sticky offsets use `top: 108px` (`faq.html:186`, `index.html:615`). Sticky components must neither slide under the bar when it returns on a 6px scroll up nor leave an empty strip when it hides, so drive their offset from the nav state: a `--sticky-top` that equals the nav height plus spacing while the state is `top`, `shown` or `open` (or focus is inside the header), and about 24px only while `hidden`; point the sticky `top` values at it and leave hero offsets on `--nav-h`. Legibility needs a decision first (J3).
- **N11 lines (S, list A now).** Keep only the 1px hero rule (`.hero-title::after`, `site-hero.css:63-67` plus 13 inline copies) and the gold footer line (`footer.html:15`). About 25 rules were already removed in five commits on Oct 2. Still to remove: `client-portal.html:236` (`.section-divider`, markup `:492`), `our-story.html:302` (`.pillar-board`), `previous-projects.html:141` (`.section-band-line`, four uses), `developers.html:190` (`.pillar`, four uses), `article.css:136` (`.article-related`), and the "Last updated" rule on privacy, terms, disclaimer, code-of-conduct, warranty and homeowner-resources. List B (rules inside a component) waits for S10: Developers stats, inventory and FAQ rows; Why Us signature and cards; Sell rows, table and FAQ; Our Story legend; project amenity rows; portfolio card specs. Add a runtime line scan to `qa.py`.
- **N3 sq ft (S, then blocked on S1).** Add a third cell in `footer.html:17-26` fed by `site-facts.json`. While null the cell is omitted: never a placeholder, never the old "200K+" badge (removed in `3efa842` as unverified). The launch gate fails if the value is null or not like `12,345,678`. Store full digits because `check-copy` bans `200K+`. Add a `qa.py` check (blocked while null). Also relabel "Address:" to "Office:" (`footer.html:31`).
- **N61.** Already done: all 24 footers show ROC KB2-333410, "Why Us", "Ste 200" and "40+", with no Sell link and no stat badges.
- **Optional (S10, S12).** Off-palette navy (`#123049` on Developers, home gradients) and gold, sand and linen variants; consolidate hero CSS (13 pages carry inline copies of `site-hero.css`); give the project page the shared hero (today its own 100vh `#hero`).

Done when: menu offset within 2px of centre at 1324, 1440 and 1920; bar hides and returns on every page and on phone; no section dividers on secondary pages; footer slot present.

### WP3 Copy and SEO sweep (N10, N4, and the Fact Sheet conflicts in section 2)

Do after WP1 so the CTA blocks are edited once.

- **N10 em dashes.** Replace by context (comma, colon, period, "to" in ranges). It is not a blind find and replace. Cover body text, alt and aria text, meta and og descriptions, JSON-LD, project data and the review that contains one. Add the `check-copy` rule in the same PR.
- **Wording.** "Studio" to "Office" (four places in section 2, item 8); "daily photos" to "photos and weekly updates"; Developers rewrite (remove "cutting-edge", "sustainable practices", "Innovative, Sustainable Solutions", "Future-proofing built in", "Energy efficient, asset-grade builds"); place the one approved energy sentence once, where Shay chooses (S12), and trim the claims in three articles and Our Story (`:544`).
- **Home.** N4: put the FAQ page's subhead (`faq.html:256`) at `index.html:617`. H1 per S13. Fix `:384` ("photos and weekly updates", no "know exactly where your project stands"). Hold the unapproved claims in section 2, item 9, for S11.
- **Value label.** Switch to "Completed home value" with the definition once per page. Values wait for WP5. Add a rule against "Appraised at". Align `disclaimer.html:113`.
- **Fonts.** Load Inter 300 to 600 on every page (inject at `build-html.mjs:272`, or `@import` in `site-body.css` as `site-footer.css` does for DM Serif). Self-hosting is optional; the legal draft already lists Google Fonts.
- **Type consistency (optional, S to M).** Body text below the 16 to 17px / 300 standard (Build `.ts-body-list li` 14px, Developers 13 and 14px, Sell FAQ 15px and table 14px); H2 sizes differ per page (Why Us 56 to 72px, Developers 44 to 60px). A shared title class fixes it.
- **SEO.** Point `og:image` on the nine WordPress pages at `assets/og-share.jpg`; remove trailing slashes in `og:url` (contact, client-portal, our-story); add `twitter:image`; trim 9 titles over 60 characters and 8 descriptions over 160; remove em dashes from meta; delete the inert `<!-- @localbusiness-schema -->` comments (16 pages; the real LocalBusiness JSON-LD on Home is complete); confirm the title pattern (S11).
- **Home Stanford card** (`index.html:458`): unlinked "Coming soon" although a Stanford page exists with placeholder data. Decide with WP5.

Done when: `check-copy` has the new rules and passes; no em dashes, "Studio", "daily" or "Appraised at" in visible text; Inter loads on all 24 pages.

### WP4 Page fixes (N1, N5, N9, 43, 44, 53, 57, 58, Sell)

- **N1 reviews arrows (M).** The Home strip is a flex row with `overflow-x: auto` and scroll-snap and a hidden scrollbar, so cards 4 and 5 are reachable only by swiping (717px hidden at 1440). Give the scroller an id, `role="region"`, an `aria-label` and `tabindex="0"`. Add two real `<button>`s in the header row (`index.html:515-517`), styled like the project-strip arrows (`:498-503`). Add handlers to the `home.js` CLICK map (`:325`) and an `initReviews()`. Scroll to the next card offset, set `aria-disabled` at the ends, hide the buttons when nothing overflows, use `behavior: 'auto'` under reduced motion. This is Home-only; the other pages use a wrapping grid.
- **N5 (S).** Both `.hero-title::after` and `.hero-name::after` draw a 1px rule on the project hero (`project.html:332-343`), about 22px apart. Remove `.hero-title::after` (`:338`). Confirm with S16 that "lines" means rules and whether the year and Sold pills (`:469, :474`) are "stat badges".
- **N9 (S).** `<span id="result-count" hidden>25</span>` (`previous-projects.html:848`) is hidden but its text is in the DOM, so a text read shows "25". Delete it and the write at `:1415`, plus dead CSS at `:83, 926, 936`. Note `site-hero.css:97` would un-hide it if linked there.
- **58 (S).** "Project not found" sits in inline JS (`project.html:2647`), CSS (`:299-303`) and a div (`:459`). Until WP5 phase C, redirect an unknown or missing slug to the portfolio. The permanent fix is per-project static pages.
- **57 (S).** A gradient on the photo already exists (`project.html:74-79`), but at nav-label height linen text is 2.4 to 3.9:1 against bright sky. Raise to about .70 at the top, at least .6 through about 90px, zero by about 35% of the height, and re-measure on the final heroes. N13 removes the navy fill, which makes this matter more.
- **43 and 44 (S).** Strip speed already went up 53% on Oct 1 (`home.js:189`, 0.17 to 0.26 per frame). It is per-frame, so it doubles on 120Hz screens and pauses on hover; switch to time-based 20 to 22 px/s if Shay still finds it slow. The "blank 68th card" could not be reproduced (all 18 strip images load locally at five widths). Harden with `img.decode()` before the loop starts, and ask where it was seen (S11).
- **53 Developers (M).** One hero line (`developers.html:693, 698`); reuse the Why Us `.wu-strip` and `.reason-card` styles; replace the full-bleed pillars (hairline at `:190`, off-palette `#123049`); add the missing intro header; drop the hairlines at `:280, 391, 433`.
- **Sell page tone (S to M).** Remove the chips and the comparison table; fix Shay's line (split across H1 and meta with an em dash, `sell-your-home.html:481`) and "additional communities throughout Arizona" (`:719`). The copy needs Shay (S11).
- **Heroes.** Build, Developers, Stories and Why Us show two text blocks under the line; make each hero one lede.

Done when: each item's own check passes in `qa.py` and on screen at 1440, 768 and 390px.

### WP5 Portfolio data and Rebecca's records (N8, 11, 13, label)

**Recommended: make the data the source of truth** (L, about 2 days; about 1 hour per data drop once seeded). The alternative, hand-editing seven places per drop, takes about the same time each round and keeps drifting.

- **A (now, unblocked).** Seed `data/projects.json` from HEAD. Add `scripts/validate-projects.mjs` first in `npm run build`, in warn mode: required fields, baths as `x` or `x.5`, enums for style (`farmhouse` or `contemporary`) and market, duplicate sq ft or value is an error unless a reason is recorded, plausibility warnings (price per sq ft, beds against sq ft), no em dashes or banned phrases, hero and card images exist locally (remote allowed until launch), completed count against 26. Generate the portfolio cards, counts, JSON-LD ItemList, sitemap entries, and the Developers, Why Us, Home strip and Our Story tiles, in featured order. Photos referenced by filename under `uploads/projects/<slug>/` so the media migration is a file move.
- **Phase A done (WP5a).** `data/projects.json` (25 records, seeded from the pages) now feeds the portfolio cards, band and tab counts, ItemList, the `PROJECTS` block and the sitemap; `npm run build` validates it (errors are `[P]` launch blockers), `npm run projects:csv` writes Rebecca's sheet and `npm run projects:import` takes it back (`data/README.md`). `dist/` is byte-identical to before. The validator only warns about the Developers, Why Us, Home strip and Our Story tiles, which stay hand-written, and the photos still sit at their old addresses until the media run.
- **Still needed.** B needs Rebecca's data (R1 to R5) and the style decision (S15), then the validator in error mode. C needs per-slug static pages and `404.html`, with 301s for the 17 old project URLs hinted in `scripts/wp-project-media.json`.
- **B (when Rebecca delivers).** Import by script, validator to error mode, clear the duplicates (`$7,035,000` on Charter Oak and 68th in six places; `$3.2M` twice; `$2.1M` twice; 4,650 sq ft twice; 5,578 twice; "5.2" baths), fix pages that contradict their own stat boxes (Larkspur, Coolidge, 41st, 4th St, 68th II), and replace boilerplate amenities on 16 pages.
- **C (SEO and URLs).** Per-project static pages plus `404.html`, which closes item 58, gives each project its own title, canonical and og, and drops the 165 KB all-projects shell. Decide URLs (J4). Port `qa.py` (it parses `const PROJECTS` and `#not-found`).
- **Rebecca's CSV.** `docs/portfolio-data-for-rebecca.csv` is stale (22 rows, old names, no style or photo columns). Regenerate it pre-filled, one editable column per field: `slug, name, status (completed | in progress | for sale), market, neighborhood, year_completed, beds, baths, sqft, completed_home_value, style, card_photo, hero_photo, photo_folder, builder, featured`. Define sq ft (livable or total) in the header.
- **Scope.** Publish completed homes only. The site shows 25 against 26 completed; the 21 in progress back "40+" and nothing else. Decide for-sale homes (Glenrosa, Desert Cove), the three photo-only homes (Arroyo, Stanford, Osborn South) and the Home strip's Stanford card.

Done when: one data file feeds every surface, the validator passes in error mode, and no duplicate or placeholder values remain.

### WP6 Build timeline (N12, 9)

Blocked on S4. Small once unblocked.

- Today: three phases (01 Pre-Construction, 02 Construction "11 - 18 months", 03 Move In) in `build-your-home.html` (HTML `:415-479`, CSS `:101-231`, JS `:481-554`). The JS counts `.ts-bar`, so any phase count works.
- The earlier style is the sticky stair-step with four rows from `b447e32` (Sep 15; the file is identical at `ec7a48b`): Design, Permitting, Construction, Move In, with hero "4 phases end to end / From first sketch to final key" and the lede "18 months from design through move-in" (the parts summed to 19 to 29 months, which is item 9). An older accordion version exists from May 2 (`d62552f`).
- Restore the block with four rows (columns 1/3, 3/5, 5/11, 11/13). Suggested phases: Design, Pre-Construction, Construction (11 to 18 months), Move In. No Permitting. Duration only on Construction; the old 3 to 5, 3 to 4 and 1 to 2 month figures were never on the Fact Sheet. The old Design copy ("define the architecture", "architectural drawings", "interior design selections") implies in-house design, so the panel must be architect-led: "We can work with your architect."
- Unify the range as "11 to 18 months": `build-your-home.html:420, 431, 455, 458`, `faq.html:32` (JSON-LD) and `:272`, `index.html:627`, `steps-to-building-a-custom-home.html:136`. En dash, spaced dash and "to" are all in use.
- `check-copy`: relax lines 25, 35 (allow "Design Phase" on this page only) and 40; keep 23; line 28 only if Permitting returns. Update `qa.py` `:293, :1191-1204` (exactly 3 phases) and `:1646`.

### WP7 Media migration (item 62)

Biggest unknown. Start the tooling now; the run depends on network access and Drive.

- **Scale.** WordPress 964 references (854 unique: 848 jpg, 3 png, 2 webp, plus the hero `.m4v`), Drive 594 (579 unique, IDs only), Zillow 12 (3 unique), one YouTube embed and the Buildertrend login iframe. Local: 23 files, 3.6 MB, all 1024px wide. `og:image` on nine pages and 28 JSON-LD images are also external.
- **Blockers.** (a) Network: the environment denies `ellaleehomes.com`, Drive and Zillow (J1). Commit `7712a95` shipped the first migration tool without its download for the same reason. (b) Drive links carry only an ID, but the site hot-links them, so they are public and the tool fetches them by ID; a file that is no longer shared has to be exported by hand. (c) Shay's hero video (S6). (d) Rebecca's originals for the three Zillow photos (R5).
- **Tool, as built.** `scripts/migrate-media.mjs` replaces `migrate-wp-media.mjs`. Originals go to gitignored caches (`uploads/wp/`, `uploads/drive/`) and are never referenced from a page. `--optimize` writes the deployable files, and `--rewrite` repoints a reference only to an optimised file that exists, so a page can never point at something Vercel will not deploy. Rewrites are relative in pages and scripts and absolute inside `<meta>` tags and JSON-LD. `--verify` runs the strict asset gate, so leftover Drive, Zillow or video references fail it. Checked end to end on a scratch copy with a stubbed fetch: all 1,432 references migrate in about a minute, leaving only the Zillow photos and the old hero video. The three dead portfolio scripts were deleted in WP0.
- **Sizes, deliberately three.** Each image becomes `<name>.webp` (1600 wide, gallery, lightbox and heroes, at most 160 KB), `-960.webp` (cards and tiles, at most 70 KB) and `-480.webp` (thumbnails, at most 20 KB), encoded at the best quality that fits. There is no separate 320 or 2000 px variant. Measured on the current photos: 7 to 20 KB at 480 and 22 to 64 KB at 960. About 1,435 images is roughly 240 MB in git (about 26 MB today): curate to about 40 per home, or accept 200 MB or more. GitHub caps files at 100 MB; Vercel limits are unverified. Social share image at most 150 KB; hero video 1080p at most 6 MB (also 720p), no audio. Page markup then uses `srcset` and `sizes` to pick a size.
- **Layout.** `uploads/w/<year>/<month>/`, `uploads/d/<ID>`, `uploads/video/`. The per-project folders sketched earlier (`uploads/projects/<slug>/`) are not needed for the migration; the portfolio data file (WP5) names each project's photos instead. Full detail in `docs/media.md`.
- **Fix on the way.** The lightbox loads every thumb at full size (`project.html:2809`); gallery `alt=""` (`:2727`); portfolio cards lack lazy loading and dimensions; hero video has `preload="auto"` and no poster; `vercel.json` has no cache headers.
- **Gate.** `scripts/check-assets.mjs` from WP0: allow self, `data:`, `fonts.googleapis.com`, `fonts.gstatic.com`, `buildertrend.net` (Contact only) and Google Maps (Our Story only, only if a key is used); link-only hosts (Google Maps profile, Facebook, Instagram, YouTube channel); forbid WordPress paths, `googleusercontent`, Drive, Zillow and video embeds. Strict at launch.

Done when: the scanner reports zero external media in strict mode and the video and poster are local.

### WP8 Shay's content (45, 41, 50, 33, N3)

Scaffold now; fill when inputs arrive.

- **45 Reviews.** Build one reviews partial in `build-html.mjs` (one source for four pages). Per review: exact Google display name, verbatim text, stars, link to the review (or OK to link the profile), confirmation the reviewer is a client or homeowner. Drop relative dates. No 5.0 badge. Add the new reviews (S5).
  - Shared source done: `data/reviews.json` now feeds all four pages through `scripts/lib/reviews.mjs` (how to add one: `data/README.md`). The new reviews, dates and review links still wait on S5.
- **41 Hero video.** Swap `index.html:274` to `uploads/video/home-hero.mp4` plus a 2000px poster (today's poster is 1024px on a 118vh hero). H.264 with faststart, no audio, 10 to 20 seconds, about 3 Mbps (4 to 8 MB). If you use `<source>` children, fix the `getAttribute('src')` guard at `home.js:374` or the video stays invisible. Poster only for reduced motion, Save-Data and phones.
- **50 Our Story.** CSS part (M, unblocked): cap the map (about 880px, 16:9), rename "Our Studio", real H2s at the home spec, body selectors, Inter. "Dress it up like the original front page" needs Shay's copy and photos (L).
- **33 Why Us.** "See the craft for yourself" (`why-us.html:951-1002`, split by an `<em>` at `:955`, so plain grep misses it). Needs the new line and which home; the current tile is 68th St at the same price as Charter Oak.
- **N3, N7.** Fill the sq ft figure and any replacement portal video when supplied.

### WP9 Launch gate and cutover

Pre-flight, all required:

1. `ELH_LAUNCH=1 npm run build` is green: no external media, no `[launch date]`, no leaked notes, sq ft set, `og` tags on the new domain, no stray `noindex`.
2. Attorney has reviewed Privacy, Terms and Disclaimer. The go-live PR sets the three dates.
3. Buildertrend test lead received on staging.
4. Fresh-eyes QA at 1440, 1324, 768, 390 and 320px: keyboard, contrast, nav behaviour, plus a manual Safari and iOS pass.
5. Redirects and search: get the old WordPress sitemap and a Search Console export; build a 301 map (include the 17 old project URLs); add `404.html`; submit the new sitemap; make Search Console verification survive the move (DNS method, or the tag on every page). Optional: rewrite 1,271 internal `.html` links to clean URLs at build (M) to save a 308 per click.
6. Vercel: attach `ellaleehomes.com` and `www`; lower DNS TTL ahead of time; decide the production branch (J2); keep Deployment Protection on previews. Settle `robots.txt` (AI crawlers; `Disallow` versus `noindex` on the portal) and the analytics question (the draft says none; adding any means Privacy section 2 changes first).
7. Rollback: Vercel instant rollback, DNS back to the old host, and keep the WordPress site intact until the new one is verified.
8. After cutover: repeat the test lead on `ellaleehomes.com`; watch 404s and Search Console coverage for two weeks.

## 4. Sequence and dependencies

```
Now        WP0 -> WP1 -> WP3 -> WP2 -> WP4 -> WP5 (A) ----+
                                         \-> WP7 tooling --+-> WP7 run -> WP9
As inputs  S4 -> WP6      R1 to R5 -> WP5 (B, C)       S5 to S8 -> WP8
arrive     B1 to B4 + S2 + S3 -> WP1 test lead     L1 -> legal sign-off
```

- Land WP1 first so the CTA blocks are edited once. Do the em-dash sweep (WP3) before the layout work that touches the same files.
- Send section 6 today. Rebecca's records, Shay's video, the Drive export, the Buildertrend setup and attorney review are the long poles.
- Merge order matters because each merge deploys to staging. Run `npm run build` locally and check the Vercel preview for the PR branch before merging.

## 5. Decisions for Josh

- **J1 Network and Drive.** Add `ellaleehomes.com`, `lh3.googleusercontent.com` and `photos.zillowstatic.com` to the environment's Allowed domains (cloud environment menu, Edit, Network access, Custom, keep the package-manager list; steps at https://code.claude.com/docs/en/cloud-environments#network-access), or run the downloader on your machine and commit the result. Decide who exports Drive and how: the Drive connector, a zip, or the Drive API for the 579 ID-only links.
- **J2 Release flow.** Recommend keeping the single-branch flow until the launch candidate, then creating a protected `main`, making it the Vercel Production branch and the GitHub default, so later work lands through reviewed PRs and previews.
- **J3 Nav legibility (N13).** A transparent bar is unreadable over light sections and the six linen-topped articles. Options: (A) colourless frosted blur with a faint neutral dark scrim, no blue; (B) navy text and monogram on light sections (needs a navy monogram); (C) keep solid navy on the six articles as a documented exception. Recommend A everywhere, plus B on the articles, verified by measurement. It is Shay's rule, so confirm with S9.
- **J4 Portfolio architecture.** Recommend the data-driven approach (WP5) and, in phase C, path URLs (`/projects/<slug>`) with redirects from `project.html?slug=` (verify on a Vercel preview).
- **J5 Image policy.** Recommend curating about 40 images per home, committing WebP derivatives (roughly 100 to 240 MB) and keeping originals in Drive. If that is too heavy, use external storage.
- **J6 Staging access.** Staging is behind Vercel login. Give Shay and Rebecca team access or a shareable link so they can review.
- **J7 Cutover logistics.** DNS owner, Search Console verification method, old WordPress sitemap path and admin access.
- **J8 Housekeeping approvals.** Remove the two zips; retire the dead scripts; archive `website-plan.md`; close stale PRs #7 and #8; burger breakpoint at 899px; consolidate hero CSS; Inter by Google link or self-host; Google Maps key or keep the SVG map.

## 6. Asks for others

Send these as they are. Tags show what each unblocks.

### Shay

- **S1** Sq ft built: the figure, the basis (completed only, or completed plus in progress like "40+"), and an as-of date. [N3]
- **S2** The Buildertrend client login URL, the button label, and whether it may open in a new tab. [N6]
- **S3** Client Portal video: remove it, or replace it? If replaced, host it on this site (Fact Sheet) or YouTube (Privacy draft)? Someone has to watch the current one: it shows 480-938-4113. [N7]
- **S4** Build timeline: the phase set and order (is Permitting back? is Design added to or replacing Pre-Construction?), the label ("Design" or "Design Phase"), Design heading, paragraph and deliverables (architect-led), any durations besides construction, the lede, the hero lines and the meta text. Is "earlier style" the Sep 15 to 29 stair-step? Is an architect-led Design phase allowed under "never we design"? [N12]
- **S5** Reviews: how many to add; for each, the exact Google display name, verbatim text, stars, date and link (or OK to link the business profile), plus confirmation the reviewer is a client or homeowner. Keep Mike M's "on time, within budget"? How to handle Heather Wilson's em dash? Is Michael Wiss (an investor) a client? [45]
- **S6** Hero video: spec, delivery date, and is poster-only acceptable if it is late? [41]
- **S7** Why Us "See the craft for yourself": the new line and which home. [33]
- **S8** Our Story: the copy, photos, map size, the 22 pins under "40+", hand-drawn SVG or a Google Maps key, and what "original front page" means. [50]
- **S9** Menu: how to keep it legible over light sections and the article pages (J3); should the phone menu hide too; hide after about 100px or only past the hero? [N13]
- **S10** Lines: is the "hero line" the 1px rule under the title; is the "footer line" only the gold one (not the legal-bar rule at `footer.html:76`); keep or remove rules inside components (list B); does it apply to Home too (`index.html:292, 317`)? [N11]
- **S11** Copy the Fact Sheet does not cover: Contact hours; the two footer lines; "has led every build"; "a real number" and a line-item budget; "update it at every milestone"; "built by Milco Development"; "Investment Build" badges; off-market inventory; Code of Conduct promises; the "tour model homes" article; Sell chips, table and "additional communities throughout Arizona"; the title pattern ("Topic: keyword" versus the sheet's "Why Us | Custom Home Builder Paradise Valley"); where and in which browser the blank card appeared.
- **S12** Energy and smart-home: which page carries the one approved sentence; keep the three articles that discuss energy? Approve the Developers rewrite.
- **S13** Home H1: "Custom home builder in Arizona"? Is the FAQ page's subhead the "FAQ wording"?
- **S14** Photos: is every photo a home Ella Lee Homes built? Check `uploads/home/shay.jpg`, three Zillow photos (5th St 2, Cudia City, Desert Cove), article images, the Earll "Milco Development" line, and the For Sale Desert Cove. Are Arroyo, Stanford and Osborn South completed?
- **S15** "Completed home value": sale price, appraisal or something else? Show a list price for for-sale homes? Which style (farmhouse or contemporary) for Mediterranean, Spanish, Estate and transitional homes?
- **S16** Project hero: do "two white lines" mean the rules or text? Do the year and Sold pills count as stat badges?
- **S17** Go-live date. Any analytics planned (Privacy section 2 must change first)? Does a written warranty document exist (the Disclaimer refers to one)? Keep welcoming AI crawlers (GPTBot, CCBot, Google-Extended and ten more)?

### Rebecca

- **R1** The record for every house, in the regenerated CSV, and which are the 26 completed and the 21 in progress.
- **R2** Sq ft definition (livable or total); Charter Oak baths (5 full and 2 half?); the real values for Charter Oak and 68th; the builder of each home.
- **R3** Main picture for each card and hero (high resolution; today 1024px), the style, and the Drive folder for each project.
- **R4** Market, neighborhood, year (completed or sold), and naming (Hazelwood in Scottsdale versus Hazelwood II in Arcadia); is the for-sale Desert Cove a third home?
- **R5** Originals and rights for the Zillow-only photos (5th St 2, Cudia City, Desert Cove).

### Buildertrend settings (Shay or the office)

- **B1** Set the N16 fields in order and the confirmation text "Thank you. We'll be in touch."; choose who is notified of new leads.
- **B2** Confirm the embed works from `ellaleehomes-kappa.vercel.app` and `ellaleehomes.com` (any domain restriction?) and whether `btClientContactForm.js` is safe to load async.
- **B3** The official client login URL (Buildertrend support 1-877-309-0368).
- **B4** After the test lead: confirm every field arrived, then delete it.
- **B5** Leads from Sell and Developers differ only by the "I'm interested in" dropdown; add fields (timeline to sell, property type) if those teams need them.

### Attorney (through Shay)

- **L1** Review the three drafts. The audit raises: the draft drops the Do-Not-Track disclosure; other states' privacy laws; browsewrap acceptance; indemnity, liability limit and venue; "we do not sell" next to Buildertrend; no retention period; the curated-reviews wording. Approve the section 3 edits made after N6, N7 and item 62.

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| DNS flips before media is local | Broken images, video and share previews | WP7 before WP9; strict asset gate; keep WordPress intact until verified |
| Old WordPress URLs return 404 | Lost search traffic and links | Old sitemap and Search Console export; 301 map; `404.html` |
| A new rule fails `npm run build` | Staging deploy blocked | Rules land with their fixes; strict gates only in `build:launch` |
| Merge to default branch goes live after cutover | Half-done work published | J2 production branch; PR previews |
| Buildertrend embed: domain restrictions, blocking script, no styling | No leads, or a slow footer | B2; fallback contact lines; test on staging and production |
| Rebecca's data arrives late or incomplete | Portfolio quality | Validator; publish fewer completed homes rather than placeholders |
| Legal text no longer matches the site | Inaccurate privacy statements | Finalize section 3 after N6, N7, 62; attorney sign-off |
| 240 MB of images | Slow clones; deploy limits | Curate; WebP; budgets; or external storage (J5) |
| Nav hide and show regresses accessibility | Keyboard users lose the nav | Focus rules in WP2; keyboard test |
| `qa.py` rewrites docs on every run | Lost edits to docs | WP0: send output to `qa-out/` |

## 8. Execution notes

- Nothing here needs a heavier model. Use the current tier at high effort for the nav state machine (WP2) and the two pipelines (WP5, WP7); the rest is mechanical.
- Each package is sized for one session and one PR.

## Appendix A: Punch-list items against the code at `f56504b`

| ID | Request | At HEAD | WP | Waiting on |
|---|---|---|---|---|
| N1 | Review arrows | Open: Home strip hides cards 4 and 5 | WP4 | none |
| N2 | Budget and address fields | Buildertrend-side (N16) | none | Shay or office |
| N3 | Sq ft built in footer | Blocked: slot ready | WP2 | S1 |
| N4 | Home FAQ wording | Open (S): `index.html:617` | WP3 | none |
| N5 | Project hero one line | Open (S): `project.html:338` | WP4 | S16 |
| N6 | Portal login button | Open: embed at `client-portal.html:450` | WP1 | S2, B3 |
| N7 | Portal video, wrong phone | Open: number is inside the video | WP1 | S3 |
| N8 | Rebecca's records | Blocked | WP5 | R1 to R4 |
| N9 | Stray "25" | Partial: hidden but in the DOM | WP4 | none |
| N10 | Em dashes | Open: 167 in 21 files | WP3 | none |
| N11 | Section lines | Partial: about 25 rules gone; list A open | WP2 | S10 |
| N12 | Build timeline | Open: needs wording; `check-copy` conflict | WP6 | S4 |
| N13 | Menu hide and show | Partial: desktop only; blue on 23 pages and phone | WP2 | S9 |
| N14 | Menu centered | Open: 69.6px left at 1324 | WP2 | none |
| N15 | Buildertrend form | Open: six inert forms | WP1 | B1, B2 |
| N16 | Buildertrend fields | Buildertrend-side | none | Shay or office |
| A1 | Forms send nowhere | Superseded by N15 | WP1 | none |
| A2 | Buildertrend login | Superseded by N6 | WP1 | none |
| A4 | Legal placeholder note | Open: Disclaimer note remains; use the draft | WP1 | L1 |
| 9 | Three timelines | Numbers done; superseded by N12 | WP6 | S4 |
| 11 | Portfolio data | Blocked | WP5 | R1 to R4 |
| 13 | Same price twice | Blocked: six places | WP5 | R2 |
| 17 | Budget ranges | Done on site; field is in Buildertrend | none | none |
| 27 | FAQ subhead | Done on the FAQ page; Home half is N4 | WP3 | none |
| 33 | See the craft | Blocked | WP8 | S7 |
| 41 | Hero video | Blocked; current file is on WordPress | WP8, WP7 | S6 |
| 43 | Strip speed | Done in code (+53%); verify on screen | WP4 | none |
| 44 | Blank 68th card | Done in code; cause unproven; harden | WP4 | S11 |
| 45 | More reviews | Blocked | WP8 | S5 |
| 50 | Our Story | Blocked on copy; CSS part open | WP8 | S8 |
| 53 | Developers layout | Partial | WP4 | S11 |
| 57 | Nav over bright sky | Partial: gradient exists, 2.4 to 3.9:1 | WP4 | none |
| 58 | Hidden "Project not found" | Open: in JS, CSS and markup | WP4, WP5 | none |
| 61 | Footer stat badges | Done, except N3 | WP2 | none |
| 62 | Media off old sites | Open: 1,436 unique files | WP7 | J1, S6, R3 |

## Appendix B: What was not verified

- Staging and the live WordPress site could not be loaded (network policy). Statuses rest on the repo at the deployed commit.
- The Buildertrend embed's runtime behaviour, domain restrictions and lead flow.
- The content of the portal YouTube video (where the wrong phone number appears).
- Whether the Google review links open the intended reviews.
- Remote images (WordPress, Drive, Zillow); photo claims were checked by filename and alt text only.
- Safari and iOS rendering, including the strip's blank-card report.
- Vercel dashboard toggles (analytics, Speed Insights), plan limits and image quotas, and cookies set by the YouTube and Buildertrend iframes.
