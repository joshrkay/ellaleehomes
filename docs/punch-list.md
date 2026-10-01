# Ella Lee Homes — Punch List, point by point

Source of truth: the typed **Merged Punch List** and **Website Fact Sheet** (both updated September 29, 2026), plus the handwritten notes. Fact Sheet answers override anything earlier. All 66 items are here, including **24** and **55**, which were unreadable in the scanned copy.

**Status:** ✅ done in PR #26 · ⛔ blocked on an input only Ella Lee Homes can supply · 🟡 partly done · ➖ closed in the PDF

Guardrail: `scripts/check-copy.mjs` runs before every build and fails if banned wording returns (design language, open books, fixed price, budget ranges, response promises, "dozens", 5.0 badge, remodel/commercial, design/permitting phases, "Ste 200" missing, warranty@ outside Warranty and Homeowner Resources, and more).

## A. Blockers

| # | Item | Status | What was done / what is needed |
|---|---|---|---|
| 1 | Forms send nowhere (6 forms) | ⛔ | Budget dropdown removed from every form ✅. **Needs:** the destination inbox or Buildertrend lead endpoint, then wire and test each form. |
| 2 | Buildertrend login not working | ⛔ | **Needs:** the login embed code. Ella Lee Homes requests it from Buildertrend (1-877-309-0368); Josh installs it. |
| 3 | Review links open Google, not the review | ⛔ | Cards link to the Google profile for now. **Needs:** each review's direct URL. |
| 4 | Placeholder text on legal pages | ⛔ | Untouched on purpose. **Needs:** counsel's final language, then remove the note. |
| 5 | Designer note in Our Story | ✅ | Note removed. Shay's real copy is tracked in item 50. |
| 6 | Stray "\n" on Client Portal | ✅ | Removed. |

## B. Facts and numbers

| # | Item | Status | Notes |
|---|---|---|---|
| 7 | Home count | ✅ | "40+ homes" (completed and in progress) sitewide: footer, home, Our Story, Portfolio, Developers, map. 26 completed / 21 in progress appears only in the FAQ answer. |
| 8 | "10+ years", "fifteen years" | ✅ | Removed. "Since 2021" only. |
| 9 | Three different timelines | ✅ | 11–18 months, construction only. Design and permitting phases removed from the Build page; "Planning and permitting" wording removed from Home, FAQ, Steps article. |
| 10 | FAQ implies fixed price | ✅ | "How does pricing work on an Ella Lee home?" states cost-plus plainly. No "open books", no fixed-price comparison. Cost-plus also stated on Build, Home, Code of Conduct. |
| 11 | Portfolio data copy-pasted | ⛔ | **Needs:** Rebecca's real records. |
| 12 | Homepage cards identical specs | ⛔ | Depends on 11. |
| 13 | Charter Oak / 68th same price | ⛔ | **Needs:** the real sale prices. |
| 14 | "Mark, Paradise Valley, 2024" testimonial | ✅ | Removed. |
| 15 | Claims needing backup | ✅ | Removed: $200M+, 9 neighborhoods, 5.0 badge (footer, home, contact, schema), "On time. On budget. Always.", "100% transparency". "Dozens" replaced by "40+ homes". Kept: 10% of profits. Real Google reviews kept. |
| 16 | Warranty page email | ✅ | `warranty@ellaleehomes.com` on Warranty and Homeowner Resources only (enforced). |
| 17 | Budget ranges mismatch | ✅ | All budget ranges and dropdowns removed. |
| 18 | "South Arizona" | ✅ | Removed; statewide phrasing is "Arizona" (enforced; "the Phoenix Valley" removed from copy). |
| 19 | "Ste 200" missing | ✅ | On Contact, Developers, Sell, Home, Our Story; schema address too (enforced). |
| 20 | ROC in the footer | ✅ | Verified: KB2-333410 in the shared footer on every page. |

## C. Services and positioning

| # | Item | Status | Notes |
|---|---|---|---|
| 21 | "Design build" / "we design" | ✅ | Removed sitewide and enforced. |
| 22 | Why Us "In-House Design" reason | ✅ | Replaced with "Built Around You" ("…and we can work with your architect") and "One team, one point of contact". |
| 23 | Developers FAQ design package, 3D renderings | ✅ | Removed; FAQ now says only what Ella Lee Homes builds. |
| 24 | Services contradict (remodel/addition/commercial) | ✅ | Home FAQ, Developers FAQ, Code of Conduct and the Steps article cleaned. "Custom homes only"; no "new homes only" either (enforced). |
| 25 | Design described two ways | ✅ | One line sitewide: "We can work with your architect." |

## D. Copy and wording

| # | Item | Status | Notes |
|---|---|---|---|
| 26 | "within one business day" | ✅ | Removed everywhere. "Every inquiry is read personally." |
| 27 | FAQ subhead | ✅ | Suggested wording applied. |
| 28 | Warranty line | ✅ | Suggested wording applied. |
| 29 | "You Dream it" | ✅ | Lowercase on Our Story. |
| 30 | Nav label "Why Us" | ✅ | Nav, dropdown, footer and page title. |
| 31 | "Ready to stop reading…" | ✅ | "When you're ready, let's talk." Confirm tone. |
| 32 | Stories hero wording | ✅ | Rewritten without design language. |
| 33 | "See the craft yourself" | ⛔ | **Needs:** Shay's notes (rewrite the line, swap the home). |
| 34 | "In practice" label | ✅ | Josh's pick made: "Recent Homes". Change if you prefer another. |
| 35 | Portfolio hero wording | ✅ | Josh's pick made: "Custom homes across Paradise Valley, Scottsdale, Arcadia, and Phoenix." No stat text in the hero. |
| 36 | Sell page reads like a cash-buyer ad | ✅ | Rewritten in brand voice for homes and lots. Line: "Give your home or lot a second life." |
| 37 | Sell chips | ✅ | Chips kept, moved lower down the page; "trusted local buyer" gone. |
| 38 | Founder line grammar | ✅ | "since the company was founded"; singular "Founder". |
| 39 | Sitewide voice | ✅ | Applied to everything rewritten. |

## E. Design and layout

| # | Item | Status | Notes |
|---|---|---|---|
| 40 | Hero standard | ✅ | `assets/site-hero.css`. Applied to FAQ, Warranty, Homeowner Resources, Code of Conduct (new); Client Portal on local photo; Portfolio, Build, Stories already on it. Each page has its own photo; video on Home only. **Note:** several hero photos still load from the old WordPress host until the Drive upload (item 62). |
| 41 | New hero video | ⛔ | Shay is working on it. |
| 42 | Photo of Shay | ⛔ | The photo was sent in chat but did not arrive as a file. **Needs:** the image file added to the repo (e.g. `uploads/shay.jpg`); then it goes in the "what began as a dream" section on Home and on Our Story. |
| 43 | Project strip speed | ✅ | Slightly faster. |
| 44 | Blank 68th card | ✅ | Strip images load eagerly (they were lazy-loaded inside a scrolling strip). |
| 45 | More Google testimonials | ⛔ | Five real reviews now on Home, Why Us, Developers, Our Story. **Needs:** more real homeowner/client reviews if wanted. |
| 46 | Our Story review cards | ✅ | Same Google review cards replace the FAQ list; the unverified "Mark" quote is gone. |
| 47 | Camino footer | ✅ | Shay confirmed done. |
| 48 | Build contact strip | ✅ | Verified: same "Start your build" block as Home. |
| 49 | Portfolio blocks too large | ✅ | Four per row on large screens (three mid-size), smaller card text. |
| 50 | Our Story feels plain | ⛔ | **Needs:** Shay's copywriting. Map size, body fonts and title styling still to do alongside it. |
| 51 | Why Us layout | ✅ | New first strip, Google review strip like Home, halo around the card stack removed. |
| 52 | Stray HOME button | ✅ | Removed. |
| 53 | Developers layout | ✅ | Same treatment as Why Us: halo removed, review strip added. |
| 54 | Warranty / Homeowner Resources layout | 🟡 | Heroes done. **Needs:** a look at the old site's structure ("follow the old site's structure"); the old site is not reachable from this environment. A screenshot of those two old pages is enough. |
| 55 | FAQ layout matches the front page | 🟡 | Standard hero added and the list expanded to 17 questions. The list styling is unchanged; say if the front page treatment means more. |
| 56 | Navy | ➖ | #001526 stays. |
| 57 | Nav text over bright photos | ✅ | Gradient on the photo (top of the hero image), not behind the header. |
| 58 | Hidden "Project not found" | ✅ | Now created only when a project is actually missing. |
| 59 | Similar Projects not similar | ✅ | Matched by price, size and area. |
| 60 | Keyhole intro delay | ✅ | 3.1s → 1.9s, plus a Skip button. |
| 61 | Footer stat badges | ✅ | 50+, 200K+, 5.0 removed; ROC license kept. |
| 62 | Photos load from old sites | ⛔ | Planned. **Needs:** the Google Drive export. Then confirm nothing loads from the old WordPress site, Drive or Zillow. |

## F. SEO and AI search

| # | Item | Status | Notes |
|---|---|---|---|
| 63 | Business schema on the homepage | ✅ | HomeAndConstructionBusiness JSON-LD on every page incl. Home: name, address (Ste 200), phone, ROC license, founder, areas served. |
| 64 | FAQ page is thin | ✅ | 17 questions with FAQPage schema, written only from Fact Sheet facts. |
| 65 | Meta description, share image, titles | ✅ | Every page has a description; branded share image `assets/og-share.jpg` with Open Graph and Twitter tags; titles standardized "Topic \| Ella Lee Homes". |
| 66 | H1, robots, sitemap | ➖ | Already right. |

## G. Conflicts (all decided September 29)

| # | Decision | Applied |
|---|---|---|
| G1 | "40+ homes", built and in progress | ✅ |
| G2 | 11–18 months of construction; rest of the timeline removed | ✅ |
| G3 | "We can work with your architect" | ✅ |
| G4 | Keep Shay's line, add "lot" (home or lot) | ✅ |
| G5 | No time commitment anywhere | ✅ |

## H. Order of work

1. Decisions made ✅ · 2. Inputs gathered ⛔ (see below) · 3. Forms, Buildertrend, review links ⛔ · 4. Portfolio data ⛔ · 5. Copy rewrites and hero standard ✅ · 6. SEO ✅, legal ⛔ · 7. Photo/video upload ⛔ · 8. Fresh-eyes pass, then cutover.

## Still needed from Ella Lee Homes

Form destination · Buildertrend login embed code · direct review URLs and any additional reviews · counsel's legal text · Rebecca's per-home records and sale prices · Shay's notes for "See the craft" and Our Story copy · the new hero video · **Shay's photo as a file** · a screenshot of the old Warranty and Homeowner Resources pages · the Google Drive photo/video export.
