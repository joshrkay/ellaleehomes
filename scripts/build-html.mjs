#!/usr/bin/env node
/**
 * Builds dist/ from src/.
 *
 * Pages may be authored one of two ways:
 *  1. Self-contained — nav/footer/cursor markup is inlined directly in the page.
 *     These are copied through verbatim.
 *  2. Placeholder-based — the page contains <!-- NAV_PARTIAL -->,
 *     <!-- FOOTER_PARTIAL --> and/or <!-- CURSOR_PARTIAL -->, which are
 *     replaced with the shared partials at build time.
 *
 * Every *.html in src/ is emitted; other files (robots.txt, sitemap.xml, …)
 * are copied through. assets/ and uploads/ are copied alongside so pages
 * resolve `assets/…` and `uploads/…` correctly.
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

/**
 * @typedef {{ navClass: string; active: Partial<Record<'why'|'portfolio'|'process'|'about'|'investors', boolean>> }} PageCfg
 */

/**
 * Per-page nav config, used only when a page still contains the nav
 * placeholder. Self-contained pages ignore this.
 * @type {Record<string, PageCfg>}
 */
const PAGE_CFG = {
  'index.html': { navClass: 'compact', active: {} },
  'projects.html': { navClass: '', active: { portfolio: true } },
  'process.html': { navClass: '', active: { process: true } },
  'project.html': { navClass: '', active: { portfolio: true } },
  'our-story.html': { navClass: '', active: { about: true } },
};

function aria(on) {
  return on ? ' aria-current="page"' : '';
}

/**
 * @param {PageCfg['active']} active
 * @param {string} navClass
 */
function renderNav(active, navClass) {
  const map = {
    __ARIA_WHY__: aria(active.why),
    __ARIA_PORTFOLIO__: aria(active.portfolio),
    __ARIA_PROCESS__: aria(active.process),
    __ARIA_ABOUT__: aria(active.about),
    __ARIA_INVESTORS__: aria(active.investors),
  };
  let html = partialTemplate;
  html = html.replace('__NAV_CLASS__', navClass ?? '');
  for (const [token, val] of Object.entries(map)) {
    html = html.replace(token, val);
  }
  return html;
}

/**
 * @param {boolean} isHome
 */
function renderFooter(isHome) {
  const hrefMeet = 'our-story.html';
  const hrefCta = isHome ? '#cta' : 'index.html#cta';
  return footerTemplate.replaceAll('__HREF_MEET__', hrefMeet).replaceAll('__HREF_CTA__', hrefCta);
}

/**
 * Inject shared partials into a page wherever their placeholders appear.
 * Pages with no placeholders are returned unchanged.
 * @param {string} file
 * @param {string} content
 */
function injectPartials(file, content) {
  if (content.includes(PLACEHOLDER)) {
    const cfg = PAGE_CFG[file] ?? { navClass: '', active: {} };
    content = content.split(PLACEHOLDER).join(renderNav(cfg.active, cfg.navClass));
  }
  if (content.includes(FOOTER_PLACEHOLDER)) {
    const isHome = file === 'index.html';
    content = content.split(FOOTER_PLACEHOLDER).join(renderFooter(isHome));
  }
  if (content.includes(CURSOR_PLACEHOLDER)) {
    content = content.split(CURSOR_PLACEHOLDER).join(cursorTemplate);
  }
  return content;
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

let pageCount = 0;
for (const name of fs.readdirSync(srcDir)) {
  const srcFile = path.join(srcDir, name);
  if (fs.statSync(srcFile).isDirectory()) continue;

  if (name.endsWith('.html')) {
    const content = injectPartials(name, fs.readFileSync(srcFile, 'utf8'));
    fs.writeFileSync(path.join(distDir, name), content, 'utf8');
    pageCount++;
  } else {
    // Static files (robots.txt, sitemap.xml, …) are copied through.
    fs.copyFileSync(srcFile, path.join(distDir, name));
  }
}
console.log(`Wrote ${pageCount} page(s) → dist/`);

copyDir(path.join(root, 'assets'), path.join(distDir, 'assets'));
copyDir(path.join(root, 'uploads'), path.join(distDir, 'uploads'));
console.log('Copied assets/ and uploads/ → dist/');
