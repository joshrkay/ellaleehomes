/**
 * Picks the right size of a migrated photo for the place it is shown.
 *
 * scripts/migrate-media.mjs writes three files for every photo: <name>.webp (at most 1600 px wide),
 * <name>-960.webp and <name>-480.webp. A page marks an <img> that is not full width with
 * data-img="card" (a grid card or tile: a third of the screen on a desktop, half on a tablet, all of it on a
 * phone) or data-img="half" (a picture that fills about half the screen on a desktop). At build time this turns
 * such a tag into one with srcset and sizes, so the browser downloads the small file for a small place.
 *
 * An <img> with no data-img (heroes and other full-width pictures) keeps the 1600 px file.
 *
 * The marker never ships. It is removed from every tag, and a tag is left exactly as written unless its src is
 * a migrated photo and the other sizes exist on disk. So until the migration has run, the built page is the page
 * as written, byte for byte, and a half-finished migration cannot point a page at a file that is not there.
 */
import fs from 'node:fs';
import path from 'node:path';

/** What each role needs. `widths` are the sibling files to offer, `src` the one older browsers get. */
const ROLES = {
  card: { sizes: '(min-width: 1100px) 33vw, (min-width: 700px) 50vw, 100vw', siblings: [480, 960], includeFull: false, src: 960 },
  half: { sizes: '(min-width: 900px) 50vw, 100vw', siblings: [480, 960], includeFull: true, src: 'full' },
};

/** A migrated photo at its largest size: uploads/w/... or uploads/d/..., a .webp with no -960 or -480 ending. */
const MIGRATED = /^(uploads\/[wd]\/.+?)(?<!-960)(?<!-480)\.webp$/;

/** Lowest WebP quality the migration will use. */
export const MIN_QUALITY = 58;

/**
 * The qualities to try, best first: start, start - 6, ... and always the floor as the last one, so a photo that only
 * fits its size limit at the floor is not written over the limit just because the steps skipped it (74, 68, 62, 58).
 */
export function qualitySteps(start, floor = MIN_QUALITY) {
  const steps = [];
  for (let q = start; q > floor; q -= 6) steps.push(q);
  steps.push(floor);
  return steps;
}

/** Pixel width written in a WebP header (lossy, lossless or extended), or null when it cannot be read. */
export function webpWidth(buf) {
  if (!buf || buf.length < 30 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null;
  const kind = buf.toString('latin1', 12, 16);
  if (kind === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
  if (kind === 'VP8L') return (buf.readUInt32LE(21) & 0x3fff) + 1;
  if (kind === 'VP8X') return 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
  return null;
}

/** Width of a file in the site root, or null when it is missing or not a WebP. */
function widthOf(root, rel) {
  try {
    const fd = fs.openSync(path.join(root, rel), 'r');
    try {
      const head = Buffer.alloc(32);
      const n = fs.readSync(fd, head, 0, 32, 0);
      return webpWidth(head.subarray(0, n));
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

const MARK = /\sdata-img="(card|half)"/;

function upgrade(tag, root) {
  const role = MARK.exec(tag)?.[1];
  const bare = tag.replace(MARK, '');
  const src = /\ssrc="([^"]*)"/.exec(bare)?.[1];
  const m = src && MIGRATED.exec(src);
  if (!role || !m || /\ssrcset=/.test(bare)) return bare;
  const spec = ROLES[role];
  const candidates = [];
  for (const w of spec.siblings) candidates.push(`${m[1]}-${w}.webp`);
  if (spec.includeFull) candidates.push(src);
  // Every file has to exist and be readable, or the picture stays as it was written.
  const entries = [];
  for (const rel of candidates) {
    const w = widthOf(root, rel);
    if (!w) return bare;
    if (!entries.some((e) => e.w === w)) entries.push({ rel, w });
  }
  if (!spec.includeFull && !widthOf(root, src)) return bare;
  const best = spec.src === 'full' ? src : `${m[1]}-${spec.src}.webp`;
  const srcset = entries.sort((a, b) => a.w - b.w).map((e) => `${e.rel} ${e.w}w`).join(', ');
  return bare.replace(/(\ssrc=")[^"]*(")/, `$1${best}$2 srcset="${srcset}" sizes="${spec.sizes}"`);
}

/** Apply to a whole page. `root` is the repository root (the folder that holds uploads/). */
export function applyResponsiveImages(html, root) {
  return html.replace(/<img\b[^>]*>/g, (tag) => (MARK.test(tag) ? upgrade(tag, root) : tag));
}
