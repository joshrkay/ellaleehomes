/**
 * The portfolio data (data/projects.json) and everything the site generates from it.
 *
 * One list feeds every place a project appears, so the places cannot drift apart:
 *   - the portfolio grid in src/previous-projects.html: the four size bands, the "N homes" counts, the tab
 *     counts, the .proj-card markup and the ItemList JSON-LD (numberOfItems and itemListElement)
 *   - the `const PROJECTS = {...}` block in src/project.html
 *   - the project URLs in sitemap.xml
 *
 * The pages carry a marker pair where generated text goes, and the build replaces everything between the
 * markers (the marker lines included, so none of them ships):
 *
 *     <!-- @projects:cards -->        <!-- @/projects:cards -->        HTML comment, in HTML
 *     // @projects:data               // @/projects:data              line comment, inside a <script>
 *
 * Regions: previous-projects.html has `itemlist`, `tabs` and `cards`; project.html has `data`. A marker may
 * carry a note after its name. The build fails when a marker is missing, doubled or left unreplaced, so a
 * page cannot quietly ship without its projects. Edit the data (see data/README.md), never a region.
 *
 * Phase A of WP5 is a refactor: the output is byte-identical to what the hand-written pages produced. The two
 * shims that keep it that way (LEGACY_ASCII_ESCAPES) are named below, with how to remove them.
 *
 * No dependencies; the build reads this at build time only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_FILE = path.join(ROOT, 'data', 'projects.json');

/** The vocabulary the data uses. The validator and the CSV importer check against these. */
export const STATUSES = ['sold', 'for-sale', 'in-progress', 'photos-only'];
export const STYLES = ['farmhouse', 'contemporary'];
/** The four markets the Fact Sheet names, in its order. */
export const MARKETS = ['Paradise Valley', 'Scottsdale', 'Arcadia', 'Phoenix'];

/**
 * The portfolio's bands, in page order. `title` is both the band heading and the tab label; `comment` is the
 * HTML comment that has always sat above each band (kept so the built page is unchanged).
 * `new` holds the homes that are photographs only for now.
 */
export const BANDS = [
  { key: 'small', comment: 'Up to 4k', title: 'Up to 4,000 sqft' },
  { key: 'mid', comment: '4k\u20136k', title: '4,000 \u2013 6,000 sqft' },
  { key: 'large', comment: '6k+', title: '6,000+ sqft' },
  { key: 'new', comment: 'new photography, details to come', title: 'More projects' },
];
export const BAND_KEYS = BANDS.map((b) => b.key);

/** What the card's corner chip says for each status (photos-only cards have no chip). */
export const STATUS_CHIP = { sold: 'Sold', 'for-sale': 'For Sale', 'in-progress': 'In Progress' };

/** Fields a project's `card` object may override, because the portfolio card and the project page disagree. */
export const CARD_FIELDS = ['name', 'locationLabel', 'year', 'value', 'valueLabel', 'sqft', 'beds', 'baths', 'styleLabel'];

/** Key order in data/projects.json. A key not listed here is kept, after these, in the order it was found. */
export const KEY_ORDER = [
  'slug', 'name', 'status', 'statusLabel', 'market', 'neighborhood', 'locationLabel', 'year',
  'value', 'valueLabel', 'sqft', 'beds', 'baths', 'builder', 'styleLabel', 'style', 'band', 'cardOrder',
  'featured', 'photoFolder', 'cardPhoto', 'heroPhoto', 'gallery', 'storyTitle', 'storyParas', 'amenities', 'card',
];

/**
 * Phase A shim. Five project blocks in src/project.html were written with \uXXXX escapes (the Drive photo pass);
 * the others use the literal character. Both decode to the same string, but the built page keeps its exact bytes
 * only if each block is written the way it was. Delete this set and the five en dashes become literal: no change
 * in what a visitor sees, five strings change in dist.
 */
export const LEGACY_ASCII_ESCAPES = new Set(['5th-st-2', 'camino-sin-nombre', 'cudia', 'desert-cove', 'glenrosa']);

export class ProjectsError extends Error {}

/* ------------------------------------------------------------------ reading and writing the data */

/** @returns {any[]} the projects, in file order */
export function loadProjects(file = DATA_FILE) {
  const rel = path.relative(ROOT, file) || file;
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new ProjectsError(`${rel} could not be read (${err.code || err.message}).`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new ProjectsError(`${rel} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(data)) throw new ProjectsError(`${rel} must be a list of projects.`);
  const seen = new Set();
  data.forEach((p, i) => {
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new ProjectsError(`${rel}: entry ${i + 1} is not a project object.`);
    if (typeof p.slug !== 'string' || !p.slug) throw new ProjectsError(`${rel}: entry ${i + 1} has no slug.`);
    if (seen.has(p.slug)) throw new ProjectsError(`${rel}: the slug "${p.slug}" is used twice.`);
    seen.add(p.slug);
  });
  return data;
}

const isScalar = (v) => v === null || typeof v !== 'object';

/** Pretty JSON, 2-space indent. An array whose items are all short scalar arrays (amenities) puts each on one line. */
function fmtJson(v, indent) {
  if (isScalar(v)) return JSON.stringify(v);
  const inner = indent + '  ';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const items = v.map((x) => (Array.isArray(x) && x.every(isScalar) ? `[${x.map((s) => JSON.stringify(s)).join(', ')}]` : fmtJson(x, inner)));
    return `[\n${items.map((s) => inner + s).join(',\n')}\n${indent}]`;
  }
  const keys = Object.keys(v).filter((k) => v[k] !== undefined);
  if (!keys.length) return '{}';
  return `{\n${keys.map((k) => `${inner}${JSON.stringify(k)}: ${fmtJson(v[k], inner)}`).join(',\n')}\n${indent}}`;
}

/** Put a project's keys in KEY_ORDER (unknown keys after, in their own order). */
export function orderKeys(p) {
  const out = {};
  for (const k of KEY_ORDER) if (k in p && p[k] !== undefined) out[k] = p[k];
  for (const k of Object.keys(p)) if (!(k in out) && p[k] !== undefined) out[k] = p[k];
  return out;
}

/** The exact text of data/projects.json for a list of projects: stable key order, 2-space indent, final newline. */
export function formatProjectsJson(projects) {
  return fmtJson(projects.map(orderKeys), '') + '\n';
}

export function saveProjects(projects, file = DATA_FILE) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, formatProjectsJson(projects), 'utf8');
}

/* ------------------------------------------------------------------ small helpers */

/** Whole number with thousands commas: 4833 becomes "4,833". */
export const fmtInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const fmtMoney = (n) => `$${fmtInt(n)}`;

/** For text and attribute values in generated HTML. */
export const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const isPhotosOnly = (p) => p.status === 'photos-only';
const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';

/** The value the portfolio card shows for a field: the project's `card` override when it has one, else the project's own. */
export function cv(p, field) {
  return p.card && Object.prototype.hasOwnProperty.call(p.card, field) ? p.card[field] : p[field];
}

/** The size band a floor area belongs to. "Up to 4,000" includes 4,000; "6,000+" starts at 6,000. */
export function bandFromSqft(sqft) {
  if (!Number.isFinite(sqft)) return null;
  if (sqft <= 4000) return 'small';
  if (sqft < 6000) return 'mid';
  return 'large';
}

/**
 * The style the portfolio's Style filter places a card under. The filter reads the card's label for the word
 * "farmhouse" or "contemporary" (it does not read the `style` field yet), so this is what a card does today.
 * A label with neither word, or with both, belongs under neither button: null.
 */
export function styleFromLabel(label) {
  const t = String(label ?? '').toLowerCase();
  const f = t.includes('farmhouse');
  const c = t.includes('contemporary');
  if (f === c) return null;
  return f ? 'farmhouse' : 'contemporary';
}

/** The projects in the order the portfolio lists them: by band, then `cardOrder`, then file order. */
export function portfolioOrder(projects) {
  const rank = (p) => BAND_KEYS.indexOf(p.band);
  return projects
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || (a.p.cardOrder ?? Infinity) - (b.p.cardOrder ?? Infinity) || a.i - b.i)
    .map((x) => x.p);
}

/** The homes listed on the portfolio, sitemap and ItemList: every project except the photos-only ones. */
export function listedProjects(projects) {
  return portfolioOrder(projects).filter((p) => !isPhotosOnly(p));
}

/** A picture path as the page should print it inside an attribute that needs a full URL (JSON-LD, meta). */
export function absoluteUrl(u, origin) {
  if (!has(u)) return u;
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(u) ? u : `${origin}/${String(u).replace(/^\.?\//, '')}`;
}

/* ------------------------------------------------------------------ the portfolio grid */

/** One .proj-card. Every part that has no data is left out, never replaced by a placeholder. */
function renderCard(p) {
  const name = escHtml(cv(p, 'name') ?? p.slug);
  const href = `project.html?slug=${encodeURIComponent(p.slug)}`;
  const photo = cv(p, 'cardPhoto') ?? p.cardPhoto;
  const loc = has(cv(p, 'locationLabel')) ? escHtml(cv(p, 'locationLabel')) : '';
  const img = has(photo) ? escHtml(photo) : '';
  const L = [];
  L.push(`    <div class="proj-card" data-sqft="${cv(p, 'sqft') ?? 0}" data-price="${cv(p, 'value') ?? 0}" data-year="${cv(p, 'year') ?? 0}" data-band="${escHtml(p.band ?? '')}">`);
  if (isPhotosOnly(p)) {
    L.push(`      <div class="proj-card-img"><a href="${href}" class="proj-card-img-link" aria-label="View ${name} project"><img src="${img}" alt="${name}" loading="lazy" data-img="card"></a></div>`);
    L.push('      <div class="proj-card-body">');
    if (loc) L.push(`        <div class="proj-card-location">${loc}</div>`);
    L.push(`        <div class="proj-card-name">${name}</div>`);
    L.push('        <div class="proj-card-price">Details coming soon</div>');
    L.push(`        <a href="${href}" class="proj-card-link">View Project</a>`);
    L.push('      </div>');
  } else {
    const styleLabel = cv(p, 'styleLabel');
    const alt = `${has(styleLabel) ? `${styleLabel} custom home` : 'Custom home'} by Ella Lee Homes${loc ? ` in ${cv(p, 'locationLabel')}` : ''}, ${cv(p, 'name') ?? p.slug}`;
    const year = cv(p, 'year');
    const chip = STATUS_CHIP[p.status];
    const valueLabel = cv(p, 'valueLabel') ?? (cv(p, 'value') != null ? fmtMoney(cv(p, 'value')) : null);
    const beds = cv(p, 'beds');
    const baths = cv(p, 'baths');
    const sqft = cv(p, 'sqft');
    const specs = [has(beds) && `${beds} BD`, has(baths) && `${baths} BA`, has(sqft) && `${fmtInt(sqft)} sqft`].filter(Boolean);
    if (has(year)) L.push(`      <div class="proj-card-year">${escHtml(year)}</div>`);
    if (chip) L.push(`      <div class="proj-card-sold">${chip}</div>`);
    L.push(`      <div class="proj-card-img"><a href="${href}" class="proj-card-img-link" aria-label="View ${name} project"><img src="${img}" alt="${escHtml(alt)}" data-img="card"></a></div>`);
    L.push('      <div class="proj-card-body">');
    if (loc) L.push(`        <div class="proj-card-location">${loc}</div>`);
    if (has(styleLabel)) L.push(`        <div class="proj-card-style">${escHtml(styleLabel)}</div>`);
    L.push(`        <div class="proj-card-name">${name}</div>`);
    if (has(valueLabel)) L.push(`        <div class="proj-card-price"><span class="proj-card-price-label">Completed home value</span>${escHtml(valueLabel)}</div>`);
    if (specs.length) {
      L.push('        <div class="proj-card-specs">');
      L.push(`          ${specs.map((s) => `<span>${s}</span>`).join('')}`);
      L.push('        </div>');
    }
    L.push(`        <a href="${href}" class="proj-card-link">View Project</a>`);
    L.push('      </div>');
  }
  L.push('    </div>');
  return L.join('\n');
}

const homes = (n) => `${n} ${n === 1 ? 'home' : 'homes'}`;

/** The four bands, each with its heading, its "N homes" count and its cards. */
export function renderCards(projects) {
  const ordered = portfolioOrder(projects);
  return BANDS.map((band) => {
    const cards = ordered.filter((p) => p.band === band.key);
    const L = [
      `  <!-- SECTION: ${band.comment} -->`,
      `  <div class="section-band" id="band-${band.key}">`,
      `    <span class="section-band-title">${band.title}</span>`,
      `    <span class="section-band-count">${homes(cards.length)}</span>`,
      '  </div>',
      `  <div class="projects-grid" id="grid-${band.key}">`,
      '',
    ];
    for (const p of cards) L.push(renderCard(p), '');
    L.push('  </div>');
    return L.join('\n');
  }).join('\n\n');
}

/** The "All Homes" tab and one tab per size band, each with its count. */
export function renderTabs(projects) {
  const ordered = portfolioOrder(projects);
  const tab = (filter, label, count, active) =>
    [`  <button class="sqft-tab${active ? ' active' : ''}" data-filter="${filter}" onclick="filterTab(this,'${filter}')">`, `    ${label} <span class="sqft-tab-count" id="count-${filter}">${count}</span>`, '  </button>'].join('\n');
  return [
    tab('all', 'All Homes', listedProjects(projects).length, true),
    ...BANDS.filter((b) => b.key !== 'new').map((b) => tab(b.key, b.title, ordered.filter((p) => p.band === b.key).length, false)),
  ].join('\n');
}

/** The ItemList, as the object the JSON-LD prints (numberOfItems and itemListElement). */
export function itemListObject(projects, origin) {
  const listed = listedProjects(projects);
  return {
    numberOfItems: listed.length,
    itemListElement: listed.map((p, i) => {
      const sqft = cv(p, 'sqft');
      const loc = String(cv(p, 'locationLabel') ?? '').split(',')[0].trim();
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'SingleFamilyResidence',
          name: cv(p, 'name'),
          url: `${origin}/project?slug=${encodeURIComponent(p.slug)}`,
          image: absoluteUrl(cv(p, 'cardPhoto') ?? p.cardPhoto, origin) ?? undefined,
          numberOfRooms: cv(p, 'beds') ?? undefined,
          numberOfBathroomsTotal: cv(p, 'baths') ?? undefined,
          floorSize: sqft != null ? { '@type': 'QuantitativeValue', value: sqft, unitCode: 'FTK' } : undefined,
          address: { '@type': 'PostalAddress', addressLocality: loc || undefined, addressRegion: 'AZ', addressCountry: 'US' },
        },
      };
    }),
  };
}

/** The two generated properties of the page's ItemList: the text between its static head and its closing brace. */
export function renderItemList(projects, origin) {
  const json = JSON.stringify(itemListObject(projects, origin), null, 2).replace(/</g, '\\u003c');
  return json.split('\n').slice(1, -1).join('\n');
}

/** Each listed project's canonical page URL, in portfolio order (the sitemap's project entries). */
export function projectUrls(projects, origin) {
  return listedProjects(projects).map((p) => `${origin}/project?slug=${encodeURIComponent(p.slug)}`);
}

/* ------------------------------------------------------------------ the project page's data block */

/** A JS string literal. `ascii` writes every non-ASCII character as \uXXXX (see LEGACY_ASCII_ESCAPES). */
function jsString(value, ascii) {
  const s = JSON.stringify(String(value ?? ''));
  return ascii ? s.replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`) : s;
}

function jsArray(indent, items, fmt) {
  return items.length ? `[\n${items.map((x) => `${indent}  ${fmt(x)}`).join(',\n')}\n${indent}]` : '[]';
}

/**
 * The `const PROJECTS = {...};` block, in file order (the order decides ties in "Similar Projects"). A value
 * the page cannot use is written the way the page's script already expects an absent one: "" for text and 0
 * for the year.
 */
export function renderProjectsData(projects) {
  const entries = projects.map((p) => {
    const a = LEGACY_ASCII_ESCAPES.has(p.slug);
    const s = (v) => jsString(v, a);
    const money = p.valueLabel ?? (p.value != null ? fmtMoney(p.value) : '');
    return [
      `  ${jsString(p.slug, a)}: {`,
      `    name: ${s(escHtml(p.name ?? ''))},`,
      `    location: ${s(p.locationLabel ?? '')},`,
      `    year: ${p.year ?? 0},`,
      `    status: ${s(p.statusLabel ?? '')},`,
      `    price: ${s(money)},`,
      `    sqft: ${s(p.sqft != null ? fmtInt(p.sqft) : '')},`,
      `    beds: ${s(p.beds != null ? String(p.beds) : '')},`,
      `    baths: ${s(p.baths != null ? String(p.baths) : '')},`,
      `    heroImg: ${s(p.heroPhoto ?? '')},`,
      `    gallery: ${jsArray('    ', p.gallery ?? [], s)},`,
      `    storyTitle: ${s(p.storyTitle ?? '')},`,
      `    storyParas: ${jsArray('    ', p.storyParas ?? [], s)},`,
      `    amenities: ${jsArray('    ', p.amenities ?? [], (m) => `[${s(m[0])}, ${s(m[1])}]`)}`,
      '  }',
    ].join('\n');
  });
  return `const PROJECTS = {\n${entries.join(',\n\n')}\n};`;
}

/* ------------------------------------------------------------------ marker regions in the pages */

/** Which regions each page carries, and what fills them. */
const REGIONS = {
  'previous-projects.html': [
    { name: 'itemlist', render: (projects, o) => renderItemList(projects, o.origin) },
    { name: 'tabs', render: (projects) => renderTabs(projects) },
    { name: 'cards', render: (projects) => renderCards(projects) },
  ],
  'project.html': [{ name: 'data', render: (projects) => renderProjectsData(projects) }],
};

/** The pages that carry a generated region. */
export const PAGES_WITH_PROJECTS = Object.keys(REGIONS);

const startRx = (name) => new RegExp(`^[ \\t]*(?:<!--|//)[ \\t]*@projects:${name}\\b[^\\n]*(?:\\n|$)`, 'gm');
const endRx = (name) => new RegExp(`^[ \\t]*(?:<!--|//)[ \\t]*@/projects:${name}\\b[^\\n]*$`, 'gm');

/**
 * Fill a page's marker regions from the data. Pages without regions come back unchanged. Throws ProjectsError
 * when a page's markers are missing, doubled, out of order, or left over.
 *
 * @param {string} html the page source
 * @param {string} file the page's file name, such as "project.html"
 * @param {any[]} projects
 * @param {{ origin: string }} opts
 */
export function applyProjectRegions(html, file, projects, opts) {
  const regions = REGIONS[file] ?? [];
  for (const { name, render } of regions) {
    const starts = [...html.matchAll(startRx(name))];
    const ends = [...html.matchAll(endRx(name))];
    if (starts.length !== 1 || ends.length !== 1) {
      throw new ProjectsError(`src/${file}: needs exactly one "@projects:${name}" and one "@/projects:${name}" marker line (found ${starts.length} and ${ends.length}).`);
    }
    const from = starts[0].index;
    const to = ends[0].index + ends[0][0].length;
    if (to <= from) throw new ProjectsError(`src/${file}: the "@/projects:${name}" marker comes before "@projects:${name}".`);
    html = html.slice(0, from) + render(projects, opts) + html.slice(to);
  }
  const left = html.match(/@\/?projects:\w+/);
  if (left) throw new ProjectsError(`src/${file}: marker "${left[0]}" is not one this page's build knows.`);
  return html;
}
