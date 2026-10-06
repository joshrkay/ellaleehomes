# Media: every image and video on this site

Fact Sheet section 6: at launch, every image and video is stored on the new site itself. Nothing loads from the old WordPress site, Google Drive or Zillow. When DNS moves, every `ellaleehomes.com/wp-content/...` URL stops working, so this has to finish first.

## Where things stand

Run `npm run check:assets` for the live count. At the start of the launch work (`f56504b`) it was 1,572 references to 1,438 unique URLs:

| Source | Unique | Used for |
|---|---|---|
| Old WordPress (`ellaleehomes.com/wp-content/uploads/`) | 853 images, 1 video | Project galleries, page heroes, article images, the home hero video |
| Google Drive (`lh3.googleusercontent.com/d/<ID>`) | 579 | Project galleries and six portfolio cards |
| Zillow (`photos.zillowstatic.com`) | 3 | One photo each for 5th St 2, Cudia City and Desert Cove |

92% of them sit in the project data block in `src/project.html`.

## The pipeline

`scripts/migrate-media.mjs` does it. Originals are a cache and are never committed; only the optimised files are.

```bash
node scripts/migrate-media.mjs --list       # counts, and the two manifests in scripts/
node scripts/migrate-media.mjs --download   # originals into uploads/wp/ and uploads/drive/ (gitignored)
npm i --no-save sharp                       # once; deliberately not a project dependency
node scripts/migrate-media.mjs --optimize   # -> uploads/w/ and uploads/d/, three widths each
node scripts/migrate-media.mjs --rewrite    # repoint a reference whenever its optimised file exists
npm run build && node scripts/migrate-media.mjs --verify   # strict asset gate
```

With no flag it runs all of them. It can be run again at any point: it skips what is done and only repoints a reference whose file exists, so a partial run never leaves a page pointing at nothing.

- **Hosts needed:** `ellaleehomes.com` and `lh3.googleusercontent.com`. This session's environment blocks them (Network access in the environment settings), so run it there once they are allowed, or on a machine with normal internet access and commit the result.
- **Drive:** the site already hot-links these files, so they are publicly readable and the tool fetches them by ID (up to 2200px). If a file is no longer shared, export it by hand as `uploads/drive/<ID>.<ext>`.
- **Rewriting** is relative in pages and scripts, and absolute (`https://ellaleehomes.com/...`) inside `<meta>` tags and JSON-LD, where a relative URL is invalid.

## Layout

| Path | What | Committed |
|---|---|---|
| `uploads/home/`, `uploads/*.jpg` | Photos placed by hand (homepage, heroes) | yes |
| `uploads/w/<year>/<month>/<name>.webp`, `-960.webp`, `-480.webp` | Optimised WordPress images | yes |
| `uploads/d/<ID>.webp`, `-960.webp`, `-480.webp` | Optimised Drive images | yes |
| `uploads/video/` | The home hero video and its poster, from Shay | yes |
| `uploads/wp/`, `uploads/drive/` | Originals, the cache the tool works from | no |

Only the optimised files are ever referenced from a page. The tool rewrites a reference only when the optimised file exists, and the originals sit in gitignored folders that Vercel never sees, so a page can never point at a file that is not deployed. `npm run check:assets` fails (in the strict launch build) on any reference to a missing local file.

## Sizes and budgets

Three widths on purpose, so each use has a file that fits it:

| Use | File | Width | Limit |
|---|---|---|---|
| Gallery, lightbox and heroes | `<name>.webp` | 1600 | 160 KB |
| Cards and tiles (portfolio, project, Developers, Why Us) | `<name>-960.webp` | 960 | 70 KB |
| Thumbnails (gallery strips, lists) | `<name>-480.webp` | 480 | 20 KB |
| Social share image | `assets/og-share.jpg` | 1200 x 630 | 150 KB |
| Home hero video | `uploads/video/` | 1080p H.264 with faststart, no audio, 10 to 20 s | 6 MB (also a 720p copy) |

Heroes use the 1600 file; there is no separate 2000 px hero, which would add weight for little gain. Revisit that if the final hero photos look soft on very large screens. The tool never enlarges a photo and encodes at the best quality that fits the budget (down to quality 58). Measured on the current 1024 px photos: 7 to 20 KB at 480, 22 to 64 KB at 960.

About 1,435 images at these sizes is roughly 240 MB in git (about 26 MB today), so curate to around 40 per home or accept 200 MB or more. GitHub caps a single file at 100 MB; Vercel plan limits and image quotas have not been checked.

Page markup should pick the size with `srcset`/`sizes` (cards and thumbnails use the `-960` and `-480` files); the project page gallery and lightbox are updated with the portfolio data work.

## What is not automated

- **The home hero video** (punch item 41) comes from Shay. Put it in `uploads/video/` with a 2000 px poster. If you use `<source>` children, fix the `getAttribute('src')` guard in `assets/home.js` or the video stays invisible. Serve the poster only under `prefers-reduced-motion` and on phones.
- **Zillow photos** need Rebecca's originals and the right to use them (question R5). The tool never fetches them.
- **Which photos to keep.** The project pages carry up to 120 photos each; the data pipeline decides what is published.
