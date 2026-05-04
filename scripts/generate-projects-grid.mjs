/**
 * Regenerates the portfolio grid in src/projects.html from wp-project-media.json
 * and the same canonical specs as apply-projects-from-wp.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const media = JSON.parse(fs.readFileSync(path.join(__dirname, 'wp-project-media.json'), 'utf8'));
const projectsPath = path.join(root, 'src', 'projects.html');

const CARDS = [
  { slug: 'charter-oak', sqft: 4833, price: 7035000, year: 2024, name: 'Charter Oak', loc: 'Scottsdale, Arizona', beds: 5, baths: '5.2', priceStr: '$7,035,000' },
  { slug: '68th', sqft: 5214, price: 7035000, year: 2024, name: '68TH & Camelback', loc: 'Paradise Valley, Arizona', beds: 5, baths: '5.5', priceStr: '$7,035,000' },
  { slug: 'dc2', sqft: 5874, price: 4400000, year: 2023, name: 'DC2', loc: 'Arcadia, Arizona', beds: 6, baths: '7.5', priceStr: '$4,400,000' },
  { slug: 'via-estrella', sqft: 6222, price: 5450000, year: 2023, name: 'Via Estrella', loc: 'Scottsdale, Arizona', beds: 5, baths: '6.5', priceStr: '$5,450,000' },
  { slug: '68th-2', sqft: 5197, price: 3750000, year: 2024, name: '68TH 2', loc: 'Paradise Valley, Arizona', beds: 6, baths: '6.5', priceStr: '$3,750,000' },
  { slug: 'dc1', sqft: 5547, price: 4365000, year: 2024, name: 'DC1', loc: 'Scottsdale, Arizona', beds: 6, baths: '7.5', priceStr: '$4,365,000' },
  { slug: 'mitchell', sqft: 3957, price: 2171500, year: 2024, name: 'Mitchell', loc: 'Scottsdale, Arizona', beds: 4, baths: '3.5', priceStr: '$2,171,500' },
  { slug: 'earll', sqft: 4650, price: 3645000, year: 2024, name: 'Earll', loc: 'Scottsdale, Arizona', beds: 5, baths: '6', priceStr: '$3,645,000' },
  { slug: 'hazelwood-1', sqft: 5578, price: 3200000, year: 2024, name: 'Hazelwood 1', loc: 'Scottsdale, Arizona', beds: 5, baths: '5.5', priceStr: '$3,200,000' },
  { slug: 'hazelwood-2', sqft: 5578, price: 0, year: 2024, name: 'Hazelwood 2', loc: 'Scottsdale, Arizona', beds: 5, baths: '5.5', priceStr: '—' },
  { slug: 'apache', sqft: 4200, price: 0, year: 2024, name: 'Apache', loc: 'Scottsdale, Arizona', beds: 5, baths: '5', priceStr: '—' },
  { slug: '41st', sqft: 4606, price: 0, year: 2024, name: '41ST', loc: 'Scottsdale, Arizona', beds: 4, baths: '3.5', priceStr: '—' },
  { slug: '5th-st', sqft: 5578, price: 0, year: 2024, name: '5TH ST', loc: 'Scottsdale, Arizona', beds: 5, baths: '5.5', priceStr: '—' },
  { slug: '4th-st', sqft: 5578, price: 0, year: 2025, name: '4TH ST', loc: 'Scottsdale, Arizona', beds: 5, baths: '5.5', priceStr: '—' },
  { slug: '2nd-st', sqft: 5578, price: 0, year: 2024, name: '2ND ST', loc: 'Scottsdale, Arizona', beds: 5, baths: '5.5', priceStr: '—' },
  { slug: 'coolidge', sqft: 5578, price: 0, year: 2025, name: 'Coolidge', loc: 'Scottsdale, Arizona', beds: 3, baths: '3.5', priceStr: '—' },
  { slug: 'larkspur', sqft: 5578, price: 0, year: 2025, name: 'Larkspur', loc: 'Scottsdale, Arizona', beds: 3, baths: '3.5', priceStr: '—' },
];

function bandFor(sqft) {
  if (sqft <= 4000) return 'small';
  if (sqft >= 6000) return 'large';
  return 'mid';
}

function cardHtml(c) {
  const b = bandFor(c.sqft);
  const hero = media[c.slug]?.hero || '';
  const yr = c.year ? `      <div class="proj-card-year">${c.year}</div>\n` : '';
  const sq = c.sqft.toLocaleString('en-US');
  const nameEsc = c.name.replace(/&/g, '&amp;');
  const ariaLabel = `View ${c.name} project`.replace(/&/g, 'and');
  return `    <div class="proj-card" data-sqft="${c.sqft}" data-price="${c.price}" data-year="${c.year || 0}" data-band="${b}">
${yr}      <div class="proj-card-sold">Sold</div>
      <div class="proj-card-img"><a href="project.html?slug=${c.slug}" class="proj-card-img-link" aria-label="${ariaLabel}"><img src="${hero}" alt="${nameEsc}"></a></div>
      <div class="proj-card-body">
        <div class="proj-card-location">${c.loc}</div>
        <div class="proj-card-name">${c.name.replace(/&/g, '&amp;')}</div>
        <div class="proj-card-price">${c.priceStr}</div>
        <div class="proj-card-specs">
          <span>${c.beds} BD</span><span>${c.baths} BA</span><span>${sq} sqft</span>
        </div>
        <a href="project.html?slug=${c.slug}" class="proj-card-link">View Project</a>
      </div>
    </div>`;
}

const small = CARDS.filter((c) => bandFor(c.sqft) === 'small');
const mid = CARDS.filter((c) => bandFor(c.sqft) === 'mid');
const large = CARDS.filter((c) => bandFor(c.sqft) === 'large');

const gridInner = `<!-- PROJECT GRID (synced from ellaleehomes.com/previous-projects/) -->
  <!-- SECTION: Up to 4k -->
  <div class="section-band" id="band-small">
    <span class="section-band-title">Up to 4,000 sqft</span>
    <div class="section-band-line"></div>
    <span class="section-band-count">${small.length} home${small.length === 1 ? '' : 's'}</span>
  </div>
  <div class="projects-grid" id="grid-small">

${small.map(cardHtml).join('\n\n')}

  </div>

  <!-- SECTION: 4k–6k -->
  <div class="section-band" id="band-mid">
    <span class="section-band-title">4,000 – 6,000 sqft</span>
    <div class="section-band-line"></div>
    <span class="section-band-count">${mid.length} homes</span>
  </div>
  <div class="projects-grid" id="grid-mid">

${mid.map(cardHtml).join('\n\n')}

  </div>

  <!-- SECTION: 6k+ -->
  <div class="section-band" id="band-large">
    <span class="section-band-title">6,000+ sqft</span>
    <div class="section-band-line"></div>
    <span class="section-band-count">${large.length} home${large.length === 1 ? '' : 's'}</span>
  </div>
  <div class="projects-grid" id="grid-large">

${large.map(cardHtml).join('\n\n')}

  </div>`;

function replaceGridInner(html, newInner) {
  const openTag = '<div id="grid-container">';
  const start = html.indexOf(openTag);
  if (start === -1) throw new Error('no grid-container');
  let i = start + openTag.length;
  let depth = 1;
  while (depth > 0 && i < html.length) {
    const o = html.indexOf('<div', i);
    const c = html.indexOf('</div>', i);
    if (c === -1) throw new Error('unbalanced divs in grid-container');
    if (o !== -1 && o < c) {
      depth++;
      i = o + 4;
    } else {
      depth--;
      i = c + 6;
    }
  }
  const prefix = html.slice(0, start + openTag.length);
  return prefix + '\n' + newInner + '\n</div>' + html.slice(i);
}

let html = replaceGridInner(fs.readFileSync(projectsPath, 'utf8'), gridInner);

const n = CARDS.length;
const ns = small.length;
const nm = mid.length;
const nl = large.length;
html = html.replace(
  /<span id="result-count">\d+<\/span>/,
  `<span id="result-count">${n}</span>`
);
html = html.replace(/id="count-all">\d+/, `id="count-all">${n}`);
html = html.replace(/id="count-small">\d+/, `id="count-small">${ns}`);
html = html.replace(/id="count-mid">\d+/, `id="count-mid">${nm}`);
html = html.replace(/id="count-large">\d+/, `id="count-large">${nl}`);
fs.writeFileSync(projectsPath, html);
console.log('Updated projects grid:', projectsPath);
