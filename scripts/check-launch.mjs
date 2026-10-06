#!/usr/bin/env node
/**
 * Go-live gate. Reads dist/ after `npm run build`, plus site-facts.json and vercel.json. Writes nothing.
 *
 *   node scripts/check-launch.mjs             report mode: lists what still blocks launch, exits 0
 *   node scripts/check-launch.mjs --strict    exit 1 while any blocker remains
 *   ELH_LAUNCH=1 npm run build                same as --strict, inside the build (set it on the go-live deploy)
 *   --summary                                 one line instead of the list (used inside `npm run build`)
 *
 * Blocker classes: F facts not supplied, L legal pages, S share image and indexing, M media on the new site,
 * P portfolio data (the errors scripts/validate-projects.mjs finds in data/projects.json).
 *
 * Until launch the site is allowed to be incomplete, so the build only reports. On go-live day set
 * ELH_LAUNCH=1 (a Vercel environment variable, not VERCEL_ENV: staging is the Production environment)
 * and the build refuses to ship while any blocker below remains.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadProjects, ProjectsError } from './lib/projects.mjs';
import { validateProjects, errorsOf } from './lib/projects-validate.mjs';

const args = process.argv.slice(2);
const STRICT = args.includes('--strict') || process.env.ELH_LAUNCH === '1';
const SUMMARY = args.includes('--summary');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

if (!fs.existsSync(dist)) {
  console.error('check-launch: dist/ not found. Run `npm run build` first.');
  process.exit(2);
}

const pages = fs.readdirSync(dist).filter((f) => f.endsWith('.html'));
const read = (f) => fs.readFileSync(path.join(dist, f), 'utf8');
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

/** @type {{id: string, title: string, detail: string}[]} */
const blockers = [];
const note = (id, title, detail = '') => blockers.push({ id, title, detail });

// F: facts the site cannot invent. null in site-facts.json means "not supplied yet".
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
const FACTS = {
  sqftBuilt: [/^\d{1,3}(,\d{3})+\+?$/, 'F1', 'Sq ft built (N3): Shay supplies the figure, written like 1,250,000+'],
  buildertrendLoginUrl: [/^https:\/\/\S+$/, 'F2', 'Buildertrend client login URL (N6): from Shay or Buildertrend support'],
  launchDate: [new RegExp(`^(${MONTHS}) \\d{1,2}, 20\\d\\d$`), 'F3', 'Go-live date: replaces [launch date] on Privacy, Terms and Disclaimer, written like October 21, 2026'],
};
let facts = {};
try {
  facts = JSON.parse(fs.readFileSync(path.join(root, 'site-facts.json'), 'utf8'));
} catch {
  note('F0', 'site-facts.json is missing or not valid JSON');
}
for (const [key, [rx, id, title]] of Object.entries(FACTS)) {
  const v = facts[key];
  if (v == null || v === '') note(id, title, `${key} is not set in site-facts.json`);
  else if (!rx.test(String(v))) note(id, title, `${key} "${v}" is not in the expected format`);
}

// L: legal pages must be the approved text, dated, with no draft or template notes left.
for (const f of ['privacy.html', 'terms.html', 'disclaimer.html']) {
  if (!pages.includes(f)) continue;
  const t = stripComments(read(f));
  if (/\[launch date\]/i.test(t)) note('L1', 'Unfilled [launch date]', f);
  if (/general template|not legal advice|reviewed by counsel|For Josh|For Shay|Claude is not a lawyer/i.test(t)) note('L2', 'Draft or template note on a legal page', f);
}

// S: share image and canonical hygiene, indexing.
for (const f of pages) {
  const t = read(f);
  const og = (t.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
  if (!og || !/^https:\/\/ellaleehomes\.com\/(assets|uploads)\//.test(og)) note('S1', 'og:image is not a file on the new site', `${f}: ${og}`);
  const canon = (t.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const ogu = (t.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];
  if (canon && ogu && canon !== ogu) note('S2', 'og:url differs from canonical', `${f}: ${ogu}`);
  if (/<meta name="robots" content="[^"]*noindex/i.test(t) && f !== 'client-portal.html') note('S3', 'noindex on an indexable page', f);
}
try {
  const vj = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  for (const h of vj.headers || []) {
    const isRobots = (h.headers || []).some((x) => /x-robots-tag/i.test(x.key));
    if (isRobots && !(h.has || []).some((c) => c.type === 'host')) note('S4', 'Unconditional X-Robots-Tag in vercel.json', JSON.stringify(h).slice(0, 120));
  }
} catch {
  note('S4', 'vercel.json is missing or not valid JSON');
}
const robots = fs.existsSync(path.join(dist, 'robots.txt')) ? fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8') : '';
if (/^\s*Disallow:\s*\/\s*$/m.test(robots)) note('S5', 'robots.txt blocks the whole site', 'Disallow: /');
if (!/^Sitemap:\s*https:\/\/ellaleehomes\.com\/sitemap\.xml/m.test(robots)) note('S6', 'robots.txt has no production Sitemap line');

// M: media must live on the new site (punch item 62): delegated to check-assets.
const assets = spawnSync(process.execPath, [path.join(root, 'scripts', 'check-assets.mjs'), '--summary', '--strict'], { encoding: 'utf8' });
const assetsLine = (assets.stdout || '').trim().split('\n').pop() || '';
if (assets.status !== 0) note('M1', 'Off-site or missing media (punch item 62)', assetsLine);

// P: the portfolio data (data/projects.json). One line per error; warnings are advice and never block
// (`npm run check:projects` lists both). Each project is one line, so a cleared record clears its line.
try {
  for (const f of errorsOf(validateProjects(loadProjects()).findings).sort((a, b) => a.code.localeCompare(b.code))) note(f.code, `${f.slug ?? 'data'}.${f.field}: ${f.message}`);
} catch (err) {
  if (!(err instanceof ProjectsError)) throw err;
  note('P0', 'data/projects.json is missing or not valid', err.message);
}

// Report.
const label = STRICT ? 'STRICT' : 'report';
if (SUMMARY) {
  const ids = [...new Set(blockers.map((b) => b.id))].join(' ');
  console.log(`check-launch (${label}): ${blockers.length} launch blocker(s)${ids ? ` [${ids}]` : ''}${blockers.length && !STRICT ? '; run `npm run launch:report` for the list' : ''}`);
  if (assetsLine && !STRICT) console.log(assetsLine);
} else {
  console.log(`check-launch (${label}, ${pages.length} pages): ${blockers.length} launch blocker(s)`);
  const seen = new Set();
  for (const b of blockers) {
    const key = `${b.id}|${b.title}`;
    const same = blockers.filter((x) => `${x.id}|${x.title}` === key);
    if (seen.has(key)) continue;
    seen.add(key);
    const detail = same.length > 1 ? `${same.length} places, e.g. ${same[0].detail}` : b.detail;
    console.log(`  [${b.id}] ${b.title}${detail ? `: ${detail}` : ''}`);
  }
}
if (STRICT && blockers.length) {
  console.error('check-launch: FAILED. Clear every blocker above before the go-live deploy.');
  process.exit(1);
}
