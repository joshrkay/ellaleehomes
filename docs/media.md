# Media: every image and video on this site

Fact Sheet section 6: at launch, every image and video is stored on the new site itself. Nothing loads from the old WordPress site, Google Drive or Zillow. When DNS moves, every `ellaleehomes.com/wp-content/...` URL stops working, so this has to finish first.

## Where things stand

Run `npm run check:assets` for the live count. At the start of the launch work (`f56504b`) it was 1,572 references to 1,438 unique URLs:

| Source | Unique | Used for |
|---|---|---|
| Old WordPress (`ellaleehomes.com/wp-content/uploads/`) | 853 images, 1 video | Project galleries, page heroes, article images, the home hero video |
| Google Drive (`lh3.googleusercontent.com/d/<ID>`) | 579 | Project galleries and six portfolio cards |
| Zillow (`photos.zillowstatic.com`) | 3 | One photo each for 5th St 2, Cudia City and Desert Cove |

92% of them are the project photographs: the card, hero and gallery of every home, which live in `data/projects.json` (it fills the `PROJECTS` block in `src/project.html` and the cards on the portfolio page when the site is built; see `data/README.md`).

## The pipeline

`scripts/migrate-media.mjs` does it. Originals are a cache and are never committed; only the optimised files are.

```bash
node scripts/migrate-media.mjs --list       # counts, and the two manifests in scripts/
node scripts/migrate-media.mjs --download   # originals into uploads/wp/ and uploads/drive/ (gitignored)
npm i --no-save sharp                       # once; deliberately not a project dependency
node scripts/migrate-media.mjs --optimize   # -> uploads/w/ and uploads/d/, three widths each
node scripts/migrate-media.mjs --rewrite    # repoint a reference whenever all three optimised sizes exist
npm run build && node scripts/migrate-media.mjs --verify   # strict asset gate
```

With no flag it runs all of them. It can be run again at any point: it skips what is done and only repoints a reference whose three sizes all exist (the smaller two are written first and the full file last), so a run that stopped half way is redone and never leaves a page pointing at nothing.

- **Hosts needed:** `ellaleehomes.com` and `lh3.googleusercontent.com`. This session's environment blocks them (Network access in the environment settings), so run it there once they are allowed, or on a machine with normal internet access and commit the result.
- **Drive:** the site already hot-links these files, so they are publicly readable and the tool fetches them by ID (up to 2200px). If a file is no longer shared, export it by hand as `uploads/drive/<ID>.<ext>`.
- **Rewriting** is relative in pages and scripts, and absolute (`https://ellaleehomes.com/...`) inside `<meta>` tags and JSON-LD, where a relative URL is invalid. In `data/projects.json` every photograph is a plain JSON string and is always rewritten relative (`uploads/w/...`, `uploads/d/...`); the build turns a card photo into the full address the portfolio's ItemList JSON-LD needs, so run `npm run build` after a rewrite.

## Layout

| Path | What | Committed |
|---|---|---|
| `uploads/home/`, `uploads/*.jpg` | Photos placed by hand (homepage, heroes) | yes |
| `uploads/w/<year>/<month>/<name>.webp`, `-960.webp`, `-480.webp` | Optimised WordPress images | yes |
| `uploads/d/<ID>.webp`, `-960.webp`, `-480.webp` | Optimised Drive images | yes |
| `uploads/video/` | The home hero video and its poster, from Shay | yes |
| `uploads/wp/`, `uploads/drive/` | Originals, the cache the tool works from | no |

Only the optimised files are ever referenced from a page. The tool rewrites a reference only when all three optimised sizes exist, and the originals sit in gitignored folders that Vercel never sees, so a page can never point at a file that is not deployed. `npm run check:assets` fails (in the strict launch build) on any reference to a missing local file.

## Sizes and budgets

Three widths on purpose, so each use has a file that fits it:

| Use | File | Width | Limit |
|---|---|---|---|
| Gallery, lightbox and heroes | `<name>.webp` | 1600 | 160 KB |
| Cards and tiles (portfolio, project, Developers, Why Us) | `<name>-960.webp` | 960 | 70 KB |
| Thumbnails (gallery strips, lists) | `<name>-480.webp` | 480 | 20 KB |
| Social share image | `assets/og-share.jpg` | 1200 x 630 | 150 KB |
| Home hero video | `uploads/video/` | 1080p H.264 with faststart, no audio, 10 to 20 s | 6 MB (also a 720p copy) |

Heroes use the 1600 file; there is no separate 2000 px hero, which would add weight for little gain. Revisit that if the final hero photos look soft on very large screens. The tool never enlarges a photo and encodes at the best quality that fits the budget (down to quality 58, which is always tried last). Any file of the three that is still over its limit at 58 is listed at the end of the run, so the budgets are checked, not assumed. Measured on the current 1024 px photos: 7 to 20 KB at 480, 22 to 64 KB at 960.

About 1,435 images at these sizes is roughly 240 MB in git (about 26 MB today), so curate to around 40 per home or accept 200 MB or more. GitHub caps a single file at 100 MB; Vercel plan limits and image quotas have not been checked.

### Which size a page gets

`--rewrite` points every reference at the full file (`<name>.webp`), which is right for heroes and other full-width pictures. A picture that is not full width opts in to the smaller files with a marker on its `<img>`:

- `data-img="card"` for a card or tile in a grid (a third of the screen on a desktop, half on a tablet, all of it on a phone). The page gets the 960 file, with 480 and 960 offered through `srcset`.
- `data-img="half"` for a picture that fills about half the screen on a desktop (the pictures in the Developers and Why Us card stacks, the featured story). It offers 480, 960 and the full file.

At build time `scripts/lib/images.mjs` turns the marker into `src`, `srcset` and `sizes`, reading each file's real width from its header, and removes the marker. It only does this when the other sizes exist on disk, so until the migration has run the page is the page as written, and a half-finished migration cannot point a page at a missing file. The generated portfolio cards already carry `data-img="card"`; the related-project cards and the lightbox strip on the project page pick the `-960` and `-480` files in the page script. When you add a card image to a page by hand, add the marker.

## What is not automated

- **The home hero video** (punch item 41) comes from Shay. Put it in `uploads/video/` with a 2000 px poster. If you use `<source>` children, fix the `getAttribute('src')` guard in `assets/home.js` or the video stays invisible. Serve the poster only under `prefers-reduced-motion` and on phones.
- **Zillow photos** need Rebecca's originals and the right to use them (question R5). The tool never fetches them.
- **Which photos to keep.** The project pages carry up to 120 photos each; the data pipeline decides what is published.
