#!/usr/bin/env node
/**
 * ONE-OFF (WP5 phase A). Writes data/projects.json from the pages as they were written by hand:
 *   src/project.html          the `const PROJECTS = {...}` block (one record per project, in page order)
 *   src/previous-projects.html the .proj-card markup (card order, band, card photo, card text)
 *   src/index.html            the Home project strip (which projects it features)
 * Nothing is invented: a value the pages do not give is null. Where the card and the project page say different
 * things for the same field, the page's value is the record and the card's value goes under `card: {}`, so the
 * built site stays exactly as it was; data/README.md lists each one.
 *
 * It reads markup that the build now generates, so it only runs on the tree it was written for (937be86 and
 * earlier). It is kept in history, not in use: once the pages carry markers it stops finding what it reads.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA_FILE, CARD_FIELDS, BAND_KEYS, MARKETS, bandFromSqft, styleFromLabel, formatProjectsJson } from './lib/projects.mjs';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const fail = (msg) => {
  console.error(`seed-projects: ${msg}`);
  process.exit(1);
};

/* ---- the project page's records ---- */
const projectHtml = read('src/project.html');
const block = projectHtml.match(/const PROJECTS = (\{[\s\S]*?\n\});/);
if (!block) fail('src/project.html has no `const PROJECTS = {...}` block (the pages already carry markers).');
// The literal is this repository's own page source, so evaluating it is no different from loading the page.
const PAGE = new Function(`return ${block[1]}`)();

/* ---- the portfolio's cards ---- */
const portfolioHtml = read('src/previous-projects.html');
const cardRx = /<div class="proj-card" data-sqft="([^"]*)" data-price="([^"]*)" data-year="([^"]*)" data-band="([^"]*)">([\s\S]*?)\n    <\/div>\n/g;
const CARDS = [];
for (const m of portfolioHtml.matchAll(cardRx)) {
  const [, sqftAttr, priceAttr, yearAttr, band, body] = m;
  const pick = (rx) => (body.match(rx) || [])[1];
  const specs = [...body.matchAll(/<span>([^<]*)<\/span>/g)].map((x) => x[1]).filter((s) => !/^Completed/.test(s));
  CARDS.push({
    band,
    sqftAttr,
    priceAttr,
    yearAttr,
    slug: pick(/href="project\.html\?slug=([^"]+)"/),
    year: pick(/<div class="proj-card-year">([^<]*)<\/div>/),
    chip: pick(/<div class="proj-card-sold">([^<]*)<\/div>/),
    photo: pick(/<img src="([^"]*)"/),
    loc: pick(/<div class="proj-card-location">([^<]*)<\/div>/),
    styleLabel: pick(/<div class="proj-card-style">([^<]*)<\/div>/),
    name: pick(/<div class="proj-card-name">([^<]*)<\/div>/),
    price: pick(/<\/span>([^<]*)<\/div>/),
    beds: (specs[0] || '').replace(/ BD$/, ''),
    baths: (specs[1] || '').replace(/ BA$/, ''),
    sqft: (specs[2] || '').replace(/ sqft$/, ''),
  });
}
if (CARDS.length !== Object.keys(PAGE).length) fail(`${CARDS.length} cards but ${Object.keys(PAGE).length} projects.`);
const cardOf = new Map(CARDS.map((c) => [c.slug, c]));
for (const slug of Object.keys(PAGE)) if (!cardOf.has(slug)) fail(`no portfolio card for "${slug}".`);

/* ---- the Home strip ---- */
const home = read('src/index.html');
const strip = home.slice(home.indexOf('data-elh-track="1"'), home.indexOf('aria-label="Previous project"'));
const byName = new Map(Object.entries(PAGE).map(([slug, p]) => [p.name.toLowerCase(), slug]));
const FEATURED = new Set();
for (const a of strip.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
  const href = (a[1].match(/href="project\.html\?slug=([^"]+)"/) || [])[1];
  const title = (a[2].match(/<h3[^>]*>([^<]*)<\/h3>/) || [])[1];
  const slug = href || (title && byName.get(title.trim().toLowerCase()));
  if (!slug || !PAGE[slug]) fail(`a Home strip card ("${title}") matches no project.`);
  FEATURED.add(slug);
}

/* ---- readers for the text the pages show ---- */
const money = (s) => (/^\$[\d,]+$/.test(s || '') ? Number(s.replace(/[$,]/g, '')) : null);
const whole = (s) => (/^[\d,]+$/.test(s || '') ? Number(s.replace(/,/g, '')) : null);
const dec = (s) => (/^\d+(\.\d+)?$/.test(s || '') ? Number(s) : null);
const text = (s) => (s === undefined || s === null || s === '' ? null : s);

/**
 * The market a location label names, only where it does so plainly: the label's first part is a market, or ends
 * with one ("Old Town Scottsdale"), or its last part is one ("Desert Estates, Scottsdale"). A label that mixes in
 * a neighbourhood that is itself named for a market ("Arcadia Lite, Phoenix") is left for Rebecca (R4).
 */
function marketOf(label) {
  const parts = String(label || '').split(',').map((s) => s.trim());
  const first = parts[0] || '';
  if (MARKETS.includes(first)) return first;
  const tail = MARKETS.find((m) => first.endsWith(` ${m}`));
  if (tail) return tail;
  if (MARKETS.some((m) => first.includes(m))) return null;
  const last = parts[parts.length - 1];
  return MARKETS.includes(last) ? last : null;
}

function statusOf(slug, pageStatus, chip) {
  if (!pageStatus && !chip) return 'photos-only';
  if (/^For Sale/.test(pageStatus) && chip === 'For Sale') return 'for-sale';
  if (/^Sold/.test(pageStatus) && chip === 'Sold') return 'sold';
  return fail(`"${slug}": page status "${pageStatus}" and card chip "${chip}" do not fit a status.`);
}

/* ---- one record per project, in the page's own order ---- */
const orderInBand = Object.fromEntries(BAND_KEYS.map((b) => [b, 0]));
const cardOrderOf = new Map(CARDS.map((c) => [c.slug, ++orderInBand[c.band]]));
const projects = [];
const notes = [];
for (const [slug, p] of Object.entries(PAGE)) {
  const c = cardOf.get(slug);
  const status = statusOf(slug, p.status, c.chip);
  const photosOnly = status === 'photos-only';
  const page = {
    name: p.name,
    locationLabel: text(p.location),
    year: p.year ? p.year : null,
    value: money(p.price),
    valueLabel: text(p.price),
    sqft: whole(p.sqft),
    beds: whole(p.beds),
    baths: dec(p.baths),
  };
  // What the card shows for the same fields.
  const card = {
    name: c.name,
    locationLabel: text(c.loc),
    year: photosOnly ? null : whole(c.year),
    value: photosOnly ? null : money(c.price),
    valueLabel: photosOnly ? null : text(c.price),
    sqft: photosOnly ? null : whole(c.sqft),
    beds: photosOnly ? null : whole(c.beds),
    baths: photosOnly ? null : dec(c.baths),
  };
  // The card's hidden sort attributes must agree with the text it shows, or the sort and the page disagree.
  if (!photosOnly && (Number(c.sqftAttr) !== card.sqft || Number(c.priceAttr) !== card.value || Number(c.yearAttr) !== card.year)) {
    fail(`"${slug}": the card's data-* attributes do not match its text.`);
  }
  const overrides = {};
  for (const f of CARD_FIELDS) {
    if (f === 'styleLabel') continue;
    if (card[f] !== page[f]) {
      overrides[f] = card[f];
      notes.push(`${slug}: ${f}: project page ${JSON.stringify(page[f])}, portfolio card ${JSON.stringify(card[f])}`);
    }
  }
  if (!photosOnly && bandFromSqft(page.sqft) !== c.band) notes.push(`${slug}: band "${c.band}" is not what ${page.sqft} sqft gives (${bandFromSqft(page.sqft)})`);
  if (photosOnly !== (c.band === 'new')) notes.push(`${slug}: band "${c.band}" does not fit status "${status}"`);
  projects.push({
    slug,
    name: page.name,
    status,
    statusLabel: text(p.status),
    market: marketOf(page.locationLabel),
    neighborhood: null,
    locationLabel: page.locationLabel,
    year: page.year,
    value: page.value,
    valueLabel: page.valueLabel,
    sqft: page.sqft,
    beds: page.beds,
    baths: page.baths,
    builder: null,
    styleLabel: text(c.styleLabel),
    style: photosOnly ? null : styleFromLabel(c.styleLabel),
    band: c.band,
    cardOrder: cardOrderOf.get(slug),
    featured: FEATURED.has(slug),
    photoFolder: null,
    cardPhoto: c.photo,
    heroPhoto: p.heroImg,
    gallery: p.gallery,
    storyTitle: p.storyTitle,
    storyParas: p.storyParas,
    amenities: p.amenities,
    ...(Object.keys(overrides).length ? { card: overrides } : {}),
  });
}

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, formatProjectsJson(projects), 'utf8');
const count = (f) => projects.filter(f).length;
console.log(`seed-projects: wrote ${path.relative(ROOT, DATA_FILE)}: ${projects.length} projects (${count((p) => p.status === 'sold')} sold, ${count((p) => p.status === 'for-sale')} for sale, ${count((p) => p.status === 'photos-only')} photos only), ${count((p) => p.featured)} featured, ${count((p) => p.card)} with card overrides.`);
console.log(`  market left blank: ${projects.filter((p) => !p.market).map((p) => p.slug).join(', ')}`);
console.log(`  style null (card label has neither word): ${projects.filter((p) => p.status !== 'photos-only' && !p.style).map((p) => p.slug).join(', ')}`);
for (const n of notes) console.log(`  note: ${n}`);
