# Data

Files the build reads. Edit the data here, not the pages: the pages only carry markers where generated markup goes.

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
