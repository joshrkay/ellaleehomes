/**
 * Rebuilds src/project.html PROJECTS from scripts/wp-project-media.json + canonical specs
 * aligned to https://ellaleehomes.com/previous-projects/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mediaPath = path.join(__dirname, 'wp-project-media.json');
const htmlPath = path.join(root, 'src', 'project.html');

const media = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));

/** Copy, pricing row, and WP body copy — matches live portfolio listing where shown. */
const SPECS = {
  mitchell: {
    name: 'Mitchell',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '$2,171,500',
    sqft: '3,957',
    beds: '4',
    baths: '3.5',
    storyTitle: 'Refined Contemporary Living in <em>Scottsdale.</em>',
    storyParas: [
      'Mitchell is a refined contemporary residence in Scottsdale — clean architecture, open sightlines, and warm natural light. The design balances simplicity with everyday comfort.',
      'The home offers four bedrooms and three-and-a-half baths across about 3,957 sq ft of total space, with a layout that connects living, dining, and kitchen in one smooth flow. Large windows and modern finishes carry through the plan, and outdoor living extends the home’s usable space.',
    ],
  },
  'hazelwood-1': {
    name: 'Hazelwood 1',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '$3,200,000',
    sqft: '5,578',
    beds: '5',
    baths: '5.5',
    storyTitle: 'Modern Farmhouse on <em>Hazelwood.</em>',
    storyParas: [
      'Hazelwood 1 sits in the heart of Scottsdale with clean architecture, open sightlines, and natural light throughout. The plan emphasizes simplicity, balance, and a calm, welcoming environment.',
      'Inside, living, dining, and kitchen flow together while bedrooms read as private retreats. Outside, outdoor living extends the home for gatherings and quiet mornings under the Arizona sky.',
    ],
  },
  'hazelwood-2': {
    name: 'Hazelwood 2',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '—',
    sqft: '5,578',
    beds: '5',
    baths: '5.5',
    storyTitle: 'Single Family Farmhouse — <em>Hazelwood 2.</em>',
    storyParas: [
      'Hazelwood 2 is a single-family modern farmhouse in Scottsdale: open interiors, warm light, and a layout built for both comfort and function.',
      'About 4,153 sq ft livable and 5,578 sq ft total, with five bedrooms and five-and-a-half baths. Outdoor spaces mirror the ease of the interiors — ideal for hosting or unwinding.',
    ],
  },
  apache: {
    name: 'Apache',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '—',
    sqft: '4,200',
    beds: '5',
    baths: '5',
    storyTitle: 'Custom Home — <em>Apache.</em>',
    storyParas: [
      'Apache showcases modern architecture with spacious interiors and abundant natural light. Living, dining, and kitchen integrate into a seamless flow.',
      'Five bedrooms and five baths, with about 3,506 sq ft livable and 4,200 sq ft total on a 7,000 sq ft lot — plus covered patio and generous garage space.',
    ],
  },
  '68th': {
    name: '68TH &amp; Camelback',
    location: 'Paradise Valley, Arizona',
    year: 2024,
    status: 'Sold 2024',
    price: '$7,035,000',
    sqft: '5,214',
    beds: '5',
    baths: '5.5',
    storyTitle: 'Resort Living in <em>Paradise Valley.</em>',
    storyParas: [
      'On a generous Paradise Valley lot, this home pairs contemporary massing with outdoor living at scale — covered patios, pool, and long views toward Camelback.',
      'Five bedrooms, five-and-a-half baths, and 5,214 sq ft support both private family life and large gatherings, with strong indoor–outdoor connection throughout.',
    ],
  },
  '68th-2': {
    name: '68TH 2',
    location: 'Paradise Valley, Arizona',
    year: 2024,
    status: 'Sold',
    price: '$3,750,000',
    sqft: '5,197',
    beds: '6',
    baths: '6.5',
    storyTitle: 'Estate Living on <em>68th Street.</em>',
    storyParas: [
      '68TH 2 continues the Ella Lee Homes standard for generous room sizes, layered outdoor spaces, and light-filled interiors.',
      'Six bedrooms, six-and-a-half baths, and 5,197 sq ft — scaled for multi-generational living and entertaining.',
    ],
  },
  '41st': {
    name: '41ST',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '—',
    sqft: '4,606',
    beds: '4',
    baths: '3.5',
    storyTitle: 'Custom Home on <em>41st Street.</em>',
    storyParas: [
      '41ST offers modern design on a 12,651 sq ft lot with open layouts and natural light in every room.',
      'Four bedrooms, three-and-a-half baths, with 3,326 sq ft livable and 4,606 sq ft total — plus covered patio and three-car-scale garage program.',
    ],
  },
  '5th-st': {
    name: '5TH ST',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '—',
    sqft: '5,578',
    beds: '5',
    baths: '5.5',
    storyTitle: 'Modern Farmhouse on <em>5th Street.</em>',
    storyParas: [
      '5TH ST combines contemporary architecture with approachable scale — bright interiors and a connected kitchen, dining, and living core.',
      'Five bedrooms, five-and-a-half baths, with 4,153 sq ft livable and 5,578 sq ft total on about a third-acre lot.',
    ],
  },
  '4th-st': {
    name: '4TH ST',
    location: 'Scottsdale, Arizona',
    year: 2025,
    status: 'Sold',
    price: '—',
    sqft: '5,578',
    beds: '5',
    baths: '5.5',
    storyTitle: 'Custom Home on <em>4th Street.</em>',
    storyParas: [
      '4TH ST is designed for everyday ease — open spaces, strong daylight, and a layout that moves naturally from indoors to out.',
      'Five bedrooms, five-and-a-half baths, with 4,153 sq ft livable and 5,578 sq ft total.',
    ],
  },
  '2nd-st': {
    name: '2ND ST',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '—',
    sqft: '5,578',
    beds: '5',
    baths: '5.5',
    storyTitle: 'Modern Farmhouse on <em>2nd Street.</em>',
    storyParas: [
      '2ND ST delivers a quiet, refined floor plan with modern lines and warm, light-filled rooms.',
      'Five bedrooms, five-and-a-half baths, with 4,153 sq ft livable and 5,578 sq ft total.',
    ],
  },
  'via-estrella': {
    name: 'Via Estrella',
    location: 'Scottsdale, Arizona',
    year: 2023,
    status: 'Sold 2023',
    price: '$5,450,000',
    sqft: '6,222',
    beds: '5',
    baths: '6.5',
    storyTitle: 'A Star Among <em>Arizona Estates.</em>',
    storyParas: [
      'Via Estrella is one of the largest plans in the portfolio — over 6,200 sq ft with layered outdoor living and a strong indoor–outdoor rhythm.',
      'Five bedrooms and six-and-a-half baths support estate-scale entertaining while keeping private suites calm and separate.',
    ],
  },
  dc2: {
    name: 'DC2',
    location: 'Arcadia, Arizona',
    year: 2023,
    status: 'Sold 2023',
    price: '$4,400,000',
    sqft: '5,874',
    beds: '6',
    baths: '7.5',
    storyTitle: 'Desert Contemporary in <em>Arcadia.</em>',
    storyParas: [
      'DC2 is a desert-contemporary statement — clean lines, generous glazing, and rooms scaled for both family life and hosting.',
      'Six bedrooms, seven-and-a-half baths, and 5,874 sq ft anchor the program with flexible living zones and strong connection to outdoor space.',
    ],
  },
  dc1: {
    name: 'DC1',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '$4,365,000',
    sqft: '5,547',
    beds: '6',
    baths: '7.5',
    storyTitle: 'Desert Contemporary — <em>DC1.</em>',
    storyParas: [
      'DC1 pairs bold contemporary massing with warm interior materials and long views through oversized openings.',
      'Six bedrooms, seven-and-a-half baths, and 5,547 sq ft — built for multi-generational living and large-scale gatherings.',
    ],
  },
  earll: {
    name: 'Earll',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold',
    price: '$3,645,000',
    sqft: '4,650',
    beds: '5',
    baths: '6',
    storyTitle: 'Modern Farmhouse — <em>Earll.</em>',
    storyParas: [
      'Earll sits in a well-connected Scottsdale neighborhood with modern architecture, open interiors, and warm natural light.',
      'Five bedrooms, six baths, with 4,153 sq ft livable and 4,650 sq ft total on about a third-acre lot.',
    ],
  },
  coolidge: {
    name: 'Coolidge',
    location: 'Scottsdale, Arizona',
    year: 2025,
    status: 'Sold',
    price: '—',
    sqft: '5,578',
    beds: '3',
    baths: '3.5',
    storyTitle: 'Contemporary Living — <em>Coolidge.</em>',
    storyParas: [
      'Coolidge emphasizes comfort and simplicity — open layouts, soft daylight, and refined finishes throughout.',
      'Three bedrooms, three-and-a-half baths, with 4,153 sq ft livable and 5,578 sq ft total.',
    ],
  },
  larkspur: {
    name: 'Larkspur',
    location: 'Scottsdale, Arizona',
    year: 2025,
    status: 'Sold',
    price: '—',
    sqft: '5,578',
    beds: '3',
    baths: '3.5',
    storyTitle: 'Serene Living — <em>Larkspur.</em>',
    storyParas: [
      'Larkspur offers a peaceful, established-neighborhood setting with modern architecture and abundant natural light.',
      'Three bedrooms, three-and-a-half baths, with 4,153 sq ft livable and 5,578 sq ft total.',
    ],
  },
  'charter-oak': {
    name: 'Charter Oak',
    location: 'Scottsdale, Arizona',
    year: 2024,
    status: 'Sold 2024',
    price: '$7,035,000',
    sqft: '4,833',
    beds: '5',
    baths: '5.2',
    storyTitle: 'Quiet Luxury, <em>Effortlessly Refined.</em>',
    storyParas: [
      'Charter Oak layers warm materials with quiet detailing — plaster tones, wood accents, and brass moments that age beautifully.',
      'Five bedrooms, five full and two partial baths, and 4,833 sq ft — with outdoor living centered on pool, shade, and gathering spaces.',
    ],
  },
};

const SLUG_ORDER = [
  'charter-oak',
  '68th',
  'dc2',
  'via-estrella',
  '68th-2',
  'dc1',
  'mitchell',
  'earll',
  'hazelwood-1',
  'hazelwood-2',
  'apache',
  '41st',
  '5th-st',
  '4th-st',
  '2nd-st',
  'coolidge',
  'larkspur',
];

function amenitiesDefault(spec) {
  const rows = [
    [`${spec.beds} Bedrooms`, 'Private suites with thoughtful storage'],
    [`${spec.baths} Bathrooms`, 'Designer fixtures and finishes'],
    [`${spec.sqft.replace(/,/g, '')} sq ft`, 'Total area per published plan'],
    [spec.location.split(',')[0], 'Arizona custom build'],
    ['Indoor–outdoor living', 'Connected main living spaces'],
    ['Ella Lee Homes build', 'See live site for full amenity list'],
  ];
  return rows;
}

function jsString(s) {
  return JSON.stringify(s);
}

function formatGallery(urls) {
  const lines = urls.map((u) => `      ${jsString(u)}`);
  return `[\n${lines.join(',\n')}\n    ]`;
}

function formatProject(slug) {
  const spec = SPECS[slug];
  const m = media[slug];
  if (!spec || !m) throw new Error(`Missing spec or media for ${slug}`);
  const hero = m.hero || m.images[0];
  const imgs = m.images.length ? m.images : [hero];
  const amenities = amenitiesDefault(spec);
  const amJs = amenities
    .map(([a, b]) => `      [${jsString(a)}, ${jsString(b)}]`)
    .join(',\n');

  const paras = spec.storyParas.map((p) => `      ${jsString(p)}`).join(',\n');

  return `  ${jsString(slug)}: {
    name: ${jsString(spec.name)},
    location: ${jsString(spec.location)},
    year: ${spec.year},
    status: ${jsString(spec.status)},
    price: ${jsString(spec.price)},
    sqft: ${jsString(spec.sqft)},
    beds: ${jsString(spec.beds)},
    baths: ${jsString(spec.baths)},
    heroImg: ${jsString(hero)},
    gallery: ${formatGallery(imgs)},
    storyTitle: ${jsString(spec.storyTitle)},
    storyParas: [
${paras}
    ],
    amenities: [
${amJs}
    ]
  }`;
}

const projectsBody = SLUG_ORDER.map(formatProject).join(',\n\n');

const SLUG_ALIASES = {
  '68th-camelback': '68th',
  'earll-drive': 'earll',
  'mitchell-home': 'mitchell',
  'desert-oasis': 'apache',
  'desert-contemporary-ii': 'dc2',
  'hazelwood-estate': 'hazelwood-1',
  'oak-street': 'hazelwood-1',
  'silverleaf-retreat': '41st',
  'arcadia-crest': 'dc2',
  'paradise-ridge': '68th-2',
  'sierra-vista-modern': 'earll',
  'oakwood-contemporary': 'charter-oak',
  'hawthorne-residence': 'via-estrella',
  'canyon-edge-estate': '5th-st',
  'scottsdale-summit': 'dc1',
  '4th-street': '4th-st',
  'camelback-vista': 'via-estrella',
  camino: 'mitchell',
  moody: 'hazelwood-1',
  glenrosa: 'larkspur',
};

const aliasesJs =
  'const SLUG_ALIASES = {\n' +
  Object.entries(SLUG_ALIASES)
    .map(([k, v]) => `  ${jsString(k)}: ${jsString(v)}`)
    .join(',\n') +
  '\n};\n\n';

const newBlock =
  `const PROJECTS = {\n${projectsBody}\n};\n\n` +
  aliasesJs;

let html = fs.readFileSync(htmlPath, 'utf8');
const startPat = 'const PROJECTS = {';
const endPat = '\nconst AMENITY_ICONS';
const start = html.indexOf(startPat);
const end = html.indexOf(endPat, start);
if (start === -1 || end === -1) {
  throw new Error('Could not find PROJECTS … AMENITY_ICONS boundaries');
}
html = html.slice(0, start) + newBlock + html.slice(end);

html = html.replace(
  /const slug = params\.get\('slug'\) \|\| '[^']+';/,
  "const rawSlug = params.get('slug') || '68th';\n  const slug = SLUG_ALIASES[rawSlug] || rawSlug;"
);

fs.writeFileSync(htmlPath, html);
console.log('Updated', htmlPath);
