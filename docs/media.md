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
node scripts/migrate-media.mjs --optimize   # -> uploads/w/ and uploads/d/, each with a -480 thumbnail
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
| `uploads/w/<year>/<month>/<name>.webp` and `-480.webp` | Optimised WordPress images | yes |
| `uploads/d/<ID>.webp` and `-480.webp` | Optimised Drive images | yes |
| `uploads/video/` | The home hero video and its poster, from Shay | yes |
| `uploads/wp/`, `uploads/drive/` | Originals, the cache the tool works from | no |

## Budgets

| Use | Size | Limit |
|---|---|---|
| Gallery / full | 1600 px wide WebP | 150 KB |
| Thumbnail | 480 px wide WebP | 12 KB |
| Project card | 800 px wide | 60 KB |
| Hero | 2000 px wide | 250 KB |
| Social share image | 1200 x 630 | 150 KB |
| Home hero video | 1080p H.264 with faststart, no audio, 10 to 20 s | 6 MB (also a 720p copy) |

The tool encodes at the best quality that fits the first two. About 1,435 images at these sizes is roughly 240 MB in git (about 26 MB today), so curate to around 40 per home or accept 200 MB or more. GitHub caps a single file at 100 MB; Vercel plan limits and image quotas have not been checked.

## What is not automated

- **The home hero video** (punch item 41) comes from Shay. Put it in `uploads/video/` with a 2000 px poster. If you use `<source>` children, fix the `getAttribute('src')` guard in `assets/home.js` or the video stays invisible. Serve the poster only under `prefers-reduced-motion` and on phones.
- **Zillow photos** need Rebecca's originals and the right to use them (question R5). The tool never fetches them.
- **Which photos to keep.** The project pages carry up to 120 photos each; the data pipeline decides what is published.
