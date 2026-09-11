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
 * @typedef {'portfolio'|'process'|'sell'|'about'} NavEntry
 * @typedef {{ file: string; theme?: string; cta?: string; nav?: boolean; cursor?: boolean; active?: Partial<Record<NavEntry, boolean>> }} PageCfg
 */

/** @type {PageCfg[]} */
const PAGES = [
  { file: 'index.html', nav: false, cursor: false },

  // Primary pages
  { file: 'projects.html', theme: 'theme-projects', cta: CTA_HOME, active: { portfolio: true } },
  { file: 'project.html', theme: 'theme-portfolio', cta: CTA_HOME, active: { portfolio: true } },
  { file: 'process.html', theme: 'theme-process', cta: CTA_HOME, active: { process: true } },
  { file: 'sell.html', theme: 'theme-sell', cta: CTA_HOME, active: { sell: true } },
  { file: 'our-story.html', theme: 'theme-about', cta: CTA_HOME, active: { about: true } },
  { file: 'our-story-print.html', theme: 'theme-about', cta: CTA_HOME, active: { about: true } },
  { file: 'why-us.html', theme: 'theme-why-us', cta: CTA_HOME },
  { file: 'investors.html', theme: 'theme-investors', cta: CTA_HOME },
  { file: 'stories.html', theme: 'theme-stories', cta: CTA_HOME },
  { file: 'client-portal.html', theme: 'theme-portal', cta: CTA_HOME },
  { file: 'contact.html', theme: 'theme-portal', cta: CTA_CONTACT },

  // Help / legal
  { file: 'faq.html', theme: 'theme-faq', cta: CTA_CONTACT },
  { file: 'privacy.html', theme: 'theme-faq', cta: CTA_CONTACT },
  { file: 'terms.html', theme: 'theme-faq', cta: CTA_CONTACT },
  { file: 'disclaimer.html', theme: 'theme-faq', cta: CTA_CONTACT },

  // Articles
  { file: 'steps-to-building-a-custom-home.html', theme: 'theme-stories', cta: CTA_CONTACT },
  { file: 'how-to-find-a-custom-home-builder.html', theme: 'theme-stories', cta: CTA_CONTACT },
  { file: 'is-custom-home-building-a-good-investment.html', theme: 'theme-stories', cta: CTA_CONTACT },
  { file: 'new-luxury-essentials-custom-homes-arizona.html', theme: 'theme-stories', cta: CTA_CONTACT },
  {
    file: 'exploring-the-costs-of-building-your-dream-home-a-comprehensive-guide.html',
    theme: 'theme-stories',
    cta: CTA_CONTACT,
  },
  {
    file: 'why-choosing-a-professional-home-builder-matters-for-your-custom-house.html',
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

copyDir(path.join(root, 'assets'), path.join(distDir, 'assets'));
copyDir(path.join(root, 'uploads'), path.join(distDir, 'uploads'));
console.log('Copied assets/ and uploads/ → dist/');
