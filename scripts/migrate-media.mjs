#!/usr/bin/env node
/**
 * Moves the site's photography onto this site (punch item 62). Fact Sheet section 6:
 * "At launch, every image and video is stored on the new site itself. Nothing loads
 * from the old WordPress site, Google Drive, or Zillow."
 *
 * Where the images are today
 *   https://ellaleehomes.com/wp-content/uploads/...   old WordPress site; dies when DNS moves
 *   https://lh3.googleusercontent.com/d/<ID>          Google Drive; the link carries an ID, no filename
 *   https://photos.zillowstatic.com/...               Zillow listing photos; rights unconfirmed, never fetched here
 *
 * The pipeline. Originals are a cache and are never committed; only the optimised files are.
 *   --list      write scripts/wp-media-manifest.txt and scripts/drive-media-manifest.txt and print the state
 *   --download  fetch the originals (gitignored caches):
 *                 WordPress -> uploads/wp/<year>/<month>/<name>
 *                 Drive     -> uploads/drive/<ID>.<ext>, fetched by ID at up to 2200px; the site already
 *                              hot-links these files, so they are publicly readable. If a file is no longer
 *                              shared, export it by hand into uploads/drive/<ID>.<ext>
 *   --optimize  make the deployable files, each with a -480 thumbnail:
 *                 uploads/w/<year>/<month>/<name>.webp   from a WordPress original
 *                 uploads/d/<ID>.webp                    from a Drive original
 *               Needs sharp, which is not a project dependency: npm i --no-save sharp
 *   --rewrite   repoint a reference at its optimised file whenever that file exists. Relative in
 *               pages and scripts; absolute (https://ellaleehomes.com/...) inside <meta> tags and
 *               JSON-LD, where a relative URL is invalid
 *   --verify    run the asset gate (scripts/check-assets.mjs) in strict mode
 *   (no flag)   all five, in that order
 *
 * Rewriting only touches a reference whose optimised file exists, so a partial run cannot leave a
 * page pointing at nothing; run it again to pick up the rest. If a download is blocked where you
 * run this (an egress policy), fetch the files any way you like into the cache folders above and
 * run --optimize --rewrite --verify on their own. Hosts needed: ellaleehomes.com and lh3.googleusercontent.com.
 *
 * Videos are not handled here: the homepage hero video comes from Shay (punch item 41) and goes in
 * uploads/video/. Zillow photos need Rebecca's originals (open question R5).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://ellaleehomes.com';
const WP_PREFIX = `${ORIGIN}/wp-content/uploads/`;
const DRIVE_PREFIX = 'https://lh3.googleusercontent.com/d/';
const ZILLOW_PREFIX = 'https://photos.zillowstatic.com/';

const WP_CACHE = 'uploads/wp';
const DRIVE_CACHE = 'uploads/drive';
const WP_OUT = 'uploads/w';
const DRIVE_OUT = 'uploads/d';

const IMAGE_EXT = /\.(?:jpe?g|png|webp|gif)$/i;
const VIDEO_EXT = /\.(?:mp4|m4v|mov|webm)$/i;
// Sizes and quality budget (docs/media.md): full 1600w <= 150 KB, thumbnail 480w <= 12 KB.
const FULL_W = 1600;
const THUMB_W = 480;
const FULL_MAX = 150 * 1024;
const THUMB_MAX = 12 * 1024;

const CONCURRENCY = 6;
const RETRIES = 3;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const abs = (rel) => path.join(root, rel);
const exists = (rel) => fs.existsSync(abs(rel));

/** Files that can carry a media reference. */
function sourceFiles() {
  const out = [];
  for (const dir of ['src', 'partials']) {
    const d = abs(dir);
    if (!fs.existsSync(d)) continue;
    for (const n of fs.readdirSync(d)) if (n.endsWith('.html')) out.push(path.join(dir, n));
  }
  return out;
}

/** The three families of off-site URL, as one regex each. A URL ends at a quote, space, ) or backslash. */
const END = '[^"\'\\s)\\\\,]+';
const RX = {
  wp: new RegExp(esc(WP_PREFIX) + END, 'g'),
  drive: new RegExp(esc(DRIVE_PREFIX) + '[A-Za-z0-9_-]+', 'g'),
  zillow: new RegExp(esc(ZILLOW_PREFIX) + END, 'g'),
};

/** @returns {{kind: 'wp'|'drive', url: string, id: string, original: string|null, derived: string|null, files: Set<string>}[]} plus zillow/video lists */
function collect() {
  const items = new Map();
  const zillow = new Map();
  const videos = new Map();
  for (const rel of sourceFiles()) {
    const text = fs.readFileSync(abs(rel), 'utf8');
    for (const [url] of text.matchAll(RX.wp)) {
      const tail = url.slice(WP_PREFIX.length);
      if (!/^[\w.\-/]+$/.test(tail) || tail.includes('..')) continue; // refuse anything that could escape the folder
      if (VIDEO_EXT.test(tail)) {
        videos.set(url, (videos.get(url) || new Set()).add(rel));
        continue;
      }
      if (!IMAGE_EXT.test(tail)) continue;
      if (!items.has(url)) items.set(url, { kind: 'wp', url, id: tail, original: `${WP_CACHE}/${tail}`, derived: `${WP_OUT}/${tail.replace(IMAGE_EXT, '')}.webp`, files: new Set() });
      items.get(url).files.add(rel);
    }
    for (const [url] of text.matchAll(RX.drive)) {
      const id = url.slice(DRIVE_PREFIX.length);
      if (!items.has(url)) items.set(url, { kind: 'drive', url, id, original: null, derived: `${DRIVE_OUT}/${id}.webp`, files: new Set() });
      items.get(url).files.add(rel);
    }
    for (const [url] of text.matchAll(RX.zillow)) zillow.set(url, (zillow.get(url) || new Set()).add(rel));
  }
  // A Drive original is whatever file uploads/drive/<ID>.* the export produced.
  for (const it of items.values()) {
    if (it.kind !== 'drive') continue;
    const dir = abs(DRIVE_CACHE);
    const hit = fs.existsSync(dir) ? fs.readdirSync(dir).find((n) => n.startsWith(it.id + '.') && IMAGE_EXT.test(n)) : null;
    it.original = hit ? `${DRIVE_CACHE}/${hit}` : null;
  }
  const list = [...items.values()].sort((a, b) => a.url.localeCompare(b.url));
  return { list, zillow, videos };
}

function listState({ list, zillow, videos }) {
  const wp = list.filter((i) => i.kind === 'wp');
  const drive = list.filter((i) => i.kind === 'drive');
  fs.writeFileSync(abs('scripts/wp-media-manifest.txt'), wp.map((i) => i.url).join('\n') + '\n', 'utf8');
  fs.writeFileSync(abs('scripts/drive-media-manifest.txt'), drive.map((i) => i.id).join('\n') + '\n', 'utf8');
  const row = (label, items) => {
    const orig = items.filter((i) => i.original && exists(i.original)).length;
    const done = items.filter((i) => exists(i.derived)).length;
    console.log(`  ${label.padEnd(14)} ${String(items.length).padStart(5)} unique | originals cached ${String(orig).padStart(5)} | optimised ${String(done).padStart(5)}`);
  };
  console.log(`media references in ${sourceFiles().length} files:`);
  row('WordPress', wp);
  row('Google Drive', drive);
  console.log(`  Zillow         ${String(zillow.size).padStart(5)} unique | not fetched (rights unconfirmed, open question R5)`);
  console.log(`  videos         ${String(videos.size).padStart(5)} unique | not handled here (punch item 41, new hero video from Shay)`);
  console.log('manifests -> scripts/wp-media-manifest.txt, scripts/drive-media-manifest.txt');
}

/** Where a Drive download lands, from the response type. */
const DRIVE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

async function download({ list }) {
  const todo = list.filter((i) => !(i.original && exists(i.original)) && !exists(i.derived));
  if (!todo.length) return console.log('download: nothing to fetch');
  const nWp = todo.filter((i) => i.kind === 'wp').length;
  console.log(`download: fetching ${nWp} WordPress and ${todo.length - nWp} Drive original(s) into ${WP_CACHE}/ and ${DRIVE_CACHE}/`);
  const failures = [];
  let done = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let item; (item = queue.shift()); ) {
      let lastErr;
      for (let attempt = 1; attempt <= RETRIES; attempt++) {
        const base = item.kind === 'wp' ? abs(item.original) : abs(`${DRIVE_CACHE}/${item.id}`);
        const tmp = `${base}.part`;
        try {
          const res = await fetch(item.kind === 'drive' ? `${item.url}=s2200` : item.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          if (!res.body) throw new Error('no response body');
          let dest = base;
          if (item.kind === 'drive') {
            const ext = DRIVE_EXT[(res.headers.get('content-type') || '').split(';')[0].trim()];
            if (!ext) throw new Error(`not an image: ${res.headers.get('content-type')}`);
            dest = `${base}.${ext}`;
          }
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          // Stream to disk and move into place, so an interrupted run never leaves a half file.
          await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
          const got = fs.statSync(tmp).size;
          if (!got) throw new Error('empty response');
          const declared = Number(res.headers.get('content-length'));
          if (Number.isFinite(declared) && declared > 0 && got !== declared) throw new Error(`truncated: got ${got} of ${declared} bytes`);
          fs.renameSync(tmp, dest);
          lastErr = null;
          break;
        } catch (err) {
          fs.rmSync(tmp, { force: true });
          lastErr = err;
          if (attempt < RETRIES) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      }
      if (lastErr) failures.push({ url: item.url, err: String(lastErr.message || lastErr) });
      if (++done % 50 === 0) console.log(`  ${done}/${todo.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`download: ${todo.length - failures.length} ok, ${failures.length} failed`);
  for (const f of failures.slice(0, 20)) console.log('  FAIL', f.url, '-', f.err);
  if (failures.length) {
    console.log('Files that did not download keep pointing at their old host; rerun to retry them.');
    process.exitCode = 1; // a caller can tell a partial fetch from a complete one
  }
}

async function optimize({ list }) {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('optimize: sharp is not installed. Run `npm i --no-save sharp` (it is deliberately not a project dependency) and retry.');
    process.exitCode = 1;
    return;
  }
  const todo = list.filter((i) => i.original && exists(i.original) && !exists(i.derived));
  if (!todo.length) return console.log('optimize: nothing to do');
  console.log(`optimize: ${todo.length} original(s) -> ${WP_OUT}/ and ${DRIVE_OUT}/ (full ${FULL_W}w, thumbnail ${THUMB_W}w)`);

  /** Encode at the best quality that fits the budget (never below 58). */
  async function encode(src, width, max, start) {
    let buf;
    for (let q = start; q >= 58; q -= 6) {
      buf = await sharp(src).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: q, effort: 5 }).toBuffer();
      if (buf.length <= max) break;
    }
    return buf;
  }

  const over = [];
  let before = 0;
  let after = 0;
  let done = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let item; (item = queue.shift()); ) {
      try {
        const src = abs(item.original);
        const full = await encode(src, FULL_W, FULL_MAX, 76);
        const thumb = await encode(src, THUMB_W, THUMB_MAX, 70);
        const out = abs(item.derived);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, full);
        fs.writeFileSync(out.replace(/\.webp$/, `-${THUMB_W}.webp`), thumb);
        before += fs.statSync(src).size;
        after += full.length + thumb.length;
        if (full.length > FULL_MAX) over.push(`${item.derived} ${Math.round(full.length / 1024)} KB`);
      } catch (err) {
        console.log('  FAIL', item.original, '-', String(err.message || err));
        process.exitCode = 1;
      }
      if (++done % 50 === 0) console.log(`  ${done}/${todo.length}`);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(`optimize: ${done} done, ${(before / 1048576).toFixed(1)} MB of originals -> ${(after / 1048576).toFixed(1)} MB committed`);
  if (over.length) console.log(`optimize: ${over.length} file(s) still over the ${FULL_MAX / 1024} KB budget at the lowest quality:\n  ` + over.slice(0, 10).join('\n  '));
}

/**
 * Repoint references. Relative in pages and scripts (every page lives at the site root);
 * absolute inside <meta> tags and JSON-LD, where a relative URL is invalid.
 */
function rewriteText(text, ready) {
  const swap = (s, absolute) => {
    for (const [url, local] of ready) if (s.includes(url)) s = s.split(url).join(absolute ? `${ORIGIN}/${local}` : local);
    return s;
  };
  const special = /<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>|<meta\b[^>]*>/gi;
  const parts = [];
  let last = 0;
  let m;
  while ((m = special.exec(text))) {
    parts.push(swap(text.slice(last, m.index), false), swap(m[0], true));
    last = m.index + m[0].length;
  }
  parts.push(swap(text.slice(last), false));
  return parts.join('');
}

function rewrite({ list }) {
  const ready = new Map(list.filter((i) => exists(i.derived)).map((i) => [i.url, i.derived]));
  if (!ready.size) return console.log('rewrite: no optimised files yet, leaving references alone');
  let changedFiles = 0;
  let changedRefs = 0;
  for (const rel of sourceFiles()) {
    const before = fs.readFileSync(abs(rel), 'utf8');
    const after = rewriteText(before, ready);
    if (after !== before) {
      for (const url of ready.keys()) changedRefs += before.split(url).length - 1;
      fs.writeFileSync(abs(rel), after, 'utf8');
      changedFiles++;
    }
  }
  console.log(`rewrite: ${changedRefs} reference(s) repointed across ${changedFiles} file(s); ${list.length - ready.size} URL(s) still off-site`);
}

function verify() {
  // The asset gate looks at the built site, so build first (`npm run build`) when pages changed.
  const r = spawnSync(process.execPath, [abs('scripts/check-assets.mjs'), '--strict'], { stdio: 'inherit' });
  if (r.status !== 0) process.exitCode = 1;
}

const args = process.argv.slice(2);
const want = (f) => args.includes(f) || args.length === 0;
if (want('--list')) listState(collect());
if (want('--download')) await download(collect());
if (want('--optimize')) await optimize(collect());
if (want('--rewrite')) rewrite(collect());
if (want('--verify')) verify();
