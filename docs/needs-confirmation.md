# What the site still needs from Ella Lee Homes

Written for Shay, Josh and Rebecca. Nothing here was invented: each line says what the page says today, where it lives, and what is needed. `docs/qa-report.md` has the measured evidence for every item; `docs/punch-list.md` has the status of all 66 items.

## 1. Inputs the site is waiting on (12 blocked items)

| # | Item | What is missing | From | Where it shows |
|---|---|---|---|---|
| 1 | Forms deliver nowhere | The 6 forms (Home, Build, Why Us, Developers, Contact, Sell) have no destination. Submitting shows a "Thank you" message and sends nothing. Need the inbox, or the Buildertrend lead endpoint, then each form is wired and tested. | Josh / Shay | the six `<form>` blocks |
| 2 | Buildertrend login | The page still embeds the original login frame (`buildertrend.net/NewLoginFrame.aspx`), the one reported as not working. Need the official embed code. | Buildertrend support, 1-877-309-0368 | Client Portal |
| 3 | Review links | All 20 review cards link to the business's Google Maps listing. The Fact Sheet allows "each links to that review, or to the full review profile", so this may already be acceptable. A direct URL per review would be better. The link could not be opened from the build environment, so it is unverified. | Shay | Home, Why Us, Developers, Our Story |
| 4 | Legal pages | Privacy, Terms and Disclaimer still carry the placeholder note and "general template" text. Need counsel's final language. | Counsel | Privacy, Terms, Disclaimer |
| 11 | Portfolio records | 22 projects. Charter Oak shows 5.2 baths. The same price appears on 5th-st/4th-st, charter-oak/68th and hazelwood-1/hazelwood-2, and several square footages repeat. Need real beds, baths (halves only), square feet and price per home. `docs/portfolio-data-for-rebecca.csv` lists what the site says now, flags the problem rows and has blank columns to fill in. | Rebecca | Portfolio, project pages, Why Us strip |
| 12 | Home project cards | The identical placeholder specs were taken off and each card shows its location. Real specs go back once item 11 is done. | Rebecca | Home |
| 13 | Sale prices | Charter Oak and 68th & Camelback are both listed at $7,035,000. | Rebecca | Portfolio, project pages, Why Us ($7.0M twice) |
| 33 | "See the craft yourself" | Shay's notes for the rewrite and which home to swap in. | Shay | Home |
| 41 | New hero video | The Home page still plays the old WordPress video. | Shay | Home |
| 45 | More testimonials | Five real Google reviews appear on each of Home, Why Us, Developers and Our Story. More only if you supply real ones. | Ella Lee Homes | those pages |
| 50 | Our Story | Shay's copywriting. Map size, fonts and title styling are done alongside it. | Shay | Our Story |
| 62 | Photos and video off-site | 856 images and videos load from the old WordPress site, 166 from Google Drive and 3 from Zillow (list in `docs/asset-migration.md`). Need the Drive export; then they are swapped in and the check confirms nothing loads off-site. | Ella Lee Homes | every page; the 166 Drive images are on the project pages |

Also waiting, not counted above: **54** a screenshot of the old Warranty and Homeowner Resources pages (the brief says "follow the old site's structure"); **55** whether "FAQ layout matches the front page" means more than the standard hero and the 17-question list now in place.

## 2. Wording on the site that is not on the Fact Sheet

These came across from the earlier site. The Fact Sheet says "if something is needed that is not on this sheet, ask before writing it", so each is listed for a yes or a change. Nothing below was changed.

| Where | What the page says | Why it is listed |
|---|---|---|
| Contact | Hours: Monday – Friday 8:00 AM – 5:00 PM, Saturday by appointment, Sunday closed | Not on the Fact Sheet. The business schema carries no hours, so page and schema disagree. |
| Warranty, Homeowner Resources, Warranty page description | "a one-year workmanship warranty from the date of completion, covering defects in the work we performed" | A concrete term that is not on the Fact Sheet. Confirm the term and what it covers. |
| Sell | Comparison: "None — no agent commissions", "Reduced — no listing-side fees", "No financing contingency", "No appraisal required", "Zero showings — sell privately", "No repairs needed" (table on desktop, cards on phones) | How a direct sale works. Not on the Fact Sheet. The earlier numbers ("3%–6%", "45–60+ days", "guaranteed cash") were already removed. |
| Sell | "No obligation. Every inquiry is read personally." under the form | "Every inquiry is read personally" is from the Fact Sheet; "No obligation" is not. |
| Portfolio | "Values shown are appraised home values, not construction costs." (prices are labelled "Home appraised at" on the Portfolio, Developers, Why Us and project pages) | A disclosure that depends on the real price data (item 11). Confirm each figure really is an appraised value; the portfolio data was recorded as sale prices. |
| Build | Pre-Construction phase (added back at the owner's request): "It starts with your lot and your plans. Before we break ground, we sit down with you, review the lot, and work with your architect so everyone knows the scope, the cost-plus approach, and the schedule before construction begins." Deliverables: lot and plan review, working with your architect, cost-plus agreement, construction schedule. No duration shown. | Drafted from Fact Sheet facts only (architect, cost-plus, construction-only timeline). Shay to confirm or replace the wording. |
| Project pages | Status and year on every project ("Sold 2024", "Sold October 2023", and "For Sale" on Glenrosa and Desert Cove), plus "Completed · 2024" in the hero | From the portfolio data (item 11). The two "For Sale" labels go stale if either home sells. |
| Project pages | ~~Full street addresses on three homes~~ **Removed.** hazelwood-2, 5th-st and larkspur now show an area only ("Arcadia, Phoenix", "Southwest Village, Scottsdale", "North Scottsdale"). | Private homes. Add a street back only if the owners agree. |
| Project page: Earll | "built by Milco Development" | Names another company. Confirm it is right to publish. |
| Portfolio cards | A year pill and a "Sold" pill exist in the page code but the photo covers them (checked: the photo is the top element at the pill's position), so nobody sees them today. Screen readers and search engines still read them. | They would show unverified years and sale status if the layering is ever fixed. |
| Home | The strip lists Stanford as "Coming soon" with no link; no project page exists for it | Confirm Stanford belongs in the strip. |
| Why Us | "our clients consistently tell us the experience is as good as the home itself"; "and clients who come back for the next one" | Claims about clients. The second sentence was added with the new first strip. The Google review from a client who built 9 homes supports repeat business, but neither line is on the Fact Sheet. |
| Developers | "A repeat-client track record." and "A record built on repeat partnerships." | Same. |
| Reviews | Five Google reviews with relative dates ("a year ago", "2 years ago", "3 years ago", "8 months ago"). One reads "completed on time, within budget" | The dates go stale and need real dates. The "on time, within budget" wording is the client's, not our promise. Names should match Google exactly. |
| Our Story | The founder note, written in Shay's first person ("Ella Lee Homes started with my daughter, Ella...") | Confirm Shay wrote or approved it. |
| Stories | Six articles dated between February and November 2025, bylined "Shay Segev, Founder" | Confirm Shay wrote or approved them. |
| Why Us | Price labels on the project strip (Via Estrella $5.45M, DC2 $4.4M, Earll $3.65M, Charter Oak $7.0M, 68th & Camelback $7.0M) | Taken from the portfolio data; they change with item 11. |

## 3. Judgment calls made during QA, beyond the 66 items

Each is easy to reverse. Say so and it goes back.

- **Small text on light backgrounds uses darker tints of the brand colours.** Nickel `#A5A09D` and gold `#BFA06A` measure about 2:1 on linen, which is hard to read. Small labels now use `#605C58` and `#6F5628` (4.5:1 or better); large gold headings on linen use `#8A6E3C` (3:1 or better). The navy, linen, gold and nickel on dark backgrounds are unchanged.
- **The header goes solid navy once you scroll on a phone.** It was transparent, so the logo and menu button sat on top of body text.
- **Accent words inside hero captions are Inter, not serif** ("clearly managed.", "legacy", "custom home", "final key."). They were a smaller serif inside a sans sentence.
- **Phone numbers never break across lines**; long captions and paragraphs avoid a single stranded word; two- and three-line headings break into even lines; the accent phrase in a hero caption stays on one line.
- **Keyboard focus is always visible:** a gold ring on the dark pages and a navy ring on the light article pages. Several fields and the Portfolio card links showed nothing when tabbed to.
- **Small fixes found by looking at every page at phone, tablet and desktop widths:** the Sell comparison now shows on phones (it was empty); the Client Portal "Need help?" block, article date row, Portfolio filter row and sort control fit on phones and tablets; the Portfolio grid has even gutters; project amenity icons are visible; the project page has one left margin and no gap above the photo on phones; two-column form fields line up; the Developers and Our Story stat rows no longer leave empty cells; the footer line "Experience the Ella Lee Homes difference." keeps the name together; on phones under 480px the Home "What working with us feels like" stages become a 2 x 2 grid ("Craftsmanship" was cut off at 360px) and the Home hero title fits a 320px screen.
- **Earlier QA passes (already pushed):** one body-copy standard (Inter Light 17px desktop, 16px phone); the standard hero on Privacy, Terms and Disclaimer; serif titles; favicon and app icon; the article pages on the same navy as the rest of the site; project pages with their own title, description, canonical and share tags; 16 placeholder amenity rows removed; image alt text and form labels fixed; the stale `our-story-print` page moved to `docs/archive/`.

## 4. How to re-check

`npm run build`, then `python3 scripts/qa.py` (needs Playwright with Chromium). It reads the built site and renders every page at 1440, 768 and 390px. Set `QA_FONTS_DIR` to a folder holding the Inter and DM Serif Display `woff2` files so layout checks use the real fonts (from `npm i @fontsource/inter @fontsource/dm-serif-display`, copy `inter-latin-{300,400,500}-normal.woff2` and `dm-serif-display-latin-400-{normal,italic}.woff2` out of each package's `files` folder). It writes `docs/qa-report.md`, `docs/asset-migration.md` and `docs/portfolio-data-for-rebecca.csv`, and exits non-zero on any failure.
