# Open questions

The only place open questions live. Each one names who can answer and what it unblocks. Older lists are in `docs/archive/`. Answers that change a fact go into `site-facts.json` or `docs/fact-sheet.md`.

The plan behind these is `docs/launch-plan.md`. The IDs (S1, R1, B1, L1) match it.

## Inputs the build reads (`site-facts.json`)

| Key | What it fills | Who | Until it is set |
|---|---|---|---|
| `sqftBuilt` | Footer, under the gold line, next to "40+ homes" (N3) | Shay (S1) | The footer shows no sq ft cell. Never a placeholder. |
| `buildertrendLoginUrl` | The Client Portal login button (N6) | Shay or Buildertrend (S2, B3) | The portal page shows no button. |
| `launchDate` | "Last updated" on Privacy, Terms and Disclaimer | Josh, on go-live day | The pages show `[launch date]` and `npm run check:launch` fails. |

## Shay

- **S1** Sq ft built: the figure, the basis (completed only, or completed plus in progress like "40+"), and an as-of date. [N3]
- **S2** The Buildertrend client login URL, the button label, and whether it may open in a new tab. [N6]
- **S3** Client Portal video: remove it, or replace it? If replaced, host it on this site (Fact Sheet) or YouTube (Privacy draft)? Someone has to watch the current one: it shows 480-938-4113, which is not in the code. The site no longer embeds it. [N7]
- **S4** Build timeline: the phase set and order (is Permitting back? is Design added to or replacing Pre-Construction?), the label ("Design" or "Design Phase"), the Design heading, paragraph and deliverables (architect-led), any durations besides construction, the lede, the hero lines and the meta text. Is "earlier style" the Sep 15 to 29 stair-step? Is an architect-led Design phase allowed under "never we design"? [N12]
- **S5** Reviews: how many to add; for each, the exact Google display name, verbatim text, stars, date and link (or OK to link the business profile), plus confirmation the reviewer is a client or homeowner. Keep Mike M's "on time, within budget"? How to handle Heather Wilson's em dash? Is Michael Wiss (an investor) a client? [45]
- **S6** Hero video: spec, delivery date, and is poster-only acceptable if it is late? [41]
- **S7** Why Us "See the craft for yourself": the new line and which home. [33]
- **S8** Our Story: the copy, photos, map size, the 22 pins under "40+", hand-drawn SVG or a Google Maps key, and what "original front page" means. [50]
- **S9** Menu: confirm the neutral dark bar that appears when the menu returns on scroll up (see Defaults below); should the phone menu hide too; hide after about 100px or only past the hero? [N13]
- **S10** Lines: is the "hero line" the 1px rule under the title; is the "footer line" only the gold one (not the legal-bar rule in the footer); keep or remove rules inside components (Developers stats, inventory and FAQ rows, Why Us signature and cards, Sell rows, table and FAQ, Our Story legend, project amenity rows, portfolio card specs); does it apply to Home too? [N11]
- **S11** Copy the Fact Sheet does not cover, and the Fact Sheet says to ask before writing: Contact hours; the two footer lines; "has led every build"; "a real number" and a line-item budget; "update it at every milestone"; "a realistic budget"; "one agreed builder's fee"; "designed to nurture"; the "Cost-engineered" photo description on Developers; "built by Milco Development"; "Investment Build" badges; off-market inventory; Code of Conduct promises; the "tour model homes" article; Sell chips, table and "additional communities throughout Arizona"; the title pattern ("Topic: keyword" versus the sheet's "Why Us | Custom Home Builder Paradise Valley"); where and in which browser the blank project-strip card appeared.
- **S12** Energy and smart-home: which page carries the one approved sentence (Developers carries it for now); keep the articles that discuss energy? Approve the Developers wording that replaced "cutting-edge" and "sustainable practices".
- **S13** Home H1: "Custom home builder in Arizona"? Today it reads "Custom Homes in Arizona, Built Right."
- **S14** Photos: is every photo a home Ella Lee Homes built? Check `uploads/home/shay.jpg`, three Zillow photos (5th St 2, Cudia City, Desert Cove), article images, the Earll "Milco Development" line, and the For Sale Desert Cove. Are Arroyo, Stanford and Osborn South completed?
- **S15** "Completed home value": sale price, appraisal or something else? Show a list price for for-sale homes? Which style (farmhouse or contemporary) for Mediterranean, Spanish, Estate and transitional homes?
- **S16** Project hero: do "two white lines" mean the rules or text? Do the year and Sold pills count as stat badges?
- **S17** Go-live date. Any analytics planned (Privacy section 2 must change first)? Does a written warranty document exist (the Disclaimer refers to one)? Keep welcoming AI crawlers in `robots.txt` (GPTBot, CCBot, Google-Extended and ten more)?

## Rebecca

Her sheet is `data/projects.csv`, written by `npm run projects:csv` with a `check` column that says what to look at on each row. Her answers go back in with `npm run projects:import` (`data/README.md`).

- **R1** The record for every house, in the CSV the build generates (`npm run projects:csv`), and which are the 26 completed and the 21 in progress.
- **R2** Sq ft definition (livable or total); Charter Oak baths (5 full and 2 half?); the real values for Charter Oak and 68th; the builder of each home.
- **R3** Main picture for each card and hero (high resolution; today 1024px), the style, and the Drive folder for each project.
- **R4** Market, neighborhood, year (completed or sold), and naming (Hazelwood in Scottsdale versus Hazelwood II in Arcadia); is the for-sale Desert Cove a third home?
- **R5** Originals and rights for the Zillow-only photos (5th St 2, Cudia City, Desert Cove).

## Buildertrend settings (Shay or the office)

- **B1** Set the contact form fields in this order: First name, Last name, Email, Phone (all required); I'm interested in (dropdown, required: Building a custom home / Selling my home or lot / Developer or investor project / General question); Property or lot address; Estimated budget (free text, not a dropdown); Do you already own a lot? (Yes / No / Still looking); Tell us about your project; How did you hear about us? Set the confirmation to "Thank you. We'll be in touch." and choose who is notified of new leads.
- **B2** Confirm the embed works from `ellaleehomes-kappa.vercel.app` and `ellaleehomes.com` (any domain restriction?) and whether `btClientContactForm.js` is safe to load async.
- **B3** The official client login URL (Buildertrend support 1-877-309-0368).
- **B4** After the test lead: confirm every field arrived, then delete it.
- **B5** Leads from Sell and Developers differ only by the "I'm interested in" dropdown; add fields (timeline to sell, property type) if those teams need them.

## Attorney (through Shay)

- **L1** Review the three drafts now on the Privacy, Terms and Disclaimer pages. They are the client's text word for word (checked by script), with links added to the Privacy and Warranty pages. Points the audit raises: the draft drops the Do-Not-Track disclosure; other states' privacy laws; browsewrap acceptance; indemnity, liability limit and venue; "we do not sell" next to Buildertrend; no retention period; the curated-reviews wording. Two bullets in Privacy section 3 no longer match what the site loads: "videos played through YouTube" (the portal walkthrough is gone) and "maps and map tiles from Google Maps, OpenStreetMap, and CARTO" (the Our Story map is a hand-drawn SVG). They were left as written because the text is approved wording. Decide whether to remove them, and restore the YouTube line if a replacement video is hosted there.

## Defaults applied while executing the plan

Where the plan left a choice, the work used its recommendation, never an invented fact. Each one is easy to reverse; the question number says who can overrule it.

**Menu and footer (S9, S10, S1)**
- The menu returns on scroll up as a neutral dark bar (grey, 82% opaque, blurred), not blue. It turns solid navy (`#001526`) only while Learn or the phone menu is open. Over a hero at the top of the page it is transparent; on the light article pages it is the dark bar from the top. All in `assets/site-nav.css`.
- It hides after 8px of scroll down and returns after 6px of scroll up, on phones as well as desktop, once the page has scrolled by more than the bar's own height.
- The menu collapses to the burger at 899px (was 767) so the centred links never collide with the logo or button.
- "Lines" means section-level dividers only. Removed: the Our Story pillar board rule, the Previous Projects size-band lines, the article "related" rule and the "Last updated" rule on the legal pages. Kept: the hero line, the gold footer line, the thin rule above the footer legal bar, and every line inside a card, row, table or form (S10).
- The footer shows "40+ homes", then "Sq ft built" once `sqftBuilt` is set in `site-facts.json`. Until then there is no cell.

**Wording (S5, S11, S12, S15, S16)**
- Em dashes were replaced by the punctuation that fits (colon, period, comma, parentheses) with every word kept. That includes Heather Wilson's review, which appears on four pages and now reads "warranty team, owning an Ella Lee home"; if her exact punctuation matters, say so (S5).
- Energy and smart-home: the one approved sentence ("We can build with energy-efficient systems and smart-home wiring when your plans call for them.") is on Developers, pillar 04. Every other mention was cut: Our Story's "sustainable materials, and energy-efficient solutions", Developers' "sustainable practices", "innovative, sustainable", "cutting-edge", and the energy and smart-home passages in three articles (one list item; market-context sentences, a smart-systems paragraph and four FAQ answers in the investment and luxury-essentials articles, also removed from their FAQ structured data) (S12).
- "Home appraised at $X" became "Completed home value $X" on Developers and Why Us, with the definition ("The value of the finished home, including the land. Not the construction cost.") once per page in small muted text (S15).
- Client updates read "photos and weekly updates" everywhere; the old "daily photos" in FAQ answers and their structured data was changed (S11).
- Every "Start your build" button goes to the Contact page. Sell keeps "Start the Conversation". "Get Started" and "Start Your Build" no longer appear.
- The construction range reads "11 to 18 months" in one form on Build, FAQ and their structured data.
- Developers hero is one line, "A repeat-client track record." The other hero line, "Serious builds, clearly managed.", became the heading above the four pillars so no words were lost (S16 asks what "two white lines" meant).
- Home FAQ uses the FAQ page's subhead (punch items N4 and 27). Its heading is unchanged.
- The project-page hero draws one line under the project name (N5, S16), and a missing or unknown project slug redirects to the portfolio instead of showing hidden "Project not found" text (58).

**Leads and legal (B1 to B4, S2, S3, L1)**
- The Contact page carries the Buildertrend embed on a linen panel with the phone and email above it as a fallback. The five other forms are gone. The portal page shows no button until `buildertrendLoginUrl` is set, and the walkthrough video and blank login embed are removed (S3 asks whether to replace the video).
- Privacy, Terms and Disclaimer carry the client's draft word for word, with links added and "Last updated" filled from `launchDate` (L1 lists the two bullets that no longer match the site).

**Behaviour (items 43, 44)**
- The Home project strip scrolls at 15.6 px per second (the speed it had on a 60 Hz screen, which is 53% above the original), and no longer runs faster on a 120 Hz screen. Its photos decode before it starts, which should end the blank card, but the blank card could not be reproduced here. Check on a phone and in Safari (S11).

**Not done on purpose**
- Vercel settings (production branch, domain, DNS) and the stale open pull requests are untouched. `docs/launch-checklist.md` has the cutover order.
- Nothing was written that is not on the Fact Sheet. Where a page carried a claim the sheet does not cover, it was left as it was and listed in S11.
