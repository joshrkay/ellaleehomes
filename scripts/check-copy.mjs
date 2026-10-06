#!/usr/bin/env node
/**
 * Fails the build when wording the Website Fact Sheet rules out comes back.
 * Source of truth: docs/fact-sheet.md (the Fact Sheet as updated Oct 2, 2026).
 *
 * Add a rule in the same commit that removes the wording it bans: `npm run build`
 * runs this on Vercel too, so a rule that fails on existing copy blocks the deploy.
 *
 * The rules themselves are in scripts/lib/copy-rules.mjs, so that text which never passes
 * through src/ (the reviews in data/reviews.json) is held to the same regexes.
 *
 * Two kinds of rule:
 *   RULES       matched against every raw source line of src/*.html, partials/* and data/projects.json.
 *   TEXT_RULES  matched only against text a visitor or search engine can read: body
 *               text, attribute values, <title> and <meta>, JSON-LD, and inline-script
 *               data. HTML comments, <style> blocks and script comments are ignored
 *               (see scripts/lib/regions.mjs). A rule may be scoped to files:
 *               [regex, reason, { only: ['src/a.html'], except: ['src/b.html'] }].
 *               RULES accept the same optional scope as a third element.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyRegions, lineOf, SEEN } from './lib/regions.mjs';
import { RULES, TEXT_RULES, PENDING_TEXT_RULES, inScope } from './lib/copy-rules.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = [
  ...fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.html')).map((f) => path.join('src', f)),
  ...fs.readdirSync(path.join(root, 'partials')).map((f) => path.join('partials', f)),
  // The portfolio's copy (names, labels, story text, amenities) lives in the data file, not in a page.
  ...(fs.existsSync(path.join(root, 'data', 'projects.json')) ? [path.join('data', 'projects.json')] : []),
];

let bad = 0;
const WARRANTY_OK = new Set([path.join('src', 'warranty.html'), path.join('src', 'homeowner-resources.html')]);
const NAV_ONLY_OK = new Set([path.join('partials', 'nav.html'), path.join('partials', 'nav-dropdown.html')]);

const pending = PENDING_TEXT_RULES.map(() => []);
for (const rel of files) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const lines = source.split('\n');
  if (TEXT_RULES.length || PENDING_TEXT_RULES.length) {
    const cls = classifyRegions(source);
    PENDING_TEXT_RULES.forEach(([rx, why, scope], i) => {
      if (!inScope(rel, scope)) return;
      const g = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g');
      let m;
      while ((m = g.exec(source))) {
        if (m[0].length === 0) g.lastIndex++;
        else if (SEEN.includes(cls[m.index])) pending[i].push(`${rel}:${lineOf(source, m.index)}: "${m[0]}"`);
      }
    });
    for (const [rx, why, scope] of TEXT_RULES) {
      if (!inScope(rel, scope)) continue;
      const g = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g');
      let m;
      while ((m = g.exec(source))) {
        if (m[0].length === 0) g.lastIndex++;
        else if (SEEN.includes(cls[m.index])) {
          bad++;
          console.error(`${rel}:${lineOf(source, m.index)}: "${m[0]}" — ${why}`);
        }
      }
    }
  }
  lines.forEach((line, i) => {
    if (/warranty@ellaleehomes\.com/.test(line) && !WARRANTY_OK.has(rel)) {
      bad++;
      console.error(`${rel}:${i + 1}: "warranty@" — only on the Warranty and Homeowner Resources pages`);
    }
    if (/href="sell-your-home\.html/.test(line) && !NAV_ONLY_OK.has(rel) && rel !== path.join('src', 'sell-your-home.html')) {
      bad++;
      console.error(`${rel}:${i + 1}: link to the Sell page — Sell Your Home stays in the nav only`);
    }
    for (const [rx, why, scope] of RULES) {
      if (!inScope(rel, scope)) continue;
      const m = line.match(rx);
      if (m) {
        bad++;
        console.error(`${rel}:${i + 1}: "${m[0]}" — ${why}`);
      }
    }
  });
}
// The Contact page must carry exactly one Buildertrend embed, as supplied: script first, then iframe#btIframe.
{
  const contact = fs.readFileSync(path.join(root, 'src', 'contact.html'), 'utf8');
  const count = (needle) => contact.split(needle).length - 1;
  const SCRIPT = 'https://buildertrend.net/contact-form/btClientContactForm.js';
  const problems = [];
  if (count(SCRIPT) !== 1) problems.push(`the Buildertrend script appears ${count(SCRIPT)} times (need 1)`);
  if (count('id="btIframe"') !== 1) problems.push(`iframe#btIframe appears ${count('id="btIframe"')} times (need 1)`);
  if (!/<iframe[^>]*src="https:\/\/buildertrend\.net\/contact-form\/\?builderID=[\w.-]+"/.test(contact)) problems.push('the iframe src is not the Buildertrend contact-form URL with a builderID');
  if (!/<iframe[^>]*\btitle="[^"]+"/.test(contact)) problems.push('the iframe needs a title attribute');
  if (/<iframe[^>]*\b(?:loading|sandbox)=/.test(contact)) problems.push('no lazy loading or sandbox on the Buildertrend iframe (it must run as supplied)');
  if (contact.indexOf(SCRIPT) > contact.indexOf('id="btIframe"')) problems.push('the Buildertrend script must come before the iframe');
  for (const why of problems) {
    bad++;
    console.error(`src/contact.html: ${why}`);
  }
}

const pendingTotal = pending.reduce((n, hits) => n + hits.length, 0);
if (process.argv.includes('--pending')) {
  PENDING_TEXT_RULES.forEach(([, why], i) => {
    console.log(`\n## ${why}: ${pending[i].length} hit(s)`);
    pending[i].forEach((h) => console.log('  ' + h));
  });
}
if (bad) {
  console.error(`\ncheck-copy: ${bad} banned phrase(s). See docs/fact-sheet.md.`);
  process.exit(1);
}
console.log(`check-copy: ok${pendingTotal ? ` (${pendingTotal} hit(s) still pending on ${pending.filter((h) => h.length).length} rule(s); run with --pending)` : ''}`);
