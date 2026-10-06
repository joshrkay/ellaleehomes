#!/usr/bin/env node
/**
 * Launch gate for punch-list item 62 / Fact Sheet section 6:
 * "At launch, every image and video is stored on the new site itself. Nothing loads
 *  from the old WordPress site, Google Drive, or Zillow."
 *
 * Zero dependencies, no network. Run after scripts/build-html.mjs; scripts/check-launch.mjs calls it.
 *
 *   node scripts/check-assets.mjs                 report mode (always exits 0): the state until launch
 *   node scripts/check-assets.mjs --strict        exit 1 on any violation: the launch gate
 *   ELH_LAUNCH=1 node scripts/check-assets.mjs    same (ELH_ASSET_GATE=strict also works)
 *   --summary      one line instead of the full report (used inside `npm run build`)
 *   --dir <path>   what to scan (default ../dist)      --json <file>   write the full finding list
 *   --budget       also report uploads/ size budget (see BUDGET) as warnings
 *
 * It scans the BUILT output (dist/), so partials are already merged. It looks at every place a URL can
 * hide: HTML attributes (src, srcset, poster, href, content, data-*, style), <style> and .css (url(), @import),
 * inline <script> and .js string literals (the project.html PROJECTS data block), and JSON-LD (parsed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const arg = (f, d) => (args.includes(f) ? args[args.indexOf(f) + 1] : d);
const here = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(arg('--dir', path.join(here, '..', 'dist')));
const STRICT = has('--strict') || process.env.ELH_ASSET_GATE === 'strict' || process.env.ELH_LAUNCH === '1';
const SUMMARY = has('--summary');
const JSON_OUT = arg('--json', '');

/* ---------------------------------------------------------------- policy */
const SELF_HOSTS = new Set(['ellaleehomes.com', 'www.ellaleehomes.com']);
// Anything under these paths on the live domain is the OLD WordPress site, never ours.
const WP_PATH = /^\/(?:wp-content|wp-includes|wp-json|wp-admin)\//i;

// Hosts that may be FETCHED by the page (scripts, styles, fonts, frames, images). `pages` limits where.
const LOAD_ALLOW = {
  'fonts.googleapis.com': { why: 'Google Fonts (named in the draft Privacy Policy)' },
  'fonts.gstatic.com': { why: 'Google Fonts files' },
  'buildertrend.net': { pages: ['contact'], why: 'Buildertrend contact form script + iframe (N15), Contact page only' },
  'maps.googleapis.com': { pages: ['our-story'], why: 'Google Maps script for the Our Story map (needs a key; draft Privacy Policy names Google Maps)' },
  'maps.gstatic.com': { pages: ['our-story'], why: 'Google Maps tiles/assets' },
};
// Hosts that may appear only as a link a visitor can click (never auto-loaded).
const LINK_ALLOW = [
  'www.google.com', 'maps.google.com', // review profile / map listing
  'www.facebook.com', 'www.instagram.com', 'www.youtube.com', // social profiles (youtube: channel link only, see below)
  'buildertrend.net', // client portal login button (N6)
  'www.aboutads.info', // opt-out link in the Privacy Policy
];
// Hosts that are identifiers, not fetches (xmlns, JSON-LD @context / sameAs).
const IDENT_ALLOW = ['www.w3.org', 'schema.org', 'c2pa.org', 'en.wikipedia.org'];

// Classes that are ALWAYS violations, named so the report lines up with the punch list.
const FORBIDDEN = [
  ['old-wordpress', (h, p) => SELF_HOSTS.has(h) && WP_PATH.test(p)],
  ['google-drive', (h) => h.endsWith('googleusercontent.com') || h === 'drive.google.com' || h === 'docs.google.com'],
  ['zillow', (h) => h.endsWith('zillowstatic.com') || h.endsWith('zillow.com')],
  ['video-embed', (h, p, ctx) => /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com|wistia\.com|loom\.com)$/.test(h) && (/\/embed\//.test(p) || ctx.tag === 'iframe' || ctx.kind === 'load')],
  ['external-media-file', (h, p) => !SELF_HOSTS.has(h) && h !== 'fonts.gstatic.com' && /\.(?:jpe?g|png|gif|webp|avif|svg|ico|mp4|m4v|mov|webm|ogv|mp3|woff2?|ttf|otf)$/i.test(p)],
];
const BUDGET = { imageBytes: 600 * 1024, videoBytes: 8 * 1024 * 1024, totalBytes: 200 * 1024 * 1024 };

/* ---------------------------------------------------------------- scanning */
const findings = []; // {file,line,kind,tag,attr,url,cls,sev}
const refsLocal = []; // {file,line,ref}

function walk(dir) {
  const out = [];
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, n.name);
    if (n.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const lineAt = (text, i) => text.slice(0, i).split('\n').length;
const pageOf = (rel) => path.basename(rel).replace(/\.html$/, '');

function classify(urlStr, ctx) {
  let u = urlStr.trim();
  if (!u || u.startsWith('#') || /^(?:mailto|tel|sms|javascript|data|blob):/i.test(u)) return null;
  if (u.startsWith('//')) u = 'https:' + u;
  if (!/^https?:\/\//i.test(u)) return { local: u.split(/[?#]/)[0] }; // relative or root-relative
  let url;
  try { url = new URL(u); } catch { return { cls: 'unparseable-url', sev: 'warn' }; }
  const host = url.hostname.toLowerCase();
  const p = url.pathname;
  for (const [cls, test] of FORBIDDEN) if (test(host, p, ctx)) return { cls, sev: 'error', host };
  if (SELF_HOSTS.has(host)) return { local: p.replace(/^\//, ''), self: true }; // own domain, not WordPress
  if (ctx.kind === 'load') {
    if (!LOAD_ALLOW[host]) return { cls: 'unlisted-host-load', sev: 'error', host };
    const pages = LOAD_ALLOW[host].pages;
    return !pages || pages.includes(ctx.page) ? null : { cls: 'allowed-host-wrong-page', sev: 'error', host };
  }
  // A plain link or identifier: anything on a short, named list is fine, anything else is flagged for a look.
  if (LOAD_ALLOW[host] || LINK_ALLOW.includes(host) || IDENT_ALLOW.includes(host)) return null;
  return { cls: 'unlisted-host-link', sev: 'warn', host };
}

function record(file, text, idx, kind, tag, attr, url) {
  const c = classify(url, { kind, tag, attr, page: pageOf(file) });
  if (!c) return;
  const line = lineAt(text, idx);
  if (c.local !== undefined) { refsLocal.push({ file, line, ref: c.local, kind }); return; }
  findings.push({ file, line, kind, tag, attr, url, cls: c.cls, sev: c.sev, host: c.host });
}

const LOAD_ATTRS = new Set(['src', 'srcset', 'imagesrcset', 'poster', 'data-src', 'data-srcset', 'data-poster', 'data-bg', 'data-background', 'data', 'xlink:href']);
const URL_IN_TEXT = /(?:https?:)?\/\/[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}(?::\d+)?(?:\/[^\s"'`<>)\\]*)?/g;
const LOCAL_IN_TEXT = /(?<![A-Za-z0-9_.:\/-])(?:\.{0,2}\/)?((?:uploads|assets)\/[^\s"'`<>)\\,]+)/g;
const MEDIA_EXT = /\.(?:jpe?g|png|gif|webp|avif|svg|ico|mp4|m4v|mov|webm)(?:[?#].*)?$/i;

function scanText(file, text, base, kind, tag) {
  for (const m of text.matchAll(URL_IN_TEXT)) {
    const raw = m[0].replace(/[.,;]+$/, '');
    // In free text / JS the kind is "load" when it looks like a media or script URL, otherwise "link".
    let k = kind;
    if (kind === 'js' || kind === 'css' || kind === 'text') {
      k = MEDIA_EXT.test(raw) || /googleusercontent|zillowstatic|\/wp-content\//i.test(raw) ? 'load' : 'link';
    }
    record(file, base.text, base.off + m.index, k, tag, '', raw);
  }
  for (const m of text.matchAll(LOCAL_IN_TEXT)) {
    refsLocal.push({ file, line: lineAt(base.text, base.off + m.index), ref: m[1].split(/[?#]/)[0].replace(/[.,;:]+$/, ''), kind });
  }
}

function jsonWalk(file, node, keyPath, ctxLine) {
  if (typeof node === 'string') {
    if (!/^(?:https?:)?\/\//i.test(node)) return;
    const key = keyPath[keyPath.length - 1] || '';
    const imageKey = /^(?:image|logo|thumbnailUrl|photo|contentUrl|primaryImageOfPage|embedUrl|thumbnail)$/i.test(key);
    const c = classify(node, { kind: imageKey ? 'load' : 'link', tag: 'ld+json', attr: key, page: pageOf(file) });
    if (!c) return;
    if (c.local !== undefined) { refsLocal.push({ file, line: ctxLine, ref: c.local, kind: 'jsonld' }); return; }
    findings.push({ file, line: ctxLine, kind: 'jsonld', tag: 'ld+json', attr: key, url: node, cls: c.cls, sev: c.sev, host: c.host });
  } else if (Array.isArray(node)) node.forEach((n) => jsonWalk(file, n, keyPath, ctxLine));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) jsonWalk(file, v, [...keyPath, k], ctxLine);
}

function scanHtml(file, text) {
  const tokens = /<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script\s*>|<style\b[^>]*>([\s\S]*?)<\/style\s*>|<([A-Za-z][A-Za-z0-9:-]*)((?:\s+[^<>]*?)?)\s*\/?>/gi;
  for (const m of text.matchAll(tokens)) {
    const tok = m[0];
    if (tok.startsWith('<!--')) continue; // comments are not loaded
    if (m[1] !== undefined) { // <script ...>body</script>
      const attrs = m[1];
      const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
      if (src) record(file, text, m.index, 'load', 'script', 'src', src[1] ?? src[2]);
      const body = m[2];
      const bodyOff = m.index + tok.indexOf('>') + 1;
      if (/ld\+json/i.test(attrs)) {
        try { jsonWalk(file, JSON.parse(body), [], lineAt(text, bodyOff)); } catch { findings.push({ file, line: lineAt(text, bodyOff), kind: 'jsonld', tag: 'script', attr: '', url: '(unparseable JSON-LD)', cls: 'unparseable-url', sev: 'warn' }); }
      } else if (body.trim()) scanText(file, body, { text, off: bodyOff, len: body.length }, 'js', 'script');
      continue;
    }
    if (m[3] !== undefined) { // <style>
      const off = m.index + tok.indexOf('>') + 1;
      scanCssText(file, m[3], text, off);
      continue;
    }
    const tag = m[4].toLowerCase();
    const attrText = m[5] || '';
    const attrs = {};
    for (const a of attrText.matchAll(/([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    const rel = (attrs.rel || '').toLowerCase();
    for (const [name, value] of Object.entries(attrs)) {
      if (name === 'style' && /url\(/i.test(value)) { scanCssText(file, value, text, m.index); continue; }
      if (name === 'srcset' || name === 'imagesrcset' || name === 'data-srcset') {
        for (const part of value.split(',')) { const u = part.trim().split(/\s+/)[0]; if (u) record(file, text, m.index, 'load', tag, name, u); }
        continue;
      }
      if (tag === 'meta' && name === 'content') {
        const prop = (attrs.property || attrs.name || '').toLowerCase();
        if (/image|thumbnail|tileimage|video|audio|player/.test(prop)) record(file, text, m.index, 'load', tag, prop, value);
        else if (/^(?:https?:)?\/\//.test(value)) record(file, text, m.index, 'link', tag, prop, value);
        continue;
      }
      if (tag === 'link' && name === 'href') {
        const loads = /stylesheet|preload|prefetch|modulepreload|icon|manifest|apple-touch/.test(rel);
        const pre = /preconnect|dns-prefetch/.test(rel);
        record(file, text, m.index, loads || pre ? 'load' : 'link', tag, 'href:' + rel, value);
        continue;
      }
      if (name === 'href' || name === 'action') { record(file, text, m.index, tag === 'a' || tag === 'area' || name === 'action' ? 'link' : 'load', tag, name, value); continue; }
      if (LOAD_ATTRS.has(name)) { record(file, text, m.index, 'load', tag, name, value); continue; }
      if (/^xmlns/.test(name)) continue;
      for (const u of value.matchAll(URL_IN_TEXT)) record(file, text, m.index, 'link', tag, name, u[0]);
    }
  }
}

function scanCssText(file, css, fullText, off) {
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)/gi)) record(file, fullText, off + m.index, 'load', 'css', 'url()', m[1]);
  for (const m of css.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/gi)) record(file, fullText, off + m.index, 'load', 'css', '@import', m[1]);
  for (const m of css.matchAll(LOCAL_IN_TEXT)) refsLocal.push({ file, line: lineAt(fullText, off + m.index), ref: m[1].split(/[?#]/)[0].replace(/[.,;:]+$/, ''), kind: 'css' });
}

/* ---------------------------------------------------------------- run */
if (!fs.existsSync(DIR)) { console.error(`check-assets: ${DIR} not found (run the build first)`); process.exit(2); }
const files = walk(DIR);
for (const f of files) {
  const rel = path.relative(DIR, f);
  if (/^uploads\//.test(rel)) continue; // media itself, budget-checked below
  const ext = path.extname(f).toLowerCase();
  if (!['.html', '.css', '.js', '.svg'].includes(ext)) continue;
  const text = fs.readFileSync(f, 'utf8');
  if (ext === '.html') scanHtml(rel, text);
  else if (ext === '.css') { scanCssText(rel, text, text, 0); }
  else scanText(rel, text, { text, off: 0, len: text.length }, ext === '.svg' ? 'text' : 'js', ext.slice(1));
}

// Local references must exist (this also covers the JS data blocks that will point at uploads/ after the migration).
const missing = [];
const seenLocal = new Set();
for (const r of refsLocal) {
  const key = r.ref;
  if (!/^(?:uploads|assets)\//.test(key)) continue;
  if (!fs.existsSync(path.join(DIR, key))) missing.push({ file: r.file, line: r.line, kind: r.kind, tag: '', attr: '', url: key, cls: 'missing-local-file', sev: 'error' });
  seenLocal.add(key);
}
findings.push(...missing);

// Budget (opt-in): keeps raw originals out of git and the deploy.
const budget = [];
if (has('--budget')) {
  let total = 0;
  for (const f of files) {
    const rel = path.relative(DIR, f);
    if (!/^uploads\//.test(rel)) continue;
    const size = fs.statSync(f).size; total += size;
    const isVideo = /\.(mp4|m4v|mov|webm)$/i.test(f);
    const isImage = /\.(jpe?g|png|webp|avif|gif)$/i.test(f);
    if (isVideo && size > BUDGET.videoBytes) budget.push({ file: rel, line: 0, kind: 'budget', tag: '', attr: '', url: `${(size / 1048576).toFixed(1)} MB video`, cls: 'over-budget', sev: 'warn' });
    if (isImage && size > BUDGET.imageBytes) budget.push({ file: rel, line: 0, kind: 'budget', tag: '', attr: '', url: `${Math.round(size / 1024)} KB image`, cls: 'over-budget', sev: 'warn' });
  }
  if (total > BUDGET.totalBytes) budget.push({ file: 'uploads/', line: 0, kind: 'budget', tag: '', attr: '', url: `${(total / 1048576).toFixed(0)} MB total`, cls: 'over-budget', sev: 'warn' });
  findings.push(...budget);
}

/* ---------------------------------------------------------------- report */
const byCls = new Map();
for (const f of findings) {
  if (!byCls.has(f.cls)) byCls.set(f.cls, { n: 0, uniq: new Set(), files: new Map(), sev: f.sev, kinds: new Map(), hosts: new Set() });
  const b = byCls.get(f.cls);
  b.n++; b.uniq.add(f.url); b.files.set(f.file, (b.files.get(f.file) || 0) + 1); b.kinds.set(f.kind + ':' + (f.tag || '') + ':' + (f.attr || ''), (b.kinds.get(f.kind + ':' + (f.tag || '') + ':' + (f.attr || '')) || 0) + 1);
  if (f.host) b.hosts.add(f.host);
}
const errors = findings.filter((f) => f.sev === 'error');
const warns = findings.filter((f) => f.sev === 'warn');
if (!SUMMARY) console.log(`check-assets: scanned ${files.length} files under ${DIR}`);
if (!SUMMARY) console.log(`mode: ${STRICT ? 'STRICT (launch gate)' : 'REPORT ONLY (exit 0)'}`);
for (const [cls, b] of SUMMARY ? [] : [...byCls].sort((a, b) => b[1].n - a[1].n)) {
  const top = [...b.files].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([f, n]) => `${f}:${n}`).join(', ');
  const where = [...b.kinds].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, n]) => `${k.replace(/:$/, '')}=${n}`).join(' ');
  console.log(`  ${b.sev.toUpperCase().padEnd(5)} ${cls.padEnd(24)} refs=${String(b.n).padStart(5)} unique=${String(b.uniq.size).padStart(5)}  ${where}`);
  console.log(`        top files: ${top}`);
}
console.log(`${SUMMARY ? 'check-assets (report): ' : 'totals: '}${errors.length} off-site or missing media reference(s) (${new Set(errors.map((e) => e.url)).size} unique URLs), ${warns.length} warning(s)${SUMMARY && errors.length ? '; run `npm run check:assets` for the list' : ''}`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(findings, null, 1));
if (errors.length && !SUMMARY) {
  const shown = errors.filter((e) => e.cls !== 'old-wordpress' && e.cls !== 'google-drive').slice(0, 12);
  for (const e of shown) console.log(`  ${e.cls}: ${e.file}:${e.line} ${e.tag}${e.attr ? '[' + e.attr + ']' : ''} ${e.url.slice(0, 110)}`);
}
if (errors.length && STRICT) { console.error('check-assets: FAILED. Nothing may load from the old WordPress site, Google Drive, Zillow or any unlisted host.'); process.exit(1); }
if (!SUMMARY) console.log(errors.length ? 'check-assets: violations found, report-only so the build continues' : 'check-assets: ok');
