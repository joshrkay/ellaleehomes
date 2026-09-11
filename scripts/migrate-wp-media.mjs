/**
 * Moves the site's photography off the WordPress host and into this repo.
 *
 * Every page still points at https://ellaleehomes.com/wp-content/uploads/...,
 * which resolves today only because that domain still serves WordPress. Once it
 * points at this deployment those URLs hit a site with no /wp-content, and the
 * photography disappears. This script copies the files in and repoints the
 * references at them.
 *
 *   node scripts/migrate-wp-media.mjs --list       print the manifest, write manifest file
 *   node scripts/migrate-wp-media.mjs --download   fetch what's missing into uploads/wp/
 *   node scripts/migrate-wp-media.mjs --rewrite    repoint references at the local copies
 *   node scripts/migrate-wp-media.mjs --verify     check no remote refs and no missing files
 *   node scripts/migrate-wp-media.mjs              all four, in that order
 *
 * Rewriting only ever touches a reference whose file is already on disk, so an
 * interrupted or partial download cannot leave a page pointing at nothing. Run
 * it again to pick up the rest.
 *
 * If a download is blocked where you run this (a corporate proxy, an egress
 * policy), fetch the files any way you like into uploads/wp/<year>/<month>/ and
 * run --rewrite --verify on their own.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA_HOST = 'https://ellaleehomes.com';
const REMOTE_PREFIX = `${MEDIA_HOST}/wp-content/uploads/`;
const LOCAL_DIR = 'uploads/wp'; // pages all live at the site root, so this is also the href

const CONCURRENCY = 6;
const RETRIES = 3;

/** Files that can carry a media reference. */
function sourceFiles() {
  const out = [];
  for (const dir of ['src', 'partials']) {
    const d = path.join(root, dir);
    if (!fs.existsSync(d)) continue;
    for (const n of fs.readdirSync(d)) {
      if (n.endsWith('.html')) out.push(path.join(dir, n));
    }
  }
  const mediaJson = path.join('scripts', 'wp-project-media.json');
  if (fs.existsSync(path.join(root, mediaJson))) out.push(mediaJson);
  return out;
}

/** `.../uploads/2025/02/x.jpg` -> `uploads/wp/2025/02/x.jpg` */
function localPathFor(url) {
  const tail = url.slice(REMOTE_PREFIX.length);
  // Refuse anything that would escape the media directory.
  if (!/^[\w.\-/]+$/.test(tail) || tail.includes('..')) return null;
  return `${LOCAL_DIR}/${tail}`;
}

function collect() {
  // Stop at a quote, whitespace, backslash or a closing paren so the match ends
  // with the URL whether it sits in an attribute, a CSS url() or JSON.
  const re = new RegExp(REMOTE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\'\\s)\\\\]+', 'g');
  const byUrl = new Map();
  for (const rel of sourceFiles()) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const [url] of text.matchAll(re)) {
      if (!byUrl.has(url)) byUrl.set(url, { url, local: localPathFor(url), files: new Set() });
      byUrl.get(url).files.add(rel);
    }
  }
  return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}

function list(items) {
  const skipped = items.filter((i) => !i.local);
  const manifest = path.join(root, 'scripts', 'wp-media-manifest.txt');
  fs.writeFileSync(manifest, items.map((i) => i.url).join('\n') + '\n', 'utf8');
  const present = items.filter((i) => i.local && fs.existsSync(path.join(root, i.local))).length;
  console.log(`${items.length} distinct media URLs across ${sourceFiles().length} files`);
  console.log(`  already local : ${present}`);
  console.log(`  still remote  : ${items.length - present - skipped.length}`);
  if (skipped.length) {
    console.log(`  unsafe paths  : ${skipped.length} (skipped)`);
    for (const s of skipped.slice(0, 5)) console.log('    ', s.url);
  }
  console.log(`manifest -> ${path.relative(root, manifest)}`);
}

async function download(items) {
  const todo = items.filter((i) => i.local && !fs.existsSync(path.join(root, i.local)));
  if (!todo.length) return console.log('download: everything is already local');
  console.log(`download: fetching ${todo.length} file(s) into ${LOCAL_DIR}/`);

  const failures = [];
  let done = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let item; (item = queue.shift()); ) {
      let lastErr;
      for (let attempt = 1; attempt <= RETRIES; attempt++) {
        try {
          const res = await fetch(item.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          if (!buf.length) throw new Error('empty response');
          const dest = path.join(root, item.local);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          // Write beside the target and move, so an interrupted run never
          // leaves a half-written file that later looks downloaded.
          const tmp = `${dest}.part`;
          fs.writeFileSync(tmp, buf);
          fs.renameSync(tmp, dest);
          lastErr = null;
          break;
        } catch (err) {
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
  if (failures.length > 20) console.log(`  ...and ${failures.length - 20} more`);
  if (failures.length) {
    console.log('Files that did not download keep pointing at WordPress; rerun to retry them.');
  }
}

function rewrite(items) {
  // Only repoint a reference whose file actually exists, so a partial download
  // can't strand a page on a URL that resolves nowhere.
  const ready = new Map();
  for (const i of items) {
    if (i.local && fs.existsSync(path.join(root, i.local))) ready.set(i.url, i.local);
  }
  if (!ready.size) return console.log('rewrite: nothing downloaded yet, leaving references alone');

  let changedFiles = 0;
  let changedRefs = 0;
  for (const rel of sourceFiles()) {
    const p = path.join(root, rel);
    const before = fs.readFileSync(p, 'utf8');
    let after = before;
    for (const [url, local] of ready) {
      if (!after.includes(url)) continue;
      changedRefs += after.split(url).length - 1;
      after = after.split(url).join(local);
    }
    if (after !== before) {
      fs.writeFileSync(p, after, 'utf8');
      changedFiles++;
    }
  }
  const left = items.length - ready.size;
  console.log(`rewrite: ${changedRefs} reference(s) repointed across ${changedFiles} file(s)`);
  if (left) console.log(`rewrite: ${left} URL(s) still remote because the file isn't local yet`);
}

function verify() {
  let remote = 0;
  let missing = 0;
  for (const rel of sourceFiles()) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    const stillRemote = [...text.matchAll(new RegExp(REMOTE_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^"\'\\s)\\\\]+', 'g'))];
    if (stillRemote.length) {
      remote += stillRemote.length;
      console.log(`  ${rel}: ${stillRemote.length} reference(s) still on ${MEDIA_HOST}`);
    }
    for (const [ref] of text.matchAll(new RegExp(`${LOCAL_DIR}/[\\w.\\-/]+`, 'g'))) {
      if (!fs.existsSync(path.join(root, ref))) {
        missing++;
        if (missing <= 10) console.log(`  ${rel}: missing file ${ref}`);
      }
    }
  }
  if (remote || missing) {
    console.log(`verify: FAILED — ${remote} remote reference(s), ${missing} missing file(s)`);
    process.exitCode = 1;
  } else {
    console.log('verify: OK — no WordPress references, every local file present');
  }
}

const args = process.argv.slice(2);
const want = (f) => args.includes(f) || args.length === 0;
const items = collect();

if (want('--list')) list(items);
if (want('--download')) await download(items);
if (want('--rewrite')) rewrite(collect());
if (want('--verify')) verify();
