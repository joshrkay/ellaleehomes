# Punch list (live)

Source: the Merged Punch List re-checked October 2, 2026 (66 original items, 46 already done and removed). Item numbers are the original ones. This file is kept up to date as work lands on the branch; the archived Oct 1 list is in `docs/archive/`.

How to read the status:

- **Done** is in the code and checked by a script (`qa.py --static`, `qa:chrome`, or the build guards).
- **Done, check on screen** is in the code and was checked in a headless browser here, but only a person on staging can judge it (looks, touch, Safari).
- **Built, waiting on input** is ready; a fact or file from the named person finishes it.
- **Waiting** has nothing to build until the named person answers. The IDs (S1, R1, B1, L1) are in `docs/needs-confirmation.md`.

The plan behind the packages (WP0 to WP9) is `docs/launch-plan.md`. What still blocks launch, by ID: `npm run launch:report`.

## N. New requests from Shay (October 2)

| # | Request | Status | Where and how checked | Waiting on |
|---|---|---|---|---|
| N1 | Arrows to scroll the reviews | Done, check on screen | Home reviews strip: Previous and Next buttons, hidden until the strip overflows; keyboard, touch and reduced motion tested (`assets/home.js`) | none |
| N2 | Budget and property address in the contact form | Waiting | Fields are set inside Buildertrend (N16), not on the site | Shay or the office (B1) |
| N3 | Sq ft built under the footer's gold line | Built, waiting on input | Footer slot after "40+ homes", fed by `sqftBuilt` in `site-facts.json`; no cell while it is empty (`qa:chrome`) | Shay (S1) |
| N4 | Home FAQ wording | Done | Home FAQ uses the FAQ page's subhead | none |
| N5 | One white line in the project hero | Done, check on screen | One rule under the project name (`project.html`) | S16 asks what "two white lines" meant |
| N6 | Client Portal: a login button instead of the embed | Built, waiting on input | Button appears when `buildertrendLoginUrl` is set; the embed is gone. `check:launch` fails while it is empty | Shay or Buildertrend (S2, B3) |
| N7 | Portal video shows the wrong phone number | Done, decision open | The video and the blank login embed are removed from the page; the guard blocks the number | Shay: replace or leave out (S3) |
| N8 | Rebecca's records for every house, main pictures, style | In progress | Portfolio data pipeline (WP5): one data file, a validator and the sheet for Rebecca (`npm run projects:csv`). The records themselves are Rebecca's | Rebecca (R1 to R4) |
| N9 | Stray "25" after the portfolio hero | Done | The hidden result count that printed it is removed | none |
| N10 | Em dashes on 14 pages | Done | Removed from copy, titles, meta and structured data on every page. `check-copy` now fails the build on any em dash | none |
| N11 | No lines between sections on secondary pages | Done, check on screen | Section-level dividers removed on all 23 secondary pages; hero line and gold footer line kept (`qa:chrome` at 1324 and 390px). Lines inside cards, rows and tables remain | S10 asks whether those should go too |
| N12 | Build timeline back to the earlier style, with a design phase | Waiting | Cannot be built from the documents: needs the phases, the wording and an answer on "architect-led design" against the "never we design" rule. The Build page carries "11 to 18 months" in the meantime | Shay (S4) |
| N13 | Hide the menu on scroll down, show on scroll up, blue only when Learn is open | Done, check on screen | `data-elh-nav-state` on `<html>`; every page uses the same script and partial; checked on Home, an inner page and an article at 1440 and 390px, with keyboard and reduced motion (`qa:chrome`). Chromium only: please try Safari and a phone | S9 confirms the neutral dark bar |
| N14 | Centre the menu | Done | Link group is centred to 0px at 1024, 1324, 1440, 1920; burger from 899px (`qa:chrome`) | none |
| N15 | Buildertrend contact form in place of the site's forms | Built, waiting on input | One embed on Contact, on a linen panel; the five other forms are gone and every "Start your build" goes to Contact. `check-copy` blocks any form or iframe elsewhere | A test lead from staging (B4) |
| N16 | Fields set up in Buildertrend | Waiting | The exact order and options are in `docs/needs-confirmation.md` B1 | Shay or the office (B1, B2) |

## A. Blockers

| # | Request | Status | Where and how checked | Waiting on |
|---|---|---|---|---|
| 1 | Forms send nowhere | Done | Replaced by N15 | B4 |
| 2 | Buildertrend client login | Built, waiting on input | Replaced by N6 | S2, B3 |
| 4 | Placeholder text on legal pages | Done | Privacy, Terms and Disclaimer carry the approved draft word for word; the "template" notes are gone and `check-copy` blocks them | Attorney review (L1) |

## B. Facts and numbers

| # | Request | Status | Where and how checked | Waiting on |
|---|---|---|---|---|
| 9 | Three different build timelines | Done in part | One range, "11 to 18 months", on Build, FAQ and their structured data. The phase detail waits on N12 | Shay (S4) |
| 11 | Portfolio data copy-pasted ("5.2 BA", repeated prices and sizes) | In progress | The validator lists every case by name; the values are Rebecca's | Rebecca (R1, R2) |
| 13 | Charter Oak and 68th both $7,035,000 | Waiting | Flagged by the validator | Rebecca (R2) |
| 17 | Budget ranges do not match | Done | Ranges and dropdown removed from the site; the budget is a free-text Buildertrend field (N2) | none |

## D. Copy and wording

| # | Request | Status | Where and how checked | Waiting on |
|---|---|---|---|---|
| 27 | FAQ subhead | Done | FAQ page and Home | none |
| 33 | "See the craft for yourself" and the home it points to | Waiting | Line unchanged | Shay (S7) |

## E. Design and layout

| # | Request | Status | Where and how checked | Waiting on |
|---|---|---|---|---|
| 41 | New hero video | Waiting | Still the earlier drone video. Where the new file goes and the size limits are in `docs/media.md` | Shay (S6) |
| 43 | Project strip slightly faster | Done, check on screen | 15.6 px per second, the same on any screen refresh rate (it used to run twice as fast on 120 Hz) | none |
| 44 | Blank 68th card in the strip | Done, check on screen | All strip photos decode before the strip starts. The blank card could not be reproduced, so please look on a phone and in Safari | S11 asks where it appeared |
| 45 | More Google reviews | Waiting | A shared data file for the reviews is being added (WP8), so adding more will be one edit once they are confirmed | Shay (S5) |
| 50 | Our Story: dress it up, smaller map | Waiting | Needs the copy and photos | Shay (S8) |
| 53 | Developers like Why Us | Done, check on screen | Same strip, bordered sticky cards and no section lines; matched by measured styles and side-by-side shots | none |
| 57 | Nav text hard to read over bright sky | Done, check on screen | Stronger gradient on the project hero photo, not behind the header | none |
| 58 | Hidden "Project not found" text | Done | An unknown or missing project redirects to the portfolio; the text is gone | none |
| 61 | Footer stat badges | Done | Footer shows "40+ homes" and, once supplied, sq ft built (N3). `qa:chrome` checks all 24 footers | none |
| 62 | Photos and videos off the old site, Google Drive and Zillow | In progress | Tooling is built and tested in simulation (`docs/media.md`); it needs network access to the old site and Drive, then a run, then a commit. `check:assets` fails the launch build until it reaches zero. Zillow photos need Rebecca's originals | Network allowlist for this environment (or a machine with access); Rebecca for Zillow (R5) |

## G. Order of work from here

| Step | Status |
|---|---|
| 1. Buildertrend form on Contact, fields set, test lead | Built; fields and the test lead need Shay or the office (B1 to B4) |
| 2. Shay's new requests (section N) | Done except the ones waiting on input above |
| 3. Remaining open items: Disclaimer note, more reviews, project page nav and hidden text | Done except reviews (waiting on Shay) |
| 4. Rebecca's records and pictures | Pipeline built; waiting on her sheet (R1 to R5) |
| 5. Shay's items: hero video, Our Story copy, "See the craft" wording, sq ft figure | Waiting |
| 6. Move all photos and videos onto the site | Tooling ready; run once the hosts are reachable |
| 7. Fresh-eyes pass on staging, then DNS | `docs/launch-checklist.md` has the order |
