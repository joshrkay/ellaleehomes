#!/usr/bin/env node
/**
 * Injects partials (nav, footer, cursor) into src/*.html and emits dist/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const distDir = path.join(root, 'dist');
const srcDir = path.join(root, 'src');
const partialPath = path.join(root, 'partials', 'nav.html');
const footerPath = path.join(root, 'partials', 'footer.html');
const cursorPath = path.join(root, 'partials', 'cursor.html');

const PLACEHOLDER = '<!-- NAV_PARTIAL -->';
const FOOTER_PLACEHOLDER = '<!-- FOOTER_PARTIAL -->';
const CURSOR_PLACEHOLDER = '<!-- CURSOR_PARTIAL -->';

const partialTemplate = fs.readFileSync(partialPath, 'utf8');
const footerTemplate = fs.readFileSync(footerPath, 'utf8');
const cursorTemplate = fs.readFileSync(cursorPath, 'utf8');

/** Canonical origin of the live site, used for sitemap URLs. */
const SITE_ORIGIN = 'https://ellaleehomes.com';

/** Where the nav's "Schedule a Consultation" button points. */
const CTA_HOME = 'index.html#inquiry';
const CTA_CONTACT = 'contact.html';

/**
 * `theme` is the nav's per-page colour class (see assets/site-nav.css and
 * assets/site-nav-contrast.js). `active` marks the current top-level nav
 * entry. `nav` / `cursor` say whether a page takes those shared partials —
 * the homepage carries its own header and drag interactions, so it opts out
 * of both.
 *
 * `url` is the page's path on the live site, which is not the built filename —
 * the pages' own `rel="canonical"` tags point at trailing-slash paths, and a
 * few use a different slug there (process → /build-your-home/). It doubles as
 * the sitemap entry; `url: null` keeps a page out of the sitemap, and every
 * page must state one or the other so a new page cannot be forgotten.
 *
 * @typedef {'portfolio'|'process'|'sell'|'about'} NavEntry
 * @typedef {{ file: string; url: string | null; changefreq?: string; priority?: string; theme?: string; cta?: string; nav?: boolean; cursor?: boolean; active?: Partial<Record<NavEntry, boolean>> }} PageCfg
 */

/** @type {PageCfg[]} */
const PAGES = [
  { file: 'index.html', url: '/', changefreq: 'weekly', priority: '1.0', nav: false, cursor: false },

  // Primary pages
  { file: 'projects.html', url: '/previous-projects/', changefreq: 'weekly', priority: '0.9', theme: 'theme-projects', cta: CTA_HOME, active: { portfolio: true } },
  // The project detail template renders per-slug; those URLs are listed from
  // the portfolio's own structured data instead of this entry.
  { file: 'project.html', url: null, theme: 'theme-portfolio', cta: CTA_HOME, active: { portfolio: true } },
  { file: 'process.html', url: '/build-your-home/', changefreq: 'monthly', priority: '0.9', theme: 'theme-process', cta: CTA_HOME, active: { process: true } },
  { file: 'sell.html', url: '/sell-your-home/', changefreq: 'monthly', priority: '0.7', theme: 'theme-sell', cta: CTA_HOME, active: { sell: true } },
  { file: 'our-story.html', url: '/our-story/', changefreq: 'monthly', priority: '0.9', theme: 'theme-about', cta: CTA_HOME, active: { about: true } },
  // Print variant of Our Story — same content, so it stays out of the index.
  { file: 'our-story-print.html', url: null, theme: 'theme-about', cta: CTA_HOME, active: { about: true } },
  { file: 'why-us.html', url: '/why-us/', changefreq: 'monthly', priority: '0.8', theme: 'theme-why-us', cta: CTA_HOME },
  { file: 'investors.html', url: '/developers/', changefreq: 'monthly', priority: '0.7', theme: 'theme-investors', cta: CTA_HOME },
  { file: 'stories.html', url: '/stories/', changefreq: 'weekly', priority: '0.7', theme: 'theme-stories', cta: CTA_HOME },
  // Carries `robots: noindex` and is disallowed in robots.txt.
  { file: 'client-portal.html', url: null, theme: 'theme-portal', cta: CTA_HOME },
  { file: 'contact.html', url: '/contact/', changefreq: 'monthly', priority: '0.8', theme: 'theme-portal', cta: CTA_CONTACT },

  // Help / legal
  { file: 'faq.html', url: '/faq/', changefreq: 'monthly', priority: '0.7', theme: 'theme-faq', cta: CTA_CONTACT },
  { file: 'privacy.html', url: '/privacy/', changefreq: 'yearly', priority: '0.3', theme: 'theme-faq', cta: CTA_CONTACT },
  { file: 'terms.html', url: '/terms/', changefreq: 'yearly', priority: '0.3', theme: 'theme-faq', cta: CTA_CONTACT },
  { file: 'disclaimer.html', url: '/disclaimer/', changefreq: 'yearly', priority: '0.3', theme: 'theme-faq', cta: CTA_CONTACT },

  // Articles
  { file: 'steps-to-building-a-custom-home.html', url: '/steps-to-building-a-custom-home/', changefreq: 'monthly', priority: '0.6', theme: 'theme-stories', cta: CTA_CONTACT },
  { file: 'how-to-find-a-custom-home-builder.html', url: '/how-to-find-a-custom-home-builder/', changefreq: 'monthly', priority: '0.6', theme: 'theme-stories', cta: CTA_CONTACT },
  { file: 'is-custom-home-building-a-good-investment.html', url: '/is-custom-home-building-a-good-investment/', changefreq: 'monthly', priority: '0.6', theme: 'theme-stories', cta: CTA_CONTACT },
  { file: 'new-luxury-essentials-custom-homes-arizona.html', url: '/new-luxury-essentials-custom-homes-arizona/', changefreq: 'monthly', priority: '0.6', theme: 'theme-stories', cta: CTA_CONTACT },
  {
    file: 'exploring-the-costs-of-building-your-dream-home-a-comprehensive-guide.html',
    url: '/exploring-the-costs-of-building-your-dream-home-a-comprehensive-guide/',
    changefreq: 'monthly',
    priority: '0.6',
    theme: 'theme-stories',
    cta: CTA_CONTACT,
  },
  {
    file: 'why-choosing-a-professional-home-builder-matters-for-your-custom-house.html',
    url: '/why-choosing-a-professional-home-builder-matters-for-your-custom-house/',
    changefreq: 'monthly',
    priority: '0.6',
    theme: 'theme-stories',
    cta: CTA_CONTACT,
  },
];

function aria(on) {
  return on ? ' aria-current="page"' : '';
}

/**
 * @param {PageCfg} page
 */
function renderNav(page) {
  const active = page.active ?? {};
  const map = {
    __THEME__: page.theme ?? '',
    __HREF_CTA__: page.cta ?? CTA_HOME,
    __ARIA_PORTFOLIO__: aria(active.portfolio),
    __ARIA_PROCESS__: aria(active.process),
    __ARIA_SELL__: aria(active.sell),
    __ARIA_ABOUT__: aria(active.about),
  };
  let html = partialTemplate;
  for (const [token, val] of Object.entries(map)) {
    html = html.replaceAll(token, val);
  }
  return html;
}

/**
 * The footer links to homepage sections, so off the homepage those anchors
 * need to be prefixed with the page itself.
 *
 * @param {boolean} isHome
 */
function renderFooter(isHome) {
  return footerTemplate.replaceAll('__HOME__', isHome ? '' : 'index.html');
}

/**
 * Project detail URLs, read from the portfolio's own JSON-LD ItemList so the
 * sitemap cannot drift from the projects actually on the site.
 *
 * @returns {string[]}
 */
function projectUrls() {
  const html = fs.readFileSync(path.join(srcDir, 'projects.html'), 'utf8');
  const blocks = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
  for (const [, body] of blocks) {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      continue; // not the block we want
    }
    if (data['@type'] !== 'ItemList') continue;
    const urls = (data.itemListElement ?? [])
      .map((entry) => entry?.url ?? entry?.item?.url)
      .filter((u) => typeof u === 'string' && u.startsWith(SITE_ORIGIN));
    if (urls.length) return urls;
  }
  console.error('No project URLs found in the ItemList structured data of projects.html');
  process.exit(1);
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * @param {{ loc: string; changefreq?: string; priority?: string }[]} entries
 */
function renderSitemap(entries) {
  const urls = entries
    .map(({ loc, changefreq, priority }) =>
      [
        '  <url>',
        `    <loc>${xmlEscape(loc)}</loc>`,
        changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
        priority ? `    <priority>${priority}</priority>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/build-html.mjs from the PAGES table — do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls}

</urlset>
`;
}

function writeSitemap() {
  for (const page of PAGES) {
    if (!('url' in page)) {
      console.error('Page missing a sitemap `url` (use null to exclude):', page.file);
      process.exit(1);
    }
  }
  const entries = PAGES.filter((p) => p.url).map((p) => ({
    loc: SITE_ORIGIN + p.url,
    changefreq: p.changefreq,
    priority: p.priority,
  }));
  for (const loc of projectUrls()) {
    entries.push({ loc, changefreq: 'yearly', priority: '0.5' });
  }
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), renderSitemap(entries), 'utf8');
  console.log('Wrote', path.join('dist', 'sitemap.xml'), `(${entries.length} urls)`);
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const s = path.join(from, name);
    const t = path.join(to, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, t);
    else fs.copyFileSync(s, t);
  }
}

fs.mkdirSync(distDir, { recursive: true });

// Every page in src/ must be accounted for, or it would silently stop shipping.
const configured = new Set(PAGES.map((p) => p.file));
const onDisk = fs.readdirSync(srcDir).filter((f) => f.endsWith('.html'));
const unconfigured = onDisk.filter((f) => !configured.has(f));
if (unconfigured.length) {
  console.error('Pages in src/ missing from PAGES:', unconfigured.join(', '));
  process.exit(1);
}

for (const page of PAGES) {
  const srcFile = path.join(srcDir, page.file);
  if (!fs.existsSync(srcFile)) {
    console.error('Missing source file:', srcFile);
    process.exit(1);
  }
  let content = fs.readFileSync(srcFile, 'utf8');
  const wantsNav = page.nav !== false;
  const wantsCursor = page.cursor !== false;
  const required = [
    [FOOTER_PLACEHOLDER, true],
    [PLACEHOLDER, wantsNav],
    [CURSOR_PLACEHOLDER, wantsCursor],
  ];
  for (const [token, needed] of required) {
    if (needed && !content.includes(token)) {
      console.error('Missing', token, 'in', page.file);
      process.exit(1);
    }
  }
  if (wantsNav) {
    content = content.split(PLACEHOLDER).join(renderNav(page));
  }
  const isHome = page.file === 'index.html';
  content = content.split(FOOTER_PLACEHOLDER).join(renderFooter(isHome));
  if (wantsCursor) {
    content = content.split(CURSOR_PLACEHOLDER).join(cursorTemplate);
  }
  fs.writeFileSync(path.join(distDir, page.file), content, 'utf8');
  console.log('Wrote', path.join('dist', page.file));
}

writeSitemap();

// Root-level files that ship as-is.
for (const name of ['robots.txt']) {
  const from = path.join(srcDir, name);
  if (!fs.existsSync(from)) {
    console.error('Missing source file:', from);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(distDir, name));
  console.log('Wrote', path.join('dist', name));
}

copyDir(path.join(root, 'assets'), path.join(distDir, 'assets'));
copyDir(path.join(root, 'uploads'), path.join(distDir, 'uploads'));
console.log('Copied assets/ and uploads/ → dist/');
