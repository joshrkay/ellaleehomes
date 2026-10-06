# Data

Files the build reads. Edit the data here, not the pages: the pages only carry markers where generated markup goes.

## Portfolio

`projects.json` is the one place the site's homes are written down. The portfolio page, the project pages and the sitemap are built from it, so a figure is entered once and cannot drift. `projects.csv` is the same list as a sheet for Rebecca.

| File | What it is | Edit it? |
|---|---|---|
| `projects.json` | One object per project, 25 today. | Yes, by hand or through `npm run projects:import`. |
| `projects.csv` | Rebecca's sheet, written by `npm run projects:csv`. | No. Regenerate it. The build says when it is out of date. |

### How the build uses it

`npm run build` reads `projects.json` and fills the places marked in the two pages. The marker lines are replaced by the generated text, so none of them ships.

| Page | Marker | Generated |
|---|---|---|
| `src/previous-projects.html` | `@projects:itemlist` | `numberOfItems` and `itemListElement` of the ItemList JSON-LD |
| | `@projects:tabs` | the "All Homes" tab and the three size tabs, with their counts |
| | `@projects:cards` | the four bands, their "N homes" counts and every `.proj-card` |
| `src/project.html` | `@projects:data` | the `const PROJECTS = {...}` block the page script reads |
| `sitemap.xml` | (no marker) | one `project?slug=` URL per listed project |

The bands are `small` (up to 4,000 sqft), `mid` (4,000 to 6,000), `large` (6,000 and over) and `new` ("More projects"). The cards, the counts, the ItemList and the sitemap all come from the same sorted list, so they always agree. A project with `status: "photos-only"` gets the short "Details coming soon" card and stays out of the ItemList, the "All Homes" count and the sitemap.

The code is `scripts/lib/projects.mjs`. Edit the data, never a generated region. The build stops if a marker is missing, doubled or left over.

### Fields

A field with no value is `null` and renders as nothing, never as a placeholder.

| Field | Meaning | Who supplies it |
|---|---|---|
| `slug` | The page address, `project.html?slug=<slug>`. Lower-case kebab. Do not change one that is live: old links and the sitemap use it. | Developer |
| `name` | The name on the card, the page and the photo descriptions. Plain text. | Rebecca (R4) |
| `status` | `sold`, `for-sale`, `in-progress` or `photos-only`. | Rebecca (R1) |
| `statusLabel` | The words under the name on the project page ("Sold 2024"). The card's corner chip is not this: it follows `status` (Sold, For Sale, In Progress). | Developer |
| `market` | One of Paradise Valley, Scottsdale, Arcadia, Phoenix. Not shown yet. | Rebecca (R4) |
| `neighborhood` | Not shown yet. | Rebecca (R4) |
| `locationLabel` | The text under the name on the card and under the hero ("Scottsdale, Arizona"). The part before the first comma is also the ItemList's `addressLocality`. Photos-only homes print "Arizona" today; set it to `null` and the card drops the line. | Developer, from Rebecca's market and neighborhood |
| `year` | Year completed or sold (R4). Shown on the card and in the hero; the Sort menu uses it. | Rebecca (R4) |
| `value` | Completed home value in dollars: the value of the finished home, including the land, not the construction cost. What it measures (sale price, appraisal) is S15. | Rebecca (R2) |
| `valueLabel` | The text shown for it ("$7,035,000"). Must equal `value`; the importer keeps them together. | Derived |
| `sqft` | Floor area (livable or total is open: R2). Sets the band, the card's specs and the ItemList's `floorSize`. | Rebecca (R2) |
| `beds`, `baths` | Whole numbers; baths are whole or half (5, 5.5). | Rebecca (R2) |
| `builder` | Not shown yet. | Rebecca (R2) |
| `styleLabel` | The card's style words ("Modern Farmhouse"). | Rebecca (R3), Shay (S15) |
| `style` | `farmhouse` or `contemporary`. Required for every home that is not photos-only. See "Style" below. | Rebecca (R3), Shay (S15) |
| `band` | `small`, `mid`, `large` or `new`. Follows `sqft` ("up to 4,000", "under 6,000", else); `new` for photos-only. The importer keeps it in step. | Derived |
| `cardOrder` | Position in its band on the portfolio page, 1 first. This is the order on load; the Sort menu reorders after a click. | Developer |
| `featured` | `true` for the six cards on the Home "Our projects" strip. Why Us (5 tiles) and Developers (3 cards) pick their own homes by hand. | Developer |
| `photoFolder` | The Drive folder for the project's photos. Not used by the build. | Rebecca (R3) |
| `cardPhoto`, `heroPhoto` | A file under `uploads/` or one of the three remote hosts the media migration moves (`docs/media.md`). Both are the same photo today. | Rebecca (R3) |
| `gallery` | The photos, in page order. At least one. | Developer, from Rebecca's folder |
| `storyTitle`, `storyParas`, `amenities` | The text on the project page, as HTML snippets exactly as the page inserts them (`<em>` makes the gold words). `amenities` is a list of `[title, text]` pairs. Shay approves wording. | Developer, Shay |
| `card` | `{ field: value }`: only where the portfolio card shows something different from the project page. See "Disagreements". | Developer |

`name` is plain text; the build escapes it where it goes into HTML. The story and amenity strings are HTML and are not escaped.

#### Style

The portfolio's Style filter has two buttons. Today it shows a card under a button when the card's `styleLabel` contains the word "farmhouse" or "contemporary", and `style` records that same answer. A card whose label has neither word ("Modern", "Transitional", "Desert Estate") shows under neither button, so its `style` is `null` and the validator calls it an error until someone decides (S15). The page will read `style` instead of the label in phase B; until then, when `style` and the label disagree the validator warns.

### Adding or changing a project

1. Append an object to `projects.json`. Copy a photos-only entry (`osborn-south`) and keep the key order. The `slug` becomes the address, so choose it once.
2. Fill what is known. `status`, `band` (`new` while photos-only, otherwise from `sqft`) and `cardOrder` are needed to place the card.
3. `npm run check:projects` lists what is still missing, `npm run build` shows the result in `dist/`, and `npm run projects:csv` refreshes the sheet.
4. Four pages still repeat projects by hand and are not generated: the Home strip (`src/index.html`), Why Us "Recent homes", Developers "Investment inventory", and the Our Story map pins. The validator reads each and warns when a name, value, bed, bath or sqft disagrees, when a tile uses another project's photo, and when a portfolio project has no pin.

### Rebecca's sheet

```bash
npm run projects:csv                          # writes data/projects.csv
npm run projects:import -- returned.csv       # dry run: the checks and a field-by-field diff
npm run projects:import -- returned.csv --write
```

The columns are `slug, name, status, market, neighborhood, year_completed, beds, baths, sqft, completed_home_value, style, card_photo, hero_photo, photo_folder, builder, featured, check`. Numbers are plain digits. `status` is one of the four words above; `style` is farmhouse or contemporary; `featured` is yes or no. `check` is for reading: it says, row by row, what the validator would like checked ("same value as 68th St", "baths shown as 5.2: use a whole or half number"), and the import ignores it.

The import is careful on purpose:

- A blank cell changes nothing. Only a cell that says `CLEAR` empties a field.
- A slug it does not know, a repeated row, or a cell it cannot read (baths of "five", a status of "completed") stops it with the row, slug and column named. Nothing is written until the sheet is clean.
- It reads only the sheet's columns. Galleries, story text, amenities and the card labels are never touched.
- What follows from a change follows, and is listed as `derived`: the value's label, the size band, the status label. A sheet value that settles a card-versus-page disagreement drops that `card` override, so both show the answer.
- The diff ends with the validator's totals before and after, and the new problems, if any.

### Checks

`npm run check:projects` prints every error and warning; `npm run build` prints a one-line summary. Add `--strict`, or set `ELH_LAUNCH=1`, to exit 1 while an error remains. `npm run launch:report` lists each error as a `[P]` launch blocker.

- **Errors:** a required field is empty (for a home that is not photos-only: name, status, year, value, sqft, beds, baths, styleLabel, style, card and hero photo, one gallery photo; for a photos-only home: name, status, the two photos, one gallery photo), a slug that is not lower-case kebab or is used twice, a status, style or band outside its list, baths that are not whole or half, a `valueLabel` that disagrees with `value`, a local photo file that does not exist, a photo address the media migration does not know.
- **Warnings** (never fail a run): two homes with the same value or sqft; sqft outside 1,000 to 20,000, value outside 300,000 to 30,000,000, value per sqft outside 150 to 3,000, year outside 2015 to 2027, beds outside 1 to 12, baths above beds + 4; a style the card label does not back; a band that does not fit the sqft; and each hand-repeated fact on another page that disagrees, with its file and line.
- **Photos:** a local `uploads/` file must exist. A remote address is counted toward the media migration; `check-assets` (blocker M1) is what stops a launch while any remain.

### Disagreements to resolve

Nothing here was decided. The pages as they stood on 937be86 are reproduced exactly, and these are the places where they disagree with each other or with themselves. Each closes with Rebecca's answer (`docs/needs-confirmation.md`) or a decision.

**Portfolio card against project page** (kept as `card` overrides so the output is unchanged)

- `larkspur`, location: the project page says "North Scottsdale", the card says "85254, Scottsdale". The card's wording is also the ItemList's `addressLocality`, so Search sees "85254", a ZIP code. Closes with R4 (market and neighborhood).

Everything else on the cards (name, value, sqft, beds, baths, year, photo) matches the project page for all 22 homes.

**Figures that repeat or look copied** (the validator warns; R2)

- Value $7,035,000: `charter-oak` and `68th`.
- Value $3,200,000: `hazelwood-1` and `hazelwood-2`.
- Value $2,100,000: `5th-st` and `4th-st`.
- Sqft 4,650 with the same 5 beds and 7 baths: `earll` and `coolidge`.
- Sqft 5,578: `hazelwood-1` and `larkspur`.
- Baths 5.2 on `charter-oak`: is it 5 full and 2 half (6), or something else?

**Story and amenity text that contradicts the stat boxes** (as written on the pages; phase B)

- `41st`: the text says three-and-a-half baths, 3,326 sq ft livable and 4,606 total ("4606 sq ft" in amenities); the stats say 4.5 baths and 2,970 sqft.
- `4th-st`: amenities say "5.5 Bathrooms" and "5578 sq ft"; the stats say 5 baths and 4,691 sqft.
- `coolidge`: the text says three bedrooms, three-and-a-half baths, 4,153 sq ft livable and 5,578 total (amenities too); the stats say 5 beds, 7 baths and 4,650 sqft.
- `larkspur`: amenities say "4,153 sq ft livable" and "5,578 sq ft total"; the stats say 5,578 sqft. 4,153 is Hazelwood II's figure.
- `68th-2`: the text and amenities say six-and-a-half baths; the stats say 7.
- `hazelwood-2`: the amenity says "6 Bathrooms, 5 full + 1 half"; five full and one half is 5.5.
- `charter-oak`: the text says five full and two partial baths, the amenity says "5.2 Bathrooms" (the 5.2 above).

**Other pages that repeat a project by hand** (the validator reads them and warns)

- Home strip, `src/index.html`: calls `68th` "68th"; the data says "68th St". The Stanford card is not linked and says "Coming soon", though a Stanford page exists (photos only); `stanford` is flagged `featured` because the strip shows it.
- Our Story map, `src/our-story.html`: calls `5th-st-2` "5th St II"; the data says "5th St 2". Its place text for `desert-cove` is "North Scottsdale (85260)" and for `larkspur` "North Scottsdale (85254)"; the data says "Scottsdale, Arizona" and "North Scottsdale".
- Developers, `src/developers.html`: the Via Estrella card shows `0H0A0350.jpg`, which is Apache's photo.

**Names and meaning** (R4)

- Three records carry the Desert Cove name: `dc1` "Desert Cove" (Scottsdale, sold 2024), `dc2` "Desert Cove II" (Arcadia, sold 2023) and `desert-cove` "Desert Cove" (Scottsdale, for sale, 2025). Is the for-sale one a third home?
- `hazelwood-1` "Hazelwood" (Scottsdale) and `hazelwood-2` "Hazelwood II" (Arcadia): confirm the naming.
- `year`: completed or sold? `41st` is "Sold 2026".
- `earll`'s story says it was "built by Milco Development" (S14). `builder` stays blank until Rebecca answers R2.
- Both for-sale homes (`glenrosa`, `desert-cove`) show "Completed home value" with what looks like a list price (S15).

**Left blank because the pages do not say** (R4)

- `market` is blank for `41st` and `coolidge` ("Arcadia Lite, Phoenix": Arcadia or Phoenix?) and for the three photos-only homes ("Arizona"). The other 20 were read from the plain wording of the location text.
- `neighborhood`, `builder` and `photoFolder` are blank everywhere.
- `style` is `null` for nine homes whose card label has neither word: `68th`, `mitchell`, `earll`, `hazelwood-1`, `hazelwood-2`, `41st`, `4th-st`, `cudia`, `camino-sin-nombre` (S15).

### Phase A leftovers

Phase A reproduces the old pages byte for byte, so a few oddities are kept on purpose. Each is one line to remove in phase B.

- Five projects (`5th-st-2`, `camino-sin-nombre`, `cudia`, `desert-cove`, `glenrosa`) write their en dashes in `PROJECTS` as `–`; the other twenty write the character. `LEGACY_ASCII_ESCAPES` in `scripts/lib/projects.mjs` keeps that. Removing it changes five strings in `dist/project.html` and nothing a visitor sees.
- `src/previous-projects.html` still carries `<!-- @projectlist-schema -->` above the ItemList, and it still ships. It is an inert comment like the `@localbusiness-schema` ones the copy sweep deletes; deleting it changes `dist/previous-projects.html` by that one line.
- The "Similar Projects" cards on the project pages print `<first part of the location>, AZ`, so a photos-only home reads "Arizona, AZ" there today, and blanking its `locationLabel` would leave ", AZ". That line is in the project page's script, which phase A does not touch.
- The portfolio's Style filter still reads the card label, not `style`.
- The seeding script, `scripts/seed-projects.mjs`, is gone from the tree; it is in the history (commit "Portfolio data: seed data/projects.json from the pages").

## Reviews

`data/reviews.json` is the one source for the Google reviews on Home, Why Us, Developers and Our Story. It is a list, and its order is the order on the pages. Before this file, the same five reviews were hard-coded in all four pages, so any change had to be made four times.

### Add a review

1. Get what open question S5 (`docs/needs-confirmation.md`) asks for: the exact Google display name, the verbatim text, the stars, the date, the link to the review (or Shay's OK to link the business profile), and confirmation that the reviewer is a client or homeowner.
2. Copy an entry at the end of the list and fill it in.
3. Leave `"confirmed": false` until Shay has confirmed the reviewer. A person sets it to `true`; nothing in the build does. An unconfirmed review is never shown.
4. Run `npm run build`. It prints a `reviews (report)` line and one `[V...]` line for each problem or gap. To check only this file, run `node scripts/lib/reviews.mjs`; add `--strict` for the launch rules.
5. If the build says a review is not shown, the line says why. Fix it and build again.

`scripts/qa.py` reads this file. Its testimonial check (`FS4c`) accepts the five original reviews plus any review you have set `"confirmed": true`, and it fails a confirmed review that is not in the original five unless it has a `date` and a `url` (the Fact Sheet's rule for added reviews). Checks 51 and 53 expect as many cards as the file says.

### Fields

| Field | Required | What it holds |
|---|---|---|
| `id` | yes | A lowercase slug, unique in the file, such as `jane-d`. |
| `name` | yes | The reviewer's name exactly as Google shows it. |
| `initial` | yes | One or two characters for the round avatar. |
| `text` | yes | The review, verbatim, as plain text. Write `&`, never `&amp;`, and no HTML: the build escapes it. The same wording rules as the pages apply (`scripts/lib/copy-rules.mjs`), so no em dashes. |
| `stars` | yes | A whole number from 1 to 5. |
| `when` | no | The relative time shown after "Google review", for example `"8 months ago"`. It goes stale; leave it `null` to show "Google review" alone. |
| `date` | no | The review's date as `"2026-03-14"`, or `null` while unknown. Kept for later; the cards do not show it yet. |
| `url` | no | The link to the review on Google, or `null`. A card with no `url` links to the business's Google page, as every card does today. A host other than `www.google.com` or `maps.google.com` shows as a warning in `npm run check:assets`. |
| `pages` | yes | Where it shows: any of `"home"`, `"why-us"`, `"developers"`, `"our-story"`. |
| `confirmed` | yes | `true` to show it, `false` to hold it back. |

A draft with `"confirmed": false` still has to be valid. An unknown field is an error, so a typo such as `"confirm"` cannot silently hold a review back.

### What the build says

The build checks the file once and prints it in the style of `npm run launch:report`, under class V. Nothing here fails a normal build except V0. A review with a V1 or V2 problem is left off the pages, so broken or banned wording never ships. On the go-live deploy (`ELH_LAUNCH=1`, or `--strict`) any blocker also fails the build. Warnings are the known gaps and never fail it.

| Code | Meaning | Kind |
|---|---|---|
| V0 | The file is missing, is not valid JSON, or is not a list. | Always stops the build |
| V1 | A required field is missing or a field is wrong (also a repeated `id`, an unknown field or page). The review is not shown. | Blocker |
| V2 | The text breaks the copy guard (the same regexes as `scripts/check-copy.mjs`). The review is not shown. | Blocker |
| V3 | Not shown, because `confirmed` is not `true` (S5). | Warning |
| V4 | Some shown reviews have no date or link yet (S5). | Warning |
| V5 | A page would show no reviews. | Blocker |

### Where the cards are made

`scripts/lib/reviews.mjs` renders the cards. A page marks where its cards go with a marker pair, each on its own line:

```html
<!-- @reviews:rv -->
<!-- /@reviews:rv -->
```

Leave the space between the markers empty: the build fills it and removes both markers. The name picks the markup. `home` is the inline-styled card in the Home strip, `rv` is the card on Why Us and Developers, and `rv-reveal` is the same card with the scroll-reveal classes that Our Story uses. The Home strip's wrapper and arrow buttons, and each page's "Read all of our reviews on Google" link, stay in the page.
