/**
 * The checks on data/projects.json, as a library. scripts/validate-projects.mjs prints them, scripts/check-launch.mjs
 * turns the errors into launch blockers (class P), the CSV export writes the plain-language ones into its `check`
 * column, and the importer runs them on a returned sheet before it writes anything.
 *
 * A finding is { code, level, slug, field, message, plain, where?, group? }:
 *   level    "error" is a record the site cannot use as it stands (a required field is empty, a value is not one of
 *            the allowed ones, a photo file is missing). "warn" is advice: a number that looks off, two homes that
 *            share a figure, a page that repeats a fact by hand and disagrees.
 *   message  for the build log: names the slug and the field.
 *   plain    the same point in words Rebecca can act on, or null when it is not hers to fix.
 *   where    "file:line" for a finding about another page.
 *   group    findings that describe one fact from two sides (two homes with one value) share a group, so the
 *            console prints them once.
 *
 * Errors block a launch build; warnings never do. Warnings stay until Rebecca answers (docs/needs-confirmation.md, R2).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, STATUSES, STYLES, MARKETS, BAND_KEYS, CARD_FIELDS, bandFromSqft, styleFromLabel,
  fmtInt, fmtMoney, isPhotosOnly, listedProjects, portfolioOrder,
} from './projects.mjs';
import { lineOf } from './regions.mjs';

/** What each finding code means. P is a launch blocker (an error); W is advice. */
export const CODES = {
  P1: 'A required field is empty',
  P2: 'A field holds a value the site cannot use',
  P3: 'Baths are not a whole or half number',
  P4: 'A photo file is missing, or its address is not one the site knows',
  W1: 'Two projects share a value or a floor area',
  W2: 'A number is outside the usual range',
  W3: 'The card label and the style disagree',
  W4: 'The size band and the status or floor area disagree',
  W5: 'Another page repeats a fact by hand and disagrees with the data',
  W6: 'Something else to look at',
};

/** The limits behind the plausibility warnings. */
export const RANGES = { sqft: [1000, 20000], value: [300000, 30000000], perSqft: [150, 3000], year: [2015, 2027], beds: [1, 12], bathsOverBeds: 4 };

const SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const blank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
const unesc = (s) => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

/** Fields every project must have, and the words Rebecca sees when one is empty. */
const REQUIRED = [
  ['name', 'name is blank'],
  ['status', 'status is blank (sold, for-sale or in-progress)'],
  ['year', 'year completed is blank'],
  ['value', 'completed home value is blank'],
  ['sqft', 'sq ft is blank'],
  ['beds', 'beds is blank'],
  ['baths', 'baths is blank'],
  ['styleLabel', 'the card style label is blank'],
  ['style', null], // worded per project, below
  ['cardPhoto', 'the card photo is missing'],
  ['heroPhoto', 'the hero photo is missing'],
  ['gallery', 'there are no gallery photos'],
];
/** A project that is only photographs needs just enough to draw its card and its page. */
const REQUIRED_PHOTOS_ONLY = new Set(['name', 'status', 'cardPhoto', 'heroPhoto', 'gallery']);

/* ------------------------------------------------------------------ photos */

/** Where a photo address points: a file on this site, or one of the three hosts the media migration will move. */
export function classifyPhoto(u) {
  if (typeof u !== 'string' || !u.trim()) return { kind: 'empty' };
  const s = u.trim();
  if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(s)) return { kind: 'local', file: s.replace(/^\.?\//, '').split(/[?#]/)[0] };
  let url;
  try {
    url = new URL(s.startsWith('//') ? `https:${s}` : s);
  } catch {
    return { kind: 'unknown' };
  }
  const host = url.hostname.toLowerCase();
  if (host === 'ellaleehomes.com' || host === 'www.ellaleehomes.com') {
    return /^\/(?:uploads|assets)\//.test(url.pathname) ? { kind: 'local', file: url.pathname.slice(1) } : /^\/wp-content\//.test(url.pathname) ? { kind: 'remote', host: 'old site' } : { kind: 'unknown' };
  }
  if (host.endsWith('googleusercontent.com')) return { kind: 'remote', host: 'Drive' };
  if (host.endsWith('zillowstatic.com')) return { kind: 'remote', host: 'Zillow' };
  return { kind: 'unknown' };
}

/* ------------------------------------------------------------------ the project records */

/**
 * @param {any[]} projects
 * @param {{ root?: string, cross?: boolean }} [opts] `cross: false` skips the look at other pages
 * @returns {{ findings: any[], info: string[], counts: { projects: number, listed: number, photosOnly: number } }}
 */
export function validateProjects(projects, opts = {}) {
  const root = opts.root ?? ROOT;
  const findings = [];
  const info = [];
  const add = (code, level, p, field, message, plain = null, extra = {}) => findings.push({ code, level, slug: p ? p.slug : null, field, message, plain, ...extra });
  const error = (code, p, field, message, plain) => add(code, 'error', p, field, message, plain);
  const warn = (code, p, field, message, plain, extra) => add(code, 'warn', p, field, message, plain, extra);

  const nameCount = new Map();
  for (const p of projects) nameCount.set(p.name, (nameCount.get(p.name) || 0) + 1);
  /** How to name a project to Rebecca: its name, plus its slug when two share a name. */
  const who = (p) => (nameCount.get(p.name) > 1 ? `${p.name} (${p.slug})` : p.name);

  // ---- slugs
  const seen = new Map();
  projects.forEach((p, i) => {
    if (typeof p.slug !== 'string' || !SLUG_RX.test(p.slug)) {
      error('P2', p, 'slug', `slug "${p.slug}" is not lower-case kebab (a to z, 0 to 9, hyphens): the page URL is project?slug=${p.slug}`, null);
    } else if (encodeURIComponent(p.slug) !== p.slug) {
      error('P2', p, 'slug', `slug "${p.slug}" changes when put in a URL`, null);
    }
    if (seen.has(p.slug)) error('P2', p, 'slug', `slug "${p.slug}" is used by entries ${seen.get(p.slug) + 1} and ${i + 1}`, null);
    else seen.set(p.slug, i);
  });

  for (const p of projects) {
    const photosOnly = isPhotosOnly(p);

    // ---- required fields
    for (const [field, plain] of REQUIRED) {
      if (photosOnly && !REQUIRED_PHOTOS_ONLY.has(field)) continue;
      const v = p[field];
      const empty = field === 'gallery' ? !Array.isArray(v) || v.length === 0 : blank(v);
      if (!empty) continue;
      const words =
        field === 'style'
          ? `style is blank: ${blank(p.styleLabel) ? 'choose farmhouse or contemporary' : `the card says "${p.styleLabel}"; choose farmhouse or contemporary (the two filters on the portfolio)`}`
          : plain;
      const note = field === 'style' && !blank(p.styleLabel) ? `; the card label is "${p.styleLabel}", so choose farmhouse or contemporary (the two Style filters)` : ' (required)';
      error('P1', p, field, `empty${note}`, words);
    }

    // ---- values the site can use
    if (!blank(p.status) && !STATUSES.includes(p.status)) error('P2', p, 'status', `status "${p.status}" is not one of ${STATUSES.join(', ')}`, `status "${p.status}" is not one of ${STATUSES.join(', ')}`);
    if (!blank(p.style) && !STYLES.includes(p.style)) error('P2', p, 'style', `style "${p.style}" is not one of ${STYLES.join(', ')}`, `style "${p.style}" is not one of ${STYLES.join(', ')}`);
    if (!blank(p.band) && !BAND_KEYS.includes(p.band)) error('P2', p, 'band', `band "${p.band}" is not one of ${BAND_KEYS.join(', ')}`, null);
    if (blank(p.band)) error('P2', p, 'band', 'band is empty: the portfolio cannot place the card', null);
    for (const f of ['year', 'sqft', 'beds']) {
      if (!blank(p[f]) && !(Number.isInteger(p[f]) && p[f] > 0)) error('P2', p, f, `${f} ${JSON.stringify(p[f])} must be a whole number above zero`, `${f} must be a whole number`);
    }
    if (!blank(p.value) && !(isNum(p.value) && p.value > 0)) error('P2', p, 'value', `value ${JSON.stringify(p.value)} must be a number of dollars`, 'completed home value must be a number of dollars');
    if (!blank(p.baths) && !(isNum(p.baths) && p.baths > 0)) error('P2', p, 'baths', `baths ${JSON.stringify(p.baths)} must be a number such as 5 or 5.5`, 'baths must be a number such as 5 or 5.5');
    if (!blank(p.valueLabel) && isNum(p.value)) {
      const shown = Number(String(p.valueLabel).replace(/[^\d]/g, ''));
      if (!/^\$[\d,]+$/.test(p.valueLabel) || shown !== p.value) error('P2', p, 'valueLabel', `valueLabel "${p.valueLabel}" does not match value ${fmtInt(p.value)}`, null);
    }
    if (!blank(p.market) && !MARKETS.includes(p.market)) warn('W6', p, 'market', `market "${p.market}" is not one of ${MARKETS.join(', ')}`, `market "${p.market}" is not one of the four on the website (${MARKETS.join(', ')})`);
    if (p.featured !== undefined && typeof p.featured !== 'boolean') error('P2', p, 'featured', 'featured must be true or false', null);
    if (!blank(p.cardOrder) && !Number.isInteger(p.cardOrder)) error('P2', p, 'cardOrder', 'cardOrder must be a whole number', null);
    if (p.card !== undefined) {
      if (!p.card || typeof p.card !== 'object' || Array.isArray(p.card)) error('P2', p, 'card', 'card must be an object of overrides', null);
      else for (const k of Object.keys(p.card)) if (!CARD_FIELDS.includes(k)) error('P2', p, `card.${k}`, `card.${k} is not a field the portfolio card can override (${CARD_FIELDS.join(', ')})`, null);
    }

    // ---- baths: whole or half numbers only
    if (isNum(p.baths) && p.baths > 0 && !Number.isInteger(p.baths * 2)) {
      error('P3', p, 'baths', `baths ${p.baths} is not a whole or half number`, `baths shown as ${p.baths}: use a whole or half number (5, 5.5, 6)`);
    }

    // ---- the style filter reads the card's label
    const derived = styleFromLabel(p.styleLabel);
    if (!blank(p.style) && STYLES.includes(p.style) && !blank(p.styleLabel) && derived !== p.style) {
      warn('W3', p, 'style', `style is "${p.style}" but the card label "${p.styleLabel}" ${derived ? `reads as ${derived}` : 'has neither word'}: the portfolio's Style filter reads the label, so the card ${derived ? `will show under ${derived}` : 'will show under neither button'}`, `style is ${p.style} but the card says "${p.styleLabel}", so the card will not show under the ${p.style} filter until its label does`);
    }

    // ---- band
    if (BAND_KEYS.includes(p.band)) {
      if (photosOnly && p.band !== 'new') warn('W4', p, 'band', `band "${p.band}" but the project is photos-only (its card belongs under "new")`, null);
      else if (!photosOnly && p.band === 'new') warn('W4', p, 'band', `band "new" but the status is ${p.status} (the card belongs in a size band)`, null);
      else if (!photosOnly && isNum(p.sqft) && bandFromSqft(p.sqft) !== p.band) warn('W4', p, 'band', `band "${p.band}" but ${fmtInt(p.sqft)} sqft belongs in "${bandFromSqft(p.sqft)}"`, null);
    }

    // ---- plausibility (a number that looks off; never an error)
    const range = (field, v, [lo, hi], label) => {
      const n = field === 'year' ? String : fmtInt;
      if (isNum(v) && (v < lo || v > hi)) warn('W2', p, field, `${field} ${n(v)} is outside the usual ${n(lo)} to ${n(hi)}`, `${label} ${n(v)} looks off (usually ${n(lo)} to ${n(hi)}): please check it`);
    };
    range('sqft', p.sqft, RANGES.sqft, 'sq ft');
    range('value', p.value, RANGES.value, 'completed home value');
    range('year', p.year, RANGES.year, 'year');
    range('beds', p.beds, RANGES.beds, 'beds');
    if (isNum(p.value) && isNum(p.sqft) && p.sqft > 0) {
      const per = p.value / p.sqft;
      if (per < RANGES.perSqft[0] || per > RANGES.perSqft[1]) {
        warn('W2', p, 'value', `value per sqft is ${fmtMoney(per)}, outside the usual ${fmtMoney(RANGES.perSqft[0])} to ${fmtMoney(RANGES.perSqft[1])}`, `completed home value and sq ft together work out to ${fmtMoney(per)} a sq ft (usually ${fmtMoney(RANGES.perSqft[0])} to ${fmtMoney(RANGES.perSqft[1])}): please check both`);
      }
    }
    if (isNum(p.baths) && isNum(p.beds) && p.baths > p.beds + RANGES.bathsOverBeds) {
      warn('W2', p, 'baths', `baths ${p.baths} is more than beds ${p.beds} plus ${RANGES.bathsOverBeds}`, `${p.baths} baths for ${p.beds} beds looks off: please check`);
    }
  }

  // ---- two projects sharing a figure
  const share = (field, label, plainLabel, fmt) => {
    const groups = new Map();
    for (const p of projects) if (isNum(p[field])) groups.set(p[field], [...(groups.get(p[field]) || []), p]);
    for (const [v, ps] of groups) {
      if (ps.length < 2) continue;
      for (const p of ps) {
        const others = ps.filter((o) => o !== p);
        const alike = field === 'sqft' && others.every((o) => o.beds === p.beds && o.baths === p.baths);
        warn('W1', p, field, `${label} ${fmt(v)} is also on ${others.map((o) => o.slug).join(', ')}`, `same ${plainLabel} as ${others.map(who).join(', ')}${alike ? ' (and the same beds and baths)' : ''}`, {
          group: `${field}:${v}`,
          groupMessage: `${ps.map((o) => o.slug).join(', ')} share ${label} ${fmt(v)}${field === 'sqft' && ps.every((o) => o.beds === ps[0].beds && o.baths === ps[0].baths) ? ' (and the same beds and baths)' : ''}`,
        });
      }
    }
  };
  share('value', 'value', 'value', fmtMoney);
  share('sqft', 'sqft', 'sq ft', fmtInt);

  // ---- photos: a local file must exist; a remote one counts toward the media migration
  const remote = new Map();
  let localOk = 0;
  for (const p of projects) {
    const refs = [['cardPhoto', p.cardPhoto], ['heroPhoto', p.heroPhoto], ...(Array.isArray(p.gallery) ? p.gallery.map((u, i) => [`gallery[${i}]`, u]) : [])];
    for (const [field, u] of refs) {
      if (blank(u)) continue;
      const c = classifyPhoto(u);
      if (c.kind === 'local') {
        if (fs.existsSync(path.join(root, c.file))) localOk++;
        else error('P4', p, field, `${field} points at ${c.file}, which does not exist`, field === 'gallery' ? null : `the ${field === 'cardPhoto' ? 'card' : 'hero'} photo file is missing`);
      } else if (c.kind === 'remote') {
        if (!remote.has(u)) remote.set(u, c.host);
      } else {
        error('P4', p, field, `${field} "${String(u).slice(0, 80)}" is not an uploads/ file or a photo address the media migration knows`, field === 'gallery' ? null : `the ${field === 'cardPhoto' ? 'card' : 'hero'} photo address is not one the site knows`);
      }
    }
  }
  const byHost = {};
  for (const h of remote.values()) byHost[h] = (byHost[h] || 0) + 1;
  info.push(
    `photos: ${localOk} local file(s) found; ${remote.size} distinct remote address(es)${remote.size ? ` (${Object.entries(byHost).map(([h, n]) => `${h} ${n}`).join(', ')})` : ''}. The media migration moves the remote ones; check-assets (M1) blocks launch until none is left.`,
  );

  // ---- the facts other pages repeat by hand
  if (opts.cross !== false) findings.push(...crossCheckPages(projects, root, info));

  return { findings, info, counts: { projects: projects.length, listed: listedProjects(projects).length, photosOnly: projects.filter(isPhotosOnly).length } };
}

/* ------------------------------------------------------------------ pages that repeat project facts */

/**
 * The Developers inventory, the Why Us tiles, the Home strip and the Our Story pins each repeat a few facts by
 * hand. They are not generated (yet), so each is read and held against the data. Every mismatch is a warning with
 * the file and line. A page whose markup no longer matches is reported too, so a change to it cannot silently
 * switch its check off.
 */
export function crossCheckPages(projects, root, info = []) {
  const out = [];
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const read = (rel) => {
    try {
      return fs.readFileSync(path.join(root, rel), 'utf8');
    } catch {
      return null;
    }
  };
  const warnAt = (rel, text, index, p, field, message) => out.push({ code: 'W5', level: 'warn', slug: p ? p.slug : null, field, message, plain: null, where: `${rel}:${lineOf(text, index)}` });
  /** Position of a sub-match of `rx` inside text[start, start+len): the first group's text and its offset. */
  const within = (text, start, body, rx) => {
    const m = rx.exec(body);
    return m ? { v: m[1], at: start + m.index } : null;
  };
  const known = (rel, text, at, slug) => {
    if (bySlug.has(slug)) return bySlug.get(slug);
    warnAt(rel, text, at, null, 'slug', `links to project.html?slug=${slug}, which is not in data/projects.json`);
    return null;
  };
  const same = (rel, text, at, p, field, shown, want, show = (x) => (typeof x === 'string' ? JSON.stringify(x) : String(x))) => {
    if (shown !== want) warnAt(rel, text, at, p, field, `${p.slug}: shows ${show(shown)} for ${field}, data/projects.json has ${want === null || want === undefined ? 'nothing' : show(want)}`);
  };
  /** Which projects a photo address belongs to (card, hero or gallery). */
  const owners = new Map();
  for (const p of projects) for (const u of [p.cardPhoto, p.heroPhoto, ...(Array.isArray(p.gallery) ? p.gallery : [])]) if (typeof u === 'string' && u) owners.set(u, new Set([...(owners.get(u) || []), p.slug]));
  const photoOf = (rel, text, start, body, p) => {
    const img = within(text, start, body, /<img\b[^>]*\bsrc="([^"]+)"/);
    const own = img && owners.get(img.v);
    if (own && !own.has(p.slug)) warnAt(rel, text, img.at, p, 'photo', `${p.slug}: the photo is ${[...own].join(' and ')}'s (${img.v.split('/').pop()}), not its own`);
  };
  const noCards = (rel) => out.push({ code: 'W5', level: 'warn', slug: null, field: null, message: `could not find the project cards in ${rel}: its markup changed, so its facts are not being checked`, plain: null, where: rel });

  // Developers: "Investment inventory" cards
  {
    const rel = 'src/developers.html';
    const text = read(rel);
    if (text) {
      let n = 0;
      for (const m of text.matchAll(/<a class="inv-card[^"]*" href="project\.html\?slug=([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        n++;
        const p = known(rel, text, m.index, m[1]);
        if (!p) continue;
        const body = m[2];
        const start = m.index + m[0].indexOf(body);
        const name = within(text, start, body, /<div class="inv-card-name">([^<]*)<\/div>/);
        if (name) same(rel, text, name.at, p, 'name', unesc(name.v), p.name);
        photoOf(rel, text, start, body, p);
        const price = within(text, start, body, /<div class="inv-card-price">[^$<]*\$([\d,]+)<\/div>/);
        if (price) same(rel, text, price.at, p, 'value', Number(price.v.replace(/,/g, '')), p.value, fmtMoney);
        for (const [unit, field] of [['bed', 'beds'], ['bath', 'baths'], ['sqft', 'sqft']]) {
          const spec = within(text, start, body, new RegExp(`<strong>([\\d.,]+)</strong>\\s*${unit}\\b`));
          if (spec) same(rel, text, spec.at, p, field, Number(spec.v.replace(/,/g, '')), p[field], (x) => (field === 'sqft' ? fmtInt(x) : String(x)));
        }
      }
      if (!n) noCards(rel);
      info.push(`${rel}: ${n} inventory card(s) checked`);
    }
  }

  // Why Us: "Recent homes" tiles (the value is written short, such as $5.45M)
  {
    const rel = 'src/why-us.html';
    const text = read(rel);
    if (text) {
      let n = 0;
      for (const m of text.matchAll(/<a class="proof-tile[^"]*" href="project\.html\?slug=([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        n++;
        const p = known(rel, text, m.index, m[1]);
        if (!p) continue;
        const body = m[2];
        const start = m.index + m[0].indexOf(body);
        const name = within(text, start, body, /<div class="proof-cap-name">([^<]*)<\/div>/);
        if (name) same(rel, text, name.at, p, 'name', unesc(name.v), p.name);
        photoOf(rel, text, start, body, p);
        const meta = within(text, start, body, /<div class="proof-cap-meta">[^<]*?\$([\d.]+)M[^<]*<\/div>/);
        if (meta && isNum(p.value)) {
          const decimals = (meta.v.split('.')[1] || '').length;
          const shown = Number(meta.v);
          if (Math.abs(shown - p.value / 1e6) > 0.5 * 10 ** -decimals + 1e-9) {
            warnAt(rel, text, meta.at, p, 'value', `${p.slug}: shows $${meta.v}M for value, data/projects.json has ${fmtMoney(p.value)}`);
          }
        }
      }
      if (!n) noCards(rel);
      info.push(`${rel}: ${n} tile(s) checked`);
    }
  }

  // Home: the project strip (the Stanford card has no link, so it is matched by name)
  {
    const rel = 'src/index.html';
    const text = read(rel);
    if (text) {
      const from = text.indexOf('data-elh-track="1"');
      const to = text.indexOf('aria-label="Previous project"', from);
      let n = 0;
      if (from >= 0 && to > from) {
        const strip = text.slice(from, to);
        for (const m of strip.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
          const title = /<h3[^>]*>([^<]*)<\/h3>/.exec(m[2]);
          if (!title) continue;
          n++;
          const at = from + m.index + m[0].indexOf(title[0]);
          const slug = (/href="project\.html\?slug=([^"]+)"/.exec(m[1]) || [])[1];
          const shown = unesc(title[1]);
          if (slug) {
            const p = known(rel, text, at, slug);
            if (p) same(rel, text, at, p, 'name', shown, p.name);
          } else if (![...bySlug.values()].some((p) => p.name.toLowerCase() === shown.toLowerCase())) {
            warnAt(rel, text, at, null, 'name', `"${shown}" has no link and no project of that name in data/projects.json`);
          }
        }
      }
      if (!n) noCards(rel);
      info.push(`${rel}: ${n} strip card(s) checked`);
    }
  }

  // Our Story: the map pins
  {
    const rel = 'src/our-story.html';
    const text = read(rel);
    if (text) {
      const pinned = new Set();
      let n = 0;
      for (const m of text.matchAll(/\{\s*slug:\s*'([^']+)',\s*name:\s*'([^']*)'/g)) {
        n++;
        pinned.add(m[1]);
        const p = known(rel, text, m.index, m[1]);
        if (p) same(rel, text, m.index, p, 'name', unesc(m[2]), p.name);
      }
      if (!n) noCards(rel);
      else for (const p of listedProjects(projects)) if (!pinned.has(p.slug)) out.push({ code: 'W5', level: 'warn', slug: p.slug, field: null, message: `${p.slug}: is on the portfolio but has no pin on the Our Story map`, plain: null, where: rel });
      info.push(`${rel}: ${n} pin(s) checked`);
    }
  }

  // The project page's old-URL table: every alias must still land on a project
  {
    const rel = 'src/project.html';
    const text = read(rel);
    const block = text && /const SLUG_ALIASES = \{([\s\S]*?)\n\};/.exec(text);
    if (block) {
      const base = text.indexOf(block[0]);
      for (const m of block[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
        if (!bySlug.has(m[2])) out.push({ code: 'W6', level: 'warn', slug: null, field: null, message: `the old address "${m[1]}" points at "${m[2]}", which is not in data/projects.json`, plain: null, where: `${rel}:${lineOf(text, base + block[0].indexOf(m[0]))}` });
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ summaries */

export const errorsOf = (findings) => findings.filter((f) => f.level === 'error');
export const warningsOf = (findings) => findings.filter((f) => f.level === 'warn');

/** One sentence per row for the CSV `check` column: each finding that has words Rebecca can act on, once. */
export function plainNotes(findings, slug) {
  const seen = new Set();
  const out = [];
  for (const f of findings) {
    if (f.slug !== slug || !f.plain || seen.has(f.plain)) continue;
    seen.add(f.plain);
    out.push(f.plain);
  }
  return out;
}

/** The projects in the order the portfolio lists them, for printing. */
export const inPortfolioOrder = portfolioOrder;
