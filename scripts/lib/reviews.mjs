/**
 * One source for the Google reviews that appear on four pages.
 *
 *   data/reviews.json          the reviews, in display order (how to add one: data/README.md)
 *   <!-- @reviews:NAME -->     in a page under src/: the build writes the review cards here ...
 *   <!-- /@reviews:NAME -->    ... up to this marker. Both markers are removed from the output.
 *
 * The page a card goes on comes from the file being built (index.html is "home") and from the
 * review's `pages`. The markup comes from NAME:
 *
 *   home        the inline-styled card in Home's scrolling strip
 *   rv          the .rv-card on Why Us and Developers (the markup is byte-identical on both)
 *   rv-reveal   the same card with the scroll-reveal classes, which is how Our Story has it
 *
 * A review is shown only when it is valid and `confirmed` is true. A person sets `confirmed` after Shay
 * confirms the reviewer is a client or homeowner (docs/needs-confirmation.md, S5).
 *
 * The first applyReviews() call checks all the data once and prints a report in the style of
 * scripts/check-launch.mjs, under its own class, V:
 *
 *   V0  the file is missing or is not a JSON list         always stops the build
 *   V1  a review lacks something or has a bad field       blocker
 *   V2  its text breaks the copy guard (the same regexes) blocker
 *   V3  not shown, because confirmed is not true          warning
 *   V4  no date or link yet (S5)                          warning
 *   V5  a page would show no reviews                      blocker
 *
 * A blocker keeps that review off the pages, so broken or banned copy never ships, and is otherwise only
 * reported until launch. With ELH_LAUNCH=1 or --strict any blocker fails the build. Warnings are the known
 * gaps listed under S5 and never fail it. `node scripts/lib/reviews.mjs [--strict]` checks the data alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, TEXT_RULES, inScope } from './copy-rules.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_FILE = path.join(root, 'data', 'reviews.json');

/** The page keys a review may list in `pages`, and the file under src/ that carries each one's markers. */
export const PAGE_FILES = {
  home: 'index.html',
  'why-us': 'why-us.html',
  developers: 'developers.html',
  'our-story': 'our-story.html',
};
const PAGE_KEYS = Object.keys(PAGE_FILES);

/** Where a card links when its review has no link of its own yet. Every card links here today. */
export const PROFILE_URL =
  'https://www.google.com/maps/place/Ella+Lee+Homes/@33.5004403,-112.0567192,15z/data=!4m2!3m1!1s0x0:0x944a316da291c221';

/* ---------------------------------------------------------------- markup */

/** The review text is plain text in the data; the pages have always carried it as HTML. */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const starsOf = (r) => '★'.repeat(r.stars);
const hrefOf = (r) => esc(r.url || PROFILE_URL);
const metaOf = (r) => 'Google review' + (r.when && r.when.trim() ? ` &middot; ${esc(r.when.trim())}` : '');

const HOME_STYLE = {
  link: 'flex: 0 0 auto; width: min(86vw, 380px); scroll-snap-align: start; text-decoration: none; color: inherit',
  figure:
    'display: flex; flex-direction: column; gap: 24px; margin: 0; height: 100%; padding: 36px 32px; background: rgba(234,229,220,.05); border: 1px solid rgba(234,229,220,.12)',
  stars: 'display: inline-flex; gap: 3px; font-size: 13px; color: #BFA06A; letter-spacing: 2px',
  quote: 'margin: 0; font-size: clamp(16px, 1.25vw, 19px); font-weight: 300; line-height: 1.62; color: #EAE5DC',
  caption: 'display: flex; align-items: center; gap: 14px; margin-top: auto',
  avatar: 'position: relative; flex: 0 0 auto; width: 46px; height: 46px; overflow: hidden; border-radius: 50%',
  initial:
    'display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 15px; font-weight: 400; color: #BFA06A; background: rgba(191,160,106,.14); border: 1px solid rgba(191,160,106,.4); border-radius: 50%',
  who: 'display: flex; flex-direction: column; gap: 4px',
  name: 'font-size: 13px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: #BFA06A',
  meta: 'font-size: 11px; letter-spacing: .06em; color: rgba(234,229,220,.55)',
};

/** Home: a card in the #reviews-scroller strip. Returns the card's lines, indented relative to its first line. */
function homeCard(r) {
  const s = HOME_STYLE;
  return [
    `<a href="${hrefOf(r)}" target="_blank" rel="noopener" style="${s.link}"><figure style="${s.figure}">`,
    `  <span aria-hidden="true" style="${s.stars}">${starsOf(r)}</span>`,
    `  <blockquote style="${s.quote}">${esc(r.text)}</blockquote>`,
    `  <figcaption style="${s.caption}">`,
    `    <span style="${s.avatar}"><span style="${s.initial}">${esc(r.initial)}</span></span>`,
    `    <span style="${s.who}"><span style="${s.name}">${esc(r.name)}</span><span style="${s.meta}">${metaOf(r)}</span></span>`,
    `  </figcaption>`,
    `</figure></a>`,
  ];
}

/** Why Us, Developers and Our Story: the .rv-card, styled by each page's own CSS. */
function rvCard(r, cardClass) {
  return [
    `<a class="${cardClass}" href="${hrefOf(r)}" target="_blank" rel="noopener"><figure>`,
    `  <span class="rv-stars" aria-hidden="true">${starsOf(r)}</span>`,
    `  <blockquote>${esc(r.text)}</blockquote>`,
    `  <figcaption><span class="rv-av">${esc(r.initial)}</span><span class="rv-who"><span class="rv-name">${esc(r.name)}</span><span class="rv-meta">${metaOf(r)}</span></span></figcaption>`,
    `</figure></a>`,
  ];
}

const VARIANTS = {
  home: homeCard,
  rv: (r) => rvCard(r, 'rv-card'),
  'rv-reveal': (r) => rvCard(r, 'rv-card reveal reveal-delay-4'),
};

/* ---------------------------------------------------------------- validation */

const FIELDS = ['id', 'name', 'initial', 'when', 'text', 'stars', 'date', 'url', 'pages', 'confirmed'];
const blank = (v) => typeof v !== 'string' || v.trim() === '';

function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isHttpsUrl(s) {
  if (typeof s !== 'string' || /\s/.test(s)) return false;
  try {
    return new URL(s).protocol === 'https:';
  } catch {
    return false;
  }
}

/** What is wrong with one entry's fields. `seen` holds the ids already used. */
function fieldProblems(r, seen) {
  if (r === null || typeof r !== 'object' || Array.isArray(r)) return ['is not an object'];
  const out = [];
  const unknown = Object.keys(r).filter((k) => !FIELDS.includes(k));
  if (unknown.length) out.push(`unknown field${unknown.length > 1 ? 's' : ''} ${unknown.map((k) => `"${k}"`).join(', ')}`);
  if (blank(r.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id)) out.push('id must be a lowercase slug such as "jane-d"');
  else if (seen.has(r.id)) out.push(`id "${r.id}" is used twice`);
  else seen.add(r.id);
  if (blank(r.name)) out.push('name is required');
  if (blank(r.initial)) out.push('initial is required');
  else if ([...r.initial.trim()].length > 2) out.push('initial must be one or two characters');
  if (blank(r.text)) out.push('text is required');
  else if (/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);|<\/?[a-z][^>]*>/i.test(r.text)) out.push('text must be plain text: write & rather than &amp;, and no HTML tags');
  if (!Number.isInteger(r.stars) || r.stars < 1 || r.stars > 5) out.push('stars must be a whole number from 1 to 5');
  if (r.when != null && typeof r.when !== 'string') out.push('when must be text such as "8 months ago", or null');
  if (r.date != null && !isIsoDate(r.date)) out.push('date must be a real day written like 2026-03-14, or null');
  if (r.url != null && !isHttpsUrl(r.url)) out.push('url must be a full https:// link, or null');
  if (!Array.isArray(r.pages)) out.push(`pages must be a list made of: ${PAGE_KEYS.join(', ')}`);
  else {
    const bad = r.pages.filter((p) => !PAGE_KEYS.includes(p));
    if (bad.length) out.push(`unknown page ${bad.map((p) => JSON.stringify(p)).join(', ')}; use: ${PAGE_KEYS.join(', ')}`);
  }
  if (r.confirmed !== undefined && typeof r.confirmed !== 'boolean') out.push('confirmed must be true or false');
  return out;
}

/**
 * What the copy guard bans, found in a review's text. It calls the guard's own rules (scripts/lib/copy-rules.mjs),
 * for the pages the review is shown on, because this text never passes through src/ where check-copy reads.
 */
function copyHits(r) {
  const pages = Array.isArray(r.pages) ? r.pages.filter((p) => PAGE_FILES[p]) : [];
  const files = (pages.length ? pages : PAGE_KEYS).map((p) => `src/${PAGE_FILES[p]}`);
  const plain = r.text.replace(/\s+/g, ' ');
  const hits = [];
  for (const [rx, why, scope] of [...RULES, ...TEXT_RULES]) {
    if (!files.some((f) => inScope(f, scope))) continue;
    const once = new RegExp(rx.source, rx.flags.replace('g', ''));
    // As written in the data and as it ships, since the guard reads shipped HTML (& is &amp; there).
    const m = plain.match(once) || esc(plain).match(once);
    if (m) hits.push(`"${m[0]}" (${why})`);
  }
  return hits;
}

/**
 * @param {unknown[]} list the parsed contents of data/reviews.json
 * @returns {{ ok: object[], byPage: Record<string, object[]>, blockers: {id: string, text: string}[], warnings: {id: string, text: string}[] }}
 */
export function validateReviews(list) {
  const blockers = [];
  const warnings = [];
  const seen = new Set();
  const ok = []; // valid and confirmed: these ship
  const waiting = []; // valid but not confirmed yet

  list.forEach((r, i) => {
    const label = r && typeof r.id === 'string' && r.id ? r.id : `#${i + 1}`;
    const issues = fieldProblems(r, seen);
    if (issues.length) blockers.push({ id: 'V1', text: `${label} is not shown: ${issues.join('; ')}` });
    const hits = r && !blank(r.text) ? copyHits(r) : [];
    if (hits.length) blockers.push({ id: 'V2', text: `${label} is not shown: its text breaks the copy guard: ${hits.join('; ')}` });
    if (issues.length || hits.length) return;
    if (r.confirmed === true) ok.push(r);
    else waiting.push(label);
  });

  const byPage = Object.fromEntries(PAGE_KEYS.map((k) => [k, ok.filter((r) => r.pages.includes(k))]));
  const empty = PAGE_KEYS.filter((k) => byPage[k].length === 0);
  if (empty.length) blockers.push({ id: 'V5', text: `no reviews to show on ${empty.join(', ')}` });

  if (waiting.length) {
    const n = waiting.length;
    warnings.push({
      id: 'V3',
      text: `${n} review${n === 1 ? ' is' : 's are'} not shown until confirmed is true: ${waiting.join(', ')} (S5: Shay confirms the reviewer is a client or homeowner)`,
    });
  }
  const gaps = ok.filter((r) => r.pages.length && (r.date == null || r.url == null)).length;
  if (gaps) warnings.push({ id: 'V4', text: `${gaps} review${gaps === 1 ? ' has' : 's have'} no date or link yet; S5` });

  return { ok, byPage, blockers, warnings };
}

/** Reads data/reviews.json. A file that cannot be read as a list leaves nothing to show, so it stops the build. */
export function loadReviews(file = DATA_FILE) {
  const name = path.relative(root, file).split(path.sep).join('/');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`[V0] ${name} cannot be read as JSON: ${e.message}`);
  }
  if (!Array.isArray(data)) fail(`[V0] ${name} must be a JSON list of review objects`);
  return data;
}

function fail(message) {
  console.error(`reviews: ${message}`);
  process.exit(1);
}

/* ---------------------------------------------------------------- the build */

const isStrict = () => process.argv.includes('--strict') || process.env.ELH_LAUNCH === '1';

let checked = null;

/** Loads, checks and reports once per build; in strict mode a blocker stops it here. */
function prepare() {
  if (checked) return checked;
  const strict = isStrict();
  const result = validateReviews(loadReviews());
  const shown = result.ok.filter((r) => r.pages.length).length;
  const perPage = PAGE_KEYS.map((k) => `${k} ${result.byPage[k].length}`).join(', ');
  const { blockers, warnings } = result;
  console.log(`reviews (${strict ? 'STRICT' : 'report'}): ${shown} shown (${perPage}); ${blockers.length} launch blocker(s), ${warnings.length} warning(s)`);
  for (const b of [...blockers, ...warnings]) console.log(`  [${b.id}] ${b.text}`);
  if (strict && blockers.length) {
    console.error('reviews: FAILED. Clear every blocker above before the go-live deploy. Warnings never block.');
    process.exit(1);
  }
  checked = result;
  return checked;
}

const REGION = /^([ \t]*)<!-- @reviews:([\w-]+) -->([\s\S]*?)<!-- \/@reviews:\2 -->/gm;

/**
 * Replaces each marked region of a page with its review cards, indented to the opening marker, and drops
 * the markers. A page without markers comes back unchanged.
 *
 * @param {string} html a page of src/, after the partials and facts are in
 * @param {string} file its file name, such as "why-us.html"
 */
export function applyReviews(html, file) {
  const state = prepare();
  const page = PAGE_KEYS.find((k) => PAGE_FILES[k] === file);
  const marked = html.includes('@reviews:');
  if (!page && !marked) return html;
  if (!page) fail(`${file} has @reviews markers, but PAGE_FILES in scripts/lib/reviews.mjs does not list it`);
  if (!marked) fail(`${file} has no <!-- @reviews:NAME --> markers, so it would lose its reviews`);

  const out = html.replace(REGION, (_, indent, name, inner) => {
    const render = VARIANTS[name];
    if (!render) fail(`${file}: unknown review variant "${name}" (known: ${Object.keys(VARIANTS).join(', ')})`);
    if (inner.trim()) console.warn(`reviews: ${file}: the build replaces whatever sits between the @reviews:${name} markers; leave it empty`);
    return state.byPage[page].map((r) => render(r).map((line) => indent + line).join('\n')).join('\n');
  });
  if (out.includes('@reviews:')) fail(`${file}: a @reviews marker was not understood. Each one goes on its own line, with its closing marker after it`);
  return out;
}

/* ---------------------------------------------------------------- standalone check */

/** True when this file is the script being run (not when the build imports it). Never throws. */
function runAsScript() {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (runAsScript()) prepare();
