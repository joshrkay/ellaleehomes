# Go-live checklist

Work through this in order on launch day. Each line says who does it and how to tell it is done. The reasoning is in `docs/launch-plan.md` (WP9). Open questions are in `docs/needs-confirmation.md`.

## 1. The site is ready

| Check | Who | Done when |
|---|---|---|
| Every fact is supplied: `sqftBuilt`, `buildertrendLoginUrl`, `launchDate` in `site-facts.json` | Josh, with Shay | `npm run launch:report` shows no F1, F2, F3 |
| Nothing loads from the old WordPress site, Google Drive or Zillow | Josh | `npm run check:assets` reports 0; see `docs/media.md` |
| Share images and canonicals are on the new site | Josh | no S1 or S2 in `npm run launch:report` |
| Rebecca's records are in and the portfolio data validates: every home has a farmhouse or contemporary style, whole or half baths, and no repeated value or size that she has not confirmed | Josh, with Rebecca | `npm run check:projects` shows no errors (class P in the launch report); read its warnings with her |
| Every review on the site is one a person has confirmed, with its date and link | Josh, with Shay | `npm run launch:report` lists no V blocker (the build's `reviews` line shows the same); `data/reviews.json` has `confirmed: true` only for real client or homeowner reviews |
| The legal pages carry the approved text and the launch date | Josh | no L1 or L2; attorney has reviewed (L1 in the open questions) |
| `ELH_LAUNCH=1 npm run build` is green | Josh | exit code 0 |
| A test lead reached Buildertrend from staging with every field, then was deleted | Shay or the office | lead seen in Buildertrend lead management |
| A fresh-eyes pass at 1440, 1324, 768, 390 and 320px, keyboard only, plus Safari on a phone | Josh, Shay | nothing found, or fixes merged |
| `npm run qa:chrome` passes (menu centred, hides and returns, no blue, no section lines, footer facts) | Josh | exit code 0 |

## 2. Release flow and Vercel

1. Decide the production branch. Today the default branch is the Vercel Production branch, so every merge is live. Recommended: create a protected `main` from the launch commit, make it the Production branch and the GitHub default, and keep working through pull requests with previews.
2. Set `ELH_LAUNCH=1` as a Vercel environment variable for Production (not `VERCEL_ENV`: staging is the Production environment today). The build now refuses to ship while any blocker remains.
3. Lower the DNS TTL on `ellaleehomes.com` a day ahead.
4. Add `ellaleehomes.com` and `www.ellaleehomes.com` to the Vercel project. Keep Deployment Protection on previews; custom domains are public.
5. Point DNS at Vercel. Keep the old WordPress host running until step 7 is done.

## 3. Redirects and search

1. Get the old WordPress sitemap (`/sitemap_index.xml` or `/wp-sitemap.xml`) and a Search Console export of indexed URLs. Nothing in this repo lists the old URLs; `scripts/wp-project-media.json` hints at 17 old project paths.
2. Add a 301 for every old URL that has no equivalent path to `vercel.json`. Check each on a preview before cutover.
3. Make Search Console verification survive the move: verify by DNS, or put the tag on every page (today it is only on Our Story and Client Portal).
4. Submit `https://ellaleehomes.com/sitemap.xml`. The sitemap currently omits the three photo-only project pages.
5. Decide `robots.txt`: it welcomes 13 named AI crawlers and disallows `/client-portal`, which hides that page's `noindex` from Google. Pick one for the portal.
6. Analytics: the Privacy text says there are none. Adding any (including Vercel Analytics) means the Privacy section 2 changes first.

## 4. After the switch

1. Open every page on `https://ellaleehomes.com` and check images, the Contact form and the portal button.
2. Send a test lead from the live domain; confirm it arrives in Buildertrend; delete it.
3. Watch 404s in Vercel and coverage in Search Console for two weeks.
4. Roll back if something is badly wrong: Vercel instant rollback to the previous deployment, or point DNS back to the old host.
