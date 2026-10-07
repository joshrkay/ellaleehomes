#!/usr/bin/env node
/**
 * Browser QA for the site chrome: the menu, the footer and the section lines.
 * Covers launch-plan items N14 (menu centred), N13 (hide and show), N11 (section lines),
 * N3 (sq ft slot) and N61 (footer facts).
 *
 * Needs  Node 18+ and Playwright with Chromium. If `playwright` is not installed next to the
 *        repo, point PLAYWRIGHT_PATH at a copy (for example /opt/node-tools/node_modules/playwright).
 *        Install once with `npm i -D playwright && npx playwright install chromium`.
 * Run    after `npm run build`:
 *          npm run qa:chrome                    # checks ./dist
 *          node scripts/qa-chrome.cjs path/to/dist
 *          node scripts/qa-chrome.cjs --only=contrast   # one group: footer, menu, burger, scroll, keyboard, motion, contrast, lines
 * Output one line per check: PASS, FAIL, PEND (known, owned by another package) or INFO.
 *        Exits 1 when any check fails. Only file:// pages are opened; every other request is
 *        blocked, so it runs offline.
 *
 * What it asserts
 *   Menu       the link group is centred on the page (within 2px) at 1024, 1324, 1440 and 1920;
 *              the bar collapses to the burger at 899 and shows the links at 900; the drawer opens
 *              and closes; the header height is the same in every state.
 *   Behaviour  on Home, an inner page and an article, at 1440 and 390: the bar hides on scroll
 *              down and returns on scroll up (8px and 6px thresholds), is back at the top, never
 *              shows a blue background except while Learn or the drawer is open (solid #001526),
 *              keeps the Learn panel flush under it, closes Learn with Esc and returns focus to
 *              the Learn button, comes back when a control is reached with Tab while hidden, and
 *              stays put while focus is inside it. Reduced motion removes the transitions.
 *   Legibility the cream links reach 4.5:1 over a white section behind the returning bar.
 *   Footer     every page shows ROC KB2-333410, "Why Us", "4408 N 12th St, Ste 200" and "40+", no
 *              Sell link, no 50+ / 200K / 5.0 badge, "Office:" not "Address:". The "Sq ft built" cell
 *              is absent while site-facts.json has sqftBuilt null and present once it is set.
 *   Lines      on every page except Home, no section-level divider is drawn (the removed ones:
 *              Our Story pillar board, Previous Projects size bands, the article "related" rule,
 *              the "Last updated" rule on six pages; no hr and no empty 1 to 3px rule element),
 *              while the hero line and the gold footer line are still there. Rules inside a
 *              component (forms, cards, tabs, rows) are out of scope and only counted (INFO).
 *              A section-level rule that another package still owns prints PEND, not FAIL.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function loadPlaywright() {
  const tries = [
    () => require('playwright'),
    () => require('playwright-core'),
    () => require(process.env.PLAYWRIGHT_PATH),
    () => require('/opt/node-tools/node_modules/playwright'),
  ];
  for (const t of tries) {
    try {
      const m = t();
      if (m && m.chromium) return m;
    } catch (e) { /* try the next one */ }
  }
  console.error('qa-chrome: Playwright with Chromium is required (see the header of this file).');
  process.exit(2);
}

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).toLowerCase(); // e.g. --only=contrast while iterating
const dist = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(root, 'dist'));
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error(`qa-chrome: ${dist} has no index.html. Run \`npm run build\` first.`);
  process.exit(2);
}
const pages = fs.readdirSync(dist).filter((f) => f.endsWith('.html')).sort();
const HOME = 'index.html';
const INNER = 'faq.html';
const ARTICLE = 'steps-to-building-a-custom-home.html';
const ARTICLES = pages.filter((f) => /^(steps-to|how-to-find|is-custom|new-luxury|exploring|why-choosing)/.test(f));

let failures = 0;
let passes = 0;
function report(ok, label, detail) {
  if (ok === 'PEND' || ok === 'INFO') {
    console.log(`${ok}  ${label}${detail ? ': ' + detail : ''}`);
    return;
  }
  if (ok) passes++; else failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ': ' + detail : ''}`);
}

/* ── browser helpers ───────────────────────────────────── */
let browser;

async function open(name, width, opts = {}) {
  const height = opts.height || (width < 600 ? 844 : 900);
  const ctx = await browser.newContext({
    viewport: { width, height },
    hasTouch: width < 600,
    reducedMotion: opts.reducedMotion || 'no-preference',
  });
  await ctx.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report(false, `script error on ${name}`, e.message));
  const url = pathToFileURL(path.join(dist, name)).href + (name === 'project.html' ? '?slug=68th' : '');
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.documentElement.classList.add('elh-no-intro'));
  // A build without the state machine never sets the attribute; carry on so the checks report it instead of crashing.
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-elh-nav-state'), null, { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(250);
  return page;
}

const sleep = (page, ms) => page.waitForTimeout(ms);
const state = (page) => page.evaluate(() => document.documentElement.getAttribute('data-elh-nav-state'));
const jump = (page, y) => page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
/** Scroll by a few px, then give the rAF-throttled script a couple of frames to see it. */
const nudge = async (page, dy) => { await page.evaluate((d) => window.scrollBy({ top: d, behavior: 'instant' }), dy); await page.waitForTimeout(70); };

async function barBox(page) {
  return page.evaluate(() => {
    const r = document.querySelector('[data-elh-nav]').getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });
}
/** Wait for the bar's slide to finish: fully out of view (hidden) or flush with the top (anything else). */
async function slid(page, wantHidden) {
  await page.waitForFunction((h) => {
    const r = document.querySelector('[data-elh-nav]').getBoundingClientRect();
    return h ? r.bottom <= 0.5 : Math.abs(r.top) < 0.5;
  }, wantHidden, { timeout: 4000 }).catch(() => {});
  await sleep(page, 360); // background and blur transitions
}
async function bg(page) {
  return page.evaluate(() => getComputedStyle(document.querySelector('[data-elh-nav]')).backgroundColor);
}
function parseColor(s) {
  const m = /rgba?\(([^)]+)\)/.exec(s || '');
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
/** "Blue" here means visibly more blue than red and green, at any opacity: the navy of #001526 qualifies, neutral greys do not. */
function isBlue(c) { return !!c && c.a > 0.02 && c.b - Math.max(c.r, c.g) >= 8; }
const isTransparent = (c) => !!c && c.a < 0.02;
const isNeutralBar = (c) => !!c && Math.abs(c.r - 43) <= 1 && Math.abs(c.g - 43) <= 1 && Math.abs(c.b - 43) <= 1 && Math.abs(c.a - 0.82) < 0.02;
const isNavy = (c) => !!c && c.r === 0 && c.g === 21 && c.b === 38 && c.a === 1;

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

let decoder;
/** Reads one rendered pixel (screenshot decoded in a scratch page), so contrast is measured on what is painted. */
async function pixel(page, x, y) {
  const buf = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  if (!decoder) {
    decoder = await browser.newPage();
    await decoder.setContent('<canvas id="c" width="1" height="1"></canvas>');
  }
  return decoder.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const g = document.getElementById('c').getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }, buf.toString('base64'));
}

/* ── 1. Footer facts (static) ──────────────────────────── */
function footerOf(html) {
  const s = html.indexOf('<footer id="contact"');
  const e = html.indexOf('</footer>', s);
  return s >= 0 && e > s ? html.slice(s, e + 9) : '';
}

function checkFooters() {
  const bad = [];
  const sell = [];
  const badges = [];
  const label = [];
  let facts = {};
  try { facts = JSON.parse(fs.readFileSync(path.join(dist, '..', 'site-facts.json'), 'utf8')); } catch (e) { /* dist outside the repo */ }
  const sqft = facts.sqftBuilt == null || facts.sqftBuilt === '' ? null : String(facts.sqftBuilt);
  const sqftBad = [];
  for (const f of pages) {
    const foot = footerOf(fs.readFileSync(path.join(dist, f), 'utf8'));
    const text = foot.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
    const missing = ['KB2-333410', 'Why Us', '4408 N 12th St, Ste 200', '40+'].filter((s) => !text.includes(s));
    if (!foot || missing.length) bad.push(`${f} (${foot ? 'missing ' + missing.join(', ') : 'no footer'})`);
    if (/href="[^"]*sell-your-home/.test(foot)) sell.push(f);
    if (/\b50\+|\b200K|\b5\.0\b/.test(text)) badges.push(f);
    if (!/>Office:</.test(foot) || /Address:/.test(foot)) label.push(f);
    const hasCell = /Sq ft built/i.test(foot);
    const leaked = /\{\{|fact:/.test(foot);
    if (leaked || (sqft === null ? hasCell : !(hasCell && text.includes(sqft)))) sqftBad.push(f);
  }
  report(!bad.length, `footer facts on ${pages.length} pages (ROC KB2-333410, Why Us, 4408 N 12th St, Ste 200, 40+)`, bad.join('; '));
  report(!sell.length, 'footer has no Sell link', sell.join(', '));
  report(!badges.length, 'footer has no 50+ / 200K / 5.0 badge', badges.join(', '));
  report(!label.length, 'footer label reads "Office:", never "Address:"', label.join(', '));
  report(!sqftBad.length,
    sqft === null ? 'sq ft slot left out while sqftBuilt is null (no cell, no placeholder, no leaked marker)' : `sq ft slot shows "${sqft}" with the label "Sq ft built"`,
    sqftBad.join(', '));
}

/* ── 2. Menu centred (N14) ─────────────────────────────── */
async function checkCentre() {
  const probe = (page) => page.evaluate(() => {
    const hdr = document.querySelector('[data-elh-nav]');
    const nav = hdr.querySelector(':scope > nav');
    const vw = document.documentElement.clientWidth;
    const kids = Array.from(nav.children);
    const a = kids[0].getBoundingClientRect();
    const z = kids[kids.length - 1].getBoundingClientRect();
    const cta = hdr.querySelector('[data-elh-cta]').getBoundingClientRect();
    return { offset: (a.left + z.right) / 2 - vw / 2, ctaH: cta.height, right: z.right, ctaLeft: cta.left, overflowX: document.documentElement.scrollWidth > vw };
  });
  for (const w of [1024, 1324, 1440, 1920]) {
    const out = [];
    let worst = 0;
    let ok = true;
    for (const name of [HOME, INNER, ARTICLE]) {
      const page = await open(name, w);
      const m = await probe(page);
      worst = Math.max(worst, Math.abs(m.offset));
      out.push(`${name.replace('.html', '').slice(0, 8)} ${m.offset.toFixed(1)}`);
      if (Math.abs(m.offset) > 2 || m.ctaH > 45 || m.right > m.ctaLeft || m.overflowX) ok = false;
      await page.context().close();
    }
    report(ok, `menu links centred at ${w}px`, `offset ${out.join(', ')} px (limit 2); button on one line, no overlap`);
  }
}

/* ── 3. Burger collapse and drawer ─────────────────────── */
async function checkCollapse() {
  const shape = (page) => page.evaluate(() => {
    const d = (s) => getComputedStyle(document.querySelector(s)).display;
    return { burger: d('[data-elh-burger]') !== 'none', links: d('[data-elh-nav] > nav') !== 'none', cta: d('[data-elh-cta]') !== 'none' };
  });
  let page = await open(INNER, 899);
  let s = await shape(page);
  report(s.burger && !s.links && !s.cta, 'burger replaces the links and button at 899px', JSON.stringify(s));
  await page.context().close();
  page = await open(INNER, 900);
  s = await shape(page);
  report(!s.burger && s.links && s.cta, 'links and button show at 900px', JSON.stringify(s));
  await page.context().close();

  for (const w of [390, 800]) {
    page = await open(INNER, w);
    await page.click('[data-elh-burger]');
    await sleep(page, 700);
    const open1 = await page.evaluate(() => {
      const d = document.querySelector('[data-elh-drawer]');
      const r = d.getBoundingClientRect();
      const b = document.querySelector('[data-elh-burger]');
      return { left: r.left, width: r.width, visible: getComputedStyle(d).visibility, lock: document.body.style.overflow, expanded: b.getAttribute('aria-expanded'), controls: b.getAttribute('aria-controls'), id: d.id, focusIn: d.contains(document.activeElement), bar: document.documentElement.getAttribute('data-elh-nav-state') };
    });
    await page.keyboard.press('Escape');
    await sleep(page, 700);
    const closed = await page.evaluate(() => ({ left: document.querySelector('[data-elh-drawer]').getBoundingClientRect().left, visible: getComputedStyle(document.querySelector('[data-elh-drawer]')).visibility, lock: document.body.style.overflow, expanded: document.querySelector('[data-elh-burger]').getAttribute('aria-expanded'), focus: document.activeElement.getAttribute('data-elh-burger') }));
    const ok = open1.left >= -1 && open1.width > 200 && open1.visible === 'visible' && open1.lock === 'hidden' && open1.expanded === 'true' && open1.controls === open1.id && open1.focusIn && open1.bar === 'open'
      && closed.left < 0 && closed.visible === 'hidden' && closed.lock === '' && closed.expanded === 'false' && closed.focus !== null;
    report(ok, `phone drawer at ${w}px opens (focus inside, scroll locked, bar "open") and Esc closes it and returns focus to the burger`, ok ? '' : JSON.stringify({ open1, closed }));
    await page.context().close();
  }
}

/* ── 4. Hide on scroll down, show on scroll up (N13) ───── */
async function checkBehaviour(name, width) {
  const tag = `${name.replace('.html', '').slice(0, 14)} ${width}px`;
  const solid = ARTICLES.includes(name);
  const page = await open(name, width);
  const seen = []; // [stateName, bg]
  const note = async (label) => { seen.push([label, await state(page), parseColor(await bg(page))]); return seen[seen.length - 1]; };
  const heights = [];
  const track = async () => heights.push((await barBox(page)).height);

  await track();
  let [, st0, bg0] = await note('load');
  report(st0 === 'top' && (solid ? isNeutralBar(bg0) : isTransparent(bg0)),
    `${tag}: at the top the bar is ${solid ? 'the neutral dark bar (light page)' : 'transparent'}`, `state ${st0}, bg ${JSON.stringify(bg0)}`);

  await page.mouse.move(width / 2, 450);
  await page.mouse.wheel(0, 40);
  await sleep(page, 400);
  const inside = await state(page);
  report(inside === 'top', `${tag}: a scroll shorter than the bar's own height does not hide it`, `state ${inside}`);

  await page.mouse.wheel(0, 700);
  await slid(page, true);
  const [, st1, bg1] = await note('down');
  const box1 = await barBox(page);
  await track();
  report(st1 === 'hidden' && box1.bottom <= 0.5, `${tag}: hides on scroll down`, `state ${st1}, bar bottom ${box1.bottom.toFixed(1)}px`);

  await page.mouse.wheel(0, 120);
  await sleep(page, 300);
  const stillHidden = await state(page);
  for (const d of [4, -4, 4, -4]) await nudge(page, d); // jitter: every reversal starts the count again
  const jitter = await state(page);
  await nudge(page, 10); // a clean downward run, then back up
  await nudge(page, -5); // 5px up: under the 6px threshold
  const five = await state(page);
  report(stillHidden === 'hidden' && jitter === 'hidden' && five === 'hidden', `${tag}: upward jitter and 5px of scroll up do not bring it back`, `states ${stillHidden}, ${jitter}, ${five}`);

  await nudge(page, -2); // 7px up since the reversal: past the 6px threshold
  await slid(page, false);
  const [, st2, bg2] = await note('up');
  const box2 = await barBox(page);
  await track();
  report(st2 === 'shown' && Math.abs(box2.top) < 0.5, `${tag}: returns on scroll up`, `state ${st2}, bar top ${box2.top.toFixed(1)}px`);
  report(isNeutralBar(bg2), `${tag}: the returning bar is neutral dark glass rgba(43,43,43,.82), not blue`, JSON.stringify(bg2));

  await nudge(page, 6);
  const small = await state(page);
  await nudge(page, 4); // 10px down since the reversal: past the 8px threshold
  await sleep(page, 150);
  const big = await state(page);
  report(small === 'shown' && big === 'hidden', `${tag}: hides again after 8px of scroll down (6px does not)`, `states ${small}, ${big}`);

  await page.mouse.wheel(0, -200);
  await slid(page, false);
  await jump(page, 0);
  await sleep(page, 500);
  const [, st3, bg3] = await note('top again');
  report(st3 === 'top' && (solid ? isNeutralBar(bg3) : isTransparent(bg3)), `${tag}: back at the top the bar is visible again`, `state ${st3}, bg ${JSON.stringify(bg3)}`);

  // Learn (desktop) or the drawer (phone): the one state with a blue background
  await jump(page, 1600);
  await page.mouse.wheel(0, 30);
  await sleep(page, 300);
  await page.mouse.wheel(0, -80);
  await slid(page, false);
  if (width >= 900) {
    await page.click('[data-elh-click="toggleMore"]');
    await sleep(page, 700);
  } else {
    await page.click('[data-elh-burger]');
    await sleep(page, 800);
  }
  const [, stO, bgO] = await note('open');
  await track();
  report(stO === 'open' && isNavy(bgO), `${tag}: ${width >= 900 ? 'Learn open' : 'drawer open'} makes the bar solid navy #001526`, `state ${stO}, bg ${JSON.stringify(bgO)}`);
  if (width >= 900) {
    const geo = await page.evaluate(() => {
      const t = document.querySelector('[data-elh-click="toggleMore"]');
      const p = document.getElementById(t.getAttribute('aria-controls'));
      return { expanded: t.getAttribute('aria-expanded'), panel: !!p, top: p ? p.getBoundingClientRect().top : null, barBottom: document.querySelector('[data-elh-nav]').getBoundingClientRect().bottom, visible: p ? getComputedStyle(p).visibility : null };
    });
    report(geo.expanded === 'true' && geo.panel && geo.visible === 'visible' && Math.abs(geo.top - geo.barBottom) <= 0.6,
      `${tag}: Learn trigger has aria-expanded and aria-controls, and the panel sits flush under the bar`, `panel top ${geo.top && geo.top.toFixed(2)}, bar bottom ${geo.barBottom.toFixed(2)}`);
    await page.mouse.wheel(0, 500);
    await sleep(page, 400);
    const stillOpen = await state(page);
    await page.keyboard.press('Escape');
    await sleep(page, 500);
    const after = await page.evaluate(() => ({ focus: document.activeElement.getAttribute('data-elh-click'), expanded: document.querySelector('[data-elh-click="toggleMore"]').getAttribute('aria-expanded'), state: document.documentElement.getAttribute('data-elh-nav-state') }));
    report(stillOpen === 'open' && after.focus === 'toggleMore' && after.expanded === 'false' && after.state === 'shown',
      `${tag}: scrolling with Learn open keeps it open; Esc closes it, returns focus to Learn and the bar stays (not hidden at once)`, JSON.stringify({ stillOpen, ...after }));
  } else {
    await page.keyboard.press('Escape');
    await sleep(page, 700);
    const after = await state(page);
    report(after === 'shown', `${tag}: closing the drawer leaves the bar visible (not hidden at once)`, `state ${after}`);
  }
  await track();

  const spread = Math.max(...heights) - Math.min(...heights);
  report(spread < 0.6, `${tag}: bar height is the same in every state (no layout shift)`, `heights ${[...new Set(heights.map((h) => h.toFixed(1)))].join(', ')}`);

  const blueElsewhere = seen.filter(([, s, c]) => s !== 'open' && isBlue(c));
  report(!blueElsewhere.length, `${tag}: no blue background in top, shown or hidden`, blueElsewhere.map(([l, s, c]) => `${l}/${s} ${JSON.stringify(c)}`).join('; '));
  await page.context().close();
}

/* ── 5. Keyboard ───────────────────────────────────────── */
async function checkKeyboard(width) {
  const tag = `${INNER.replace('.html', '')} ${width}px`;
  let page = await open(INNER, width);
  await page.mouse.move(width / 2, 450);
  await page.mouse.wheel(0, 1200);
  await slid(page, true);
  const before = await state(page);
  await page.keyboard.press('Tab'); // first stop is the logo link in the bar
  await sleep(page, 700);
  const after = await page.evaluate(() => ({ state: document.documentElement.getAttribute('data-elh-nav-state'), inBar: !!document.activeElement.closest('[data-elh-nav]'), top: document.querySelector('[data-elh-nav]').getBoundingClientRect().top }));
  report(before === 'hidden' && after.state === 'shown' && after.inBar && Math.abs(after.top) < 0.5, `${tag}: Tab while the bar is hidden brings it back`, JSON.stringify({ before, ...after }));
  await page.mouse.wheel(0, 700);
  await sleep(page, 700);
  const held = await page.evaluate(() => ({ state: document.documentElement.getAttribute('data-elh-nav-state'), inBar: !!document.activeElement.closest('[data-elh-nav]'), top: document.querySelector('[data-elh-nav]').getBoundingClientRect().top }));
  report(held.inBar && held.state !== 'hidden' && Math.abs(held.top) < 0.5, `${tag}: the bar never hides while focus is inside it`, JSON.stringify(held));
  await page.context().close();

  // a pointer user who clicked Learn and closed it again is not held open by a focused button
  if (width >= 900) {
    page = await open(INNER, width);
    await page.mouse.move(width / 2, 450);
    await page.mouse.wheel(0, 1200);
    await sleep(page, 500);
    await page.mouse.wheel(0, -60);
    await sleep(page, 500);
    await page.click('[data-elh-click="toggleMore"]');
    await sleep(page, 400);
    await page.click('[data-elh-click="toggleMore"]');
    await sleep(page, 400);
    await page.mouse.wheel(0, 400);
    await slid(page, true);
    report((await state(page)) === 'hidden', `${tag}: after clicking Learn open and closed, scrolling down hides the bar again`, `state ${await state(page)}`);
    await page.context().close();
  }
}

async function checkReducedMotion() {
  const page = await open(INNER, 1440, { reducedMotion: 'reduce' });
  const d = await page.evaluate(() => {
    const dur = (el) => getComputedStyle(el).transitionDuration.split(',').every((x) => parseFloat(x) === 0);
    return { bar: dur(document.querySelector('[data-elh-nav]')), caret: dur(document.querySelector('[data-elh-more-caret]')), panel: dur(document.getElementById('elh-learn-panel')), drawer: dur(document.querySelector('[data-elh-drawer]')) };
  });
  await jump(page, 900);
  await sleep(page, 120);
  const box = await barBox(page);
  report(d.bar && d.caret && d.panel && d.drawer && box.bottom <= 0.5, 'prefers-reduced-motion: no transitions, and the bar is gone within 120ms of scrolling', JSON.stringify({ ...d, bottom: box.bottom }));
  await page.context().close();
}

/* ── 6. Legibility over light sections ────────────────── */
async function checkContrast() {
  // Worst case first: pure white behind the bar. Then the real light section on Home (#giving, sand).
  for (const [label, name, prepare] of [
    ['a white section', INNER, async (page) => page.evaluate(() => {
      const w = document.createElement('div');
      w.style.cssText = 'position:fixed;left:0;top:0;right:0;height:320px;background:#fff;z-index:100';
      document.body.appendChild(w);
    })],
    ["Home's sand section (#giving)", HOME, async (page) => page.evaluate(() => {
      const g = document.getElementById('giving');
      window.scrollTo({ top: g.getBoundingClientRect().top + window.scrollY + 140, behavior: 'instant' });
    })],
  ]) {
    const page = await open(name, 1440);
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 900);
    await slid(page, true);
    await prepare(page);
    await sleep(page, 300);
    await page.mouse.wheel(0, 200);
    await sleep(page, 400);
    await page.mouse.wheel(0, -60);
    await slid(page, false);
    const st = await state(page);
    const link = await page.evaluate(() => getComputedStyle(document.querySelector('[data-elh-nav] > nav a')).color);
    const fg = parseColor(link);
    let worst = Infinity;
    let at = null;
    for (const x of [150, 250, 350, 1000, 1100, 1180]) { // empty parts of the bar, clear of the logo, links and button
      const px = await pixel(page, x, 20);
      const r = ratio([fg.r, fg.g, fg.b], px);
      if (r < worst) { worst = r; at = px; }
    }
    report(st === 'shown' && worst >= 4.5, `cream links over ${label} behind the returning bar reach 4.5:1`, `${worst.toFixed(2)}:1 (text ${link}, lightest painted bar pixel rgb(${at.join(',')}))`);
    await page.context().close();
  }
}

/* ── 7. Section lines (N11) ────────────────────────────── */
const SECTION_LINE_RULES = [
  { page: 'our-story.html', sel: '.pillar-board', what: 'Our Story pillar board top rule' },
  { page: 'previous-projects.html', sel: '.section-band-line', what: 'Previous Projects size-band line' },
  { pageMatch: ARTICLES, sel: '.article-related', what: 'article "related stories" rule' },
  { pageMatch: ['privacy.html', 'terms.html', 'disclaimer.html', 'code-of-conduct.html', 'warranty.html', 'homeowner-resources.html'], sel: 'p', text: /^\s*Last updated/, what: '"Last updated" rule' },
  { page: 'client-portal.html', sel: '.section-divider', what: 'Client Portal section divider' },
];
// Section-level rules that are still drawn and belong to another work package.
const PENDING_RULES = [
  { page: 'developers.html', sel: '.pillar', owner: 'the Developers page package (WP4, item 53)' },
];

async function scanLines(page, rules, pendingRules, name) {
  return page.evaluate(({ rules, pendingRules, name }) => {
    const visible = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return false; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return (p.length > 3 ? p[3] : 1) > 0.01; };
    const drawn = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.display === 'none' || r.width === 0) return null;
      for (const side of ['Top', 'Bottom']) {
        if (parseFloat(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none' && visible(cs['border' + side + 'Color'])) return `border-${side.toLowerCase()} on <${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''}>`;
      }
      if (r.height > 0 && r.height <= 3.5 && r.width >= 40 && !el.children.length && !(el.textContent || '').trim() && (visible(cs.backgroundColor) || /gradient/.test(cs.backgroundImage))) return `${r.height}px rule element <${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''}>`;
      return null;
    };
    const pick = (rule) => { const rx = rule.textSrc ? new RegExp(rule.textSrc) : null; return Array.from(document.querySelectorAll(rule.sel)).filter((el) => !rx || rx.test(el.textContent || '')); };
    const hits = [];
    for (const rule of rules) for (const el of pick(rule)) { const d = drawn(el); if (d) hits.push(`${rule.what}: ${d}`); }
    const pend = [];
    for (const rule of pendingRules) for (const el of pick(rule)) { const d = drawn(el); if (d) pend.push(`${rule.sel} (${rule.owner})`); }
    // generic: hr, and drawn rule elements (1 to 3px, empty), outside the site chrome and controls
    const generic = [];
    document.querySelectorAll('body hr, body *').forEach((el) => {
      if (el.closest('[data-elh-nav], [data-elh-drawer], .nav-dd-panel, footer, button, svg, [data-elh-track]')) return;
      const isHr = el.tagName === 'HR';
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || r.width === 0) return;
      const thin = r.height > 0 && r.height <= 3.5 && r.width >= 40 && !el.children.length && !(el.textContent || '').trim() && (visible(cs.backgroundColor) || /gradient/.test(cs.backgroundImage));
      if (isHr || thin) generic.push(`<${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''}> ${Math.round(r.width)}x${Math.round(r.height * 10) / 10}`);
    });
    // what must stay: the 1px hero rule under the title, and the gold footer line
    const h1 = document.querySelector('#hero-banner h1, #hero-banner .hero-title, #faq-hero h1, .hero-name');
    let hero = null;
    if (h1) { const a = getComputedStyle(h1, '::after'); hero = parseFloat(a.height) === 1 && visible(a.backgroundColor); }
    const foot = Array.from(document.querySelectorAll('footer div')).some((d) => d.getBoundingClientRect().height === 1 && /gradient/.test(getComputedStyle(d).backgroundImage));
    // rules inside components (form fields, cards, rows, tabs): not section dividers, counted for the record
    let components = 0;
    document.querySelectorAll('body *').forEach((el) => {
      if (el.closest('[data-elh-nav], [data-elh-drawer], .nav-dd-panel, footer')) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') return;
      if (['Top', 'Bottom'].some((side) => parseFloat(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none' && visible(cs['border' + side + 'Color']))) components++;
    });
    return { hits, pend, generic, hero, foot, name, components };
  }, { rules, pendingRules, name });
}

async function checkLines() {
  const secondary = pages.filter((f) => f !== HOME);
  for (const width of [1324, 390]) {
    const problems = [];
    const pending = new Set();
    const lost = [];
    let components = 0;
    for (const name of secondary) {
      const page = await open(name, width);
      const rules = SECTION_LINE_RULES.filter((r) => r.page === name || (r.pageMatch && r.pageMatch.includes(name)));
      const pend = PENDING_RULES.filter((r) => r.page === name);
      const res = await scanLines(page, rules.map((r) => ({ sel: r.sel, what: r.what, textSrc: r.text ? r.text.source : null })), pend, name);
      components += res.components;
      res.hits.forEach((h) => problems.push(`${name}: ${h}`));
      res.generic.forEach((g) => problems.push(`${name}: ${g}`));
      res.pend.forEach((p) => pending.add(`${name} ${p}`));
      if (res.hero === false) lost.push(`${name}: hero line missing`);
      if (!res.foot) lost.push(`${name}: footer gold line missing`);
      await page.context().close();
    }
    report(!problems.length, `no section-level dividers on ${secondary.length} secondary pages at ${width}px`, problems.slice(0, 6).join('; '));
    report(!lost.length, `hero line and footer gold line are still there at ${width}px`, lost.slice(0, 4).join('; '));
    pending.forEach((p) => report('PEND', `section-level rule still drawn, owned elsewhere at ${width}px`, p));
    report('INFO', `rules inside components (cards, rows, forms, tabs; out of scope) at ${width}px`, `${components} bordered elements across the secondary pages`);
  }
}

/* ── run ───────────────────────────────────────────────── */
(async () => {
  const { chromium } = loadPlaywright();
  browser = await chromium.launch();
  console.log(`qa-chrome: ${dist} (${pages.length} pages)`);
  // One group failing hard (a missing element, a timeout) is reported and the next group still runs.
  const group = async (label, fn) => {
    if (only && !label.toLowerCase().includes(only)) return;
    try {
      await fn();
    } catch (e) {
      failures++;
      console.log(`FAIL  ${label} could not finish: ${String(e && e.message ? e.message : e).split('\n')[0]}`);
    }
  };
  try {
    await group('footer checks', async () => checkFooters());
    await group('menu centre', checkCentre);
    await group('burger and drawer', checkCollapse);
    for (const w of [1440, 390]) for (const name of [HOME, INNER, ARTICLE]) await group(`scroll behaviour on ${name} at ${w}px`, () => checkBehaviour(name, w));
    await group('keyboard at 1440px', () => checkKeyboard(1440));
    await group('keyboard at 390px', () => checkKeyboard(390));
    await group('reduced motion', checkReducedMotion);
    await group('contrast', checkContrast);
    await group('section lines', checkLines);
  } finally {
    await browser.close();
  }
  console.log(`\nqa-chrome: ${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})();
