# Ella Lee Homes — Website Revision Plan

Source: Shay/Josh's handwritten notes + the **Website Fact Sheet** + the **Merged Punch List** (66 items, September 2026). Handwritten answers on those sheets override the typed text; where they conflict with each other it is flagged in §2.

Staging: `ellaleehomes-kappa.vercel.app`. Build: `npm run build` (static, `src/` + `partials/` → `dist/`).

---

## 1. Decisions already made (from the handwritten answers)

| Topic | Decision | Notes |
|---|---|---|
| Homes count | **"40+" homes, completed and in progress.** Exact figures: **26 completed, 21 ongoing.** | One figure sitewide (footer, home, Our Story, Portfolio, Developers, map). Drop "nearly 50", "50+". See C1. |
| Years | "Since 2021" only. Remove "10+ years" and "fifteen years of conversations". | Developers page. |
| Build timeline | **11–18 months of construction**, always as a range, never a promise. Phase breakdown re-scaled to fit ("take the rest from the timeline per what we did"). | Fixes the 18 / 19–29 / 14–24 mismatch across Build, FAQ, Home, Sell, Steps. |
| Budget range | **No mentions anywhere.** Remove from body copy, Why Us, and the form dropdown. | Handwritten "no mentions" on the Fact Sheet; also resolves item 17. |
| Dollar value delivered | Only if it can be summed from the **estimated sales value of all homes**. Otherwise remove "$200M+". | Needs the records (see §4). |
| Charitable giving | **"10% of profits"** stays. | Conditions struck out. |
| Neighborhood count ("9 neighborhoods") | Keep only if it can be documented; otherwise remove. | Verify from records. |
| Absolute promises | Remove "On time. On budget. Always." and "100% transparency". | |
| Reviews | Real Google reviews only, real names, link to the actual review or full profile. **Clients/homeowners only.** | Rebecca to supply project specs. |
| Design language | **We do not design.** Remove every "design build" / "we design" / "in-house design". Do **not** describe an architect relationship at all. | Items 21, 22, 23, 25. Delete "A design and build construction company in Arizona, we design…". |
| Colors | Background navy **#001526** (confirm against Josh/Shay's site). Linen text #EAE5DC. Warm gray #A5A09D / #2B2B2B. | Item 56 closed. |
| Heroes | One standard hero on every page: full screen before the blue fade, white text only above the line, **same style, different photos**. | Only the home page gets a video. |
| Footer | Camino courtyard background — **done, looks good**. | Item 47: just verify. |
| Warranty inbox | `warranty@ellaleehomes.com` **created and monitored**. `hello@` monitored ✓. | Item 16. |
| Nav / CTA | Nav label **"Why Us"** everywhere. Primary CTA = **Start Your Build**. Sell Your Home stays out of the homepage. | |
| Page titles | `Topic \| Ella Lee Homes`. Homepage H1 targets "custom home builder in Arizona"; Paradise Valley, Scottsdale, Arcadia at H2. | |
| Sell line | "Give your home a second life with another family to grow in." Frame lots and teardowns, not "the house is coming down". | See C4. |
| Response time | Remove the "one business day" promise. Use "Tell us about your project. Every inquiry is read personally." | Item 26, G5. |

## 2. Conflicts and gaps I need you to settle

Small, but each blocks copy on several pages.

- **C1 Home count.** "26 completed + 21 ongoing" adds to **47**, but the notes say "40+". "40+" is safe; "47" is exact. Which do we print? I'll default to **"40+ homes built and underway"** with 26 / 21 on the Portfolio page only.
- **C2 Timeline.** The Fact Sheet row reads "14–18 average", the timeline rows and punch list read "11–18". I'll use **11–18 months** unless you say otherwise.
- **C3 Cost-plus.** Item 10 says "state plainly that we build cost-plus", but the Fact Sheet line "We build on a cost-plus basis, with open books" is **crossed out**. Default: **remove the fixed-price implication and say nothing about contract type**. Confirm.
- **C4 Sell page.** The note next to G4 reads "Add a lot" / "All & lot" (hard to read). I'll frame it around **lots and teardowns**, keeping the "second life" line. Confirm the intent.
- **C5 Budget ranges vs. item 17.** The scribble beside item 17 is ambiguous ("Lets … all ranges"). Fact Sheet says "no mentions", so I'm **removing every range** including the form dropdown.
- **C6 Missing scan rows.** Punch-list items **24** and **55** are cut off at page edges in the scan. Send them or I'll treat them as covered by the rest.
- **C7 Buildertrend.** I need the **login embed code** (Buildertrend support 1-877-309-0368). Your note says "reach out to them for HTML code" — that's a dependency on you.

## 3. Workstreams (in order)

### WS0 — Single source of truth
Create `src/_data`-style constants (or a single `docs/fact-sheet.md` + a build-time replace) for: home count, years, timeline, address (**"Ste 200"** always), phone, ROC `KB2-333410`, emails. Add a build check that fails if banned strings reappear ("design build", "we design", "in-house", "10+ years", "50+", "nearly 50", "Founders", "one business day", "South Arizona", "Always."). This stops the numbers drifting again across 17 pages.

### WS1 — Blockers (nothing launches until done)
1. **Forms** (Home, Build, Why Us, Developers, Contact, Sell — 6 forms): wire each to a live inbox or Buildertrend, add a success/error state, test each. *Needs: the destination inbox/endpoint.*
2. **Client Portal**: install Buildertrend login embed; remove stray `\n` characters; fix hero. *Needs C7.*
3. **Review links**: each card links to its direct review URL or the full Google profile.
4. **Legal pages** (Privacy, Terms, Disclaimer): remove the "general template, not legal advice" note. Final language comes from counsel — I'll leave a clearly marked placeholder for their text, not invent it.
5. **Our Story**: replace the leftover designer note with real copy. *Shay to provide copywriting.*

### WS2 — Facts and claims (one true set, everywhere)
Apply the decisions in §1 sitewide: home count, years, timeline range, budget removal, Ste 200, ROC in every footer, `warranty@` on Warranty + Homeowner Resources, footer stat badges (50+, 200K+, 5.0) removed or replaced by verified numbers, absolute promises removed, fix the "South Arizona" and "Founders" wording, lowercase "You dream it, we build it".

### WS3 — Portfolio data and project cards
Rebuild Portfolio from real records (bed/bath/sq ft/price per home; baths in halves only; no repeated placeholder values). Correct the homepage cards to pull from that data. Verify Charter Oak & 68th sale prices (both currently $7,035,000). Fix "Similar Projects" to match by price/size/area. Hide "Project not found" unless a project is actually missing. Fix the blank 68th card image. *Needs: Rebecca's project specs.*

### WS4 — Copy and positioning rewrites
Why Us (remove In-House Design reason → builder-focused reason; "Founder" singular; rewrite "See the craft yourself" and swap the home; change "In practice"), Developers (remove design packages/3D renderings, remove years claim), Sell (rewrite in brand voice, move the chips lower), Stories (replace "Ready to stop reading and start building?" with something more elegant, adjust hero line), Start Your Build (remove one-business-day line), FAQ subhead + Warranty line (suggested wording is in the punch list), Portfolio hero (new wording, no design language — *Josh to choose*). Apply the sitewide voice: sophisticated but simple, plain words, no over-promising.

### WS5 — Design and layout
1. **Hero standard** (item 40): one shared hero component/CSS, applied to Portfolio, Build, Stories, Client Portal, FAQ, Warranty, Homeowner Resources. White text above the line, full screen before the blue fade, no stat badges.
2. **Home**: new hero video (in progress on your side — swap when delivered), Shay photo in "what began as a dream" (attached to email), project strip slightly faster + fix blank card, more real Google testimonials from homeowners/clients, keyhole intro shortened with skip.
3. **Portfolio**: smaller project blocks (maybe one more per row). 
4. **Build**: contact strip like the homepage's.
5. **Our Story**: dress it up like the original front page, keep the map but smaller, all body fonts match, titles styled like the front page. Show the same Google review cards instead of FAQ questions.
6. **Why Us**: redesign the first strip after the hero; testimonials strip like the front page; remove the halo around the card stack; remove stray "HOME" button next to "Full Portfolio".
7. **Developers, Warranty, Homeowner Resources**: same treatment as Why Us / like the original site but updated.
8. **Project pages**: subtle dark gradient behind the nav over bright sky photos ("to photo").

### WS6 — SEO and AI search
LocalBusiness / HomeAndConstructionBusiness JSON-LD on Home (name, address with Ste 200, phone, ROC, areas served); a full **FAQ** question-and-answer set with FAQ schema (the biggest SEO/AI-search win, and cheap); meta descriptions + branded share image on every page; standardize titles as `Topic | Ella Lee Homes`. Robots/sitemap already correct — leave.

### WS7 — Photos and video, launch
Once Google Drive assets are delivered, store every image/video **on the new site** and remove all references to the old WordPress site, Google Drive, and Zillow (≈53 remote assets). Final fresh-eyes pass on staging, then point `ellaleehomes.com` at the new site.

## 4. What I need from you (dependencies)

| Need | For |
|---|---|
| Answers to C1, C3, C4 (defaults above are fine if you just say "go") | WS2, WS4 |
| Buildertrend login embed code | WS1 |
| Form destination (inbox / Buildertrend lead endpoint) | WS1 |
| Rebecca's per-home specs + sale values (also decides "$ delivered" and "neighborhoods") | WS3, WS2 |
| Real client/homeowner Google review text, names, URLs | WS1, WS5 |
| Shay's Our Story copy; Josh's picks for Portfolio hero, Why Us "In practice", Stories replacement line | WS4 |
| New hero video; Shay photo; Google Drive photo/video export | WS5, WS7 |
| Legal text from counsel | WS1 |

## 5. Suggested sequence

1. **Now (no dependencies):** WS0 guardrails, then WS2 facts sweep with the defaults, WS4 design-language removal, WS5 hero standard + layout fixes, WS6 SEO schema/meta.
2. **As inputs arrive:** forms + portal (WS1), portfolio data (WS3), reviews, Our Story copy, video/photos.
3. **Last:** WS7 asset migration, staging pass, domain cutover.

Each workstream ships as its own small PR so it can be reviewed against the punch-list item numbers it closes.

---

## 6. Progress

Superseded by **docs/punch-list.md**, which tracks every item against the Sep 29 Fact Sheet. Where this plan disagrees with the Fact Sheet (cost-plus, architect wording, 11–18 months construction-only), the Fact Sheet and punch list win.
