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

/**
 * @typedef {{ file: string; navClass: string; active: Partial<Record<'why'|'portfolio'|'process'|'about'|'investors', boolean>> }} PageCfg
 */

/** @type {PageCfg[]} */
const PAGES = [
  { file: 'index.html', navClass: 'compact', active: {} },
  { file: 'projects.html', navClass: '', active: { portfolio: true } },
  { file: 'process.html', navClass: '', active: { process: true } },
  { file: 'project.html', navClass: '', active: { portfolio: true } },
  { file: 'our-story.html', navClass: '', active: { about: true } },
];

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

for (const page of PAGES) {
  const srcFile = path.join(srcDir, page.file);
  if (!fs.existsSync(srcFile)) {
    console.error('Missing source file:', srcFile);
    process.exit(1);
  }
  let content = fs.readFileSync(srcFile, 'utf8');
  if (!content.includes(PLACEHOLDER)) {
    console.error('Missing', PLACEHOLDER, 'in', page.file);
    process.exit(1);
  }
  if (!content.includes(FOOTER_PLACEHOLDER)) {
    console.error('Missing', FOOTER_PLACEHOLDER, 'in', page.file);
    process.exit(1);
  }
  if (!content.includes(CURSOR_PLACEHOLDER)) {
    console.error('Missing', CURSOR_PLACEHOLDER, 'in', page.file);
    process.exit(1);
  }
  const nav = renderNav(page.active, page.navClass);
  content = content.split(PLACEHOLDER).join(nav);
  const isHome = page.file === 'index.html';
  content = content.split(FOOTER_PLACEHOLDER).join(renderFooter(isHome));
  content = content.split(CURSOR_PLACEHOLDER).join(cursorTemplate);
  fs.writeFileSync(path.join(distDir, page.file), content, 'utf8');
  console.log('Wrote', path.join('dist', page.file));
}

copyDir(path.join(root, 'assets'), path.join(distDir, 'assets'));
copyDir(path.join(root, 'uploads'), path.join(distDir, 'uploads'));
// v2/ is a self-contained alternate edition (gateway + homeowners + investors);
// copied verbatim — it does not use the nav/footer/cursor partial pipeline.
copyDir(path.join(root, 'v2'), path.join(distDir, 'v2'));
console.log('Copied assets/, uploads/ and v2/ → dist/');
