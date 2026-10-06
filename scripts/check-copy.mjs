#!/usr/bin/env node
/**
 * Fails the build when wording the Website Fact Sheet rules out comes back.
 * Source of truth: docs/fact-sheet.md (the Fact Sheet as updated Oct 2, 2026).
 *
 * Add a rule in the same commit that removes the wording it bans: `npm run build`
 * runs this on Vercel too, so a rule that fails on existing copy blocks the deploy.
 *
 * Two kinds of rule:
 *   RULES       matched against every raw source line of src/*.html and partials/*.
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

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const RULES = [
  [/design[- ]build|design (?:and|&amp;|&) build/i, 'We do not design: no "design build" language'],
  [/\bwe design\b|\bour designers\b|design team\b/i, 'We do not design: no "we design" language'],
  [/in-house/i, 'No "in-house" claims'],
  [/10\+ years|fifteen years/i, 'Founded 2021: use "since 2021" only'],
  [/nearly 50|\b50\+|\b200K\+|\$200M/i, 'Unverified stat: use the one home-count figure ("40+")'],
  [/one business day|within 24 hours|24-hour/i, 'No response-time promises'],
  [/south(?:ern)? arizona/i, 'Market wording: "Arizona" or "the Phoenix Valley"'],
  [/\bFounders\b/, 'Singular "Founder"'],
  [/on time,? on budget|on budget\. always|100% transparency/i, 'No absolute promises'],
  [/target budget range|\$\d+M\+?\s*(?:to|–|-|&ndash;|&mdash;)\s*\$\d+M/i, 'No budget ranges'],
  [/\b12 to 18|12\s*(?:–|-|&ndash;)\s*18 months|14(?:–|-|&ndash;)24/i, 'One timeline: construction 11–18 months'],
  [/4408 N 12th St(?!, Ste 200)(?!["'])/, 'Always include "Ste 200"'],
  [/first sketch|4 phases|four (?:clear )?phases/i, 'Construction only: no design/permitting phases'],
  [/\bdozens of\b.{0,40}(?:homes|families|properties)/i, 'Use the real number ("40+ homes"), not "dozens"'],
  [/designing and building|designs and builds/i, 'We do not design'],
  [/permitting/i, 'We do not do permitting'],
  [/\b(?:across|throughout|in) the Valley\b/i, 'Statewide phrasing is "Arizona"'],
  [/\bguarantees? (?:an?|that|every|your)\b/i, 'No absolute promises'],
  [/Arcadia,? (?:and |& |&amp; )?(?:Paradise|Scottsdale)|Scottsdale,? (?:and |& |&amp; )?Paradise Valley/, 'Markets in order: Paradise Valley, Scottsdale, Arcadia, Phoenix'],
  [/open[- ]books?/i, 'Cost-plus is stated plainly; never "open books"'],
  [/fixed[- ]price|choice of contract/i, 'Never imply fixed price or a choice of contract structures'],
  [/remodel|renovation|new homes only|commercial (?:work|building|projects)/i, 'Custom homes only; do not mention what we do not do'],
  [/design(?:ing)? phase|permitting phase|planning and permitting|planning phase/i, 'Timeline is construction only: no design or permitting phases'],
  [/>5\.0<|rated 5\.0|5\.0 (?:rating|across)/i, 'No 5.0 rating badge'],
  [/the phoenix valley|greater phoenix valley/i, 'Statewide phrasing is "Arizona"'],
  [/\bcash (?:home )?buyer|cash offer/i, 'Sell page: brand voice, not a cash-buyer ad'],
  // Added after the QA pass: wording that slipped past the first rules.
  [/sketch/i, 'Construction only: no "sketch" (design) language'],
  [/initial concept|from (?:the )?concept to|concept to completion/i, 'Construction only: we do not start at the concept (design) stage'],
  [/we (?:do not|don't) offer|do not offer (?:architectural|design)/i, 'Do not draw attention to what we do not do'],
  [/assist with land acquisition|help you evaluate and acquire land|identify the perfect location/i, 'Nothing about services beyond custom homes (no land-finding or acquisition help)'],
  [/multi[- ]?unit|multi[- ]?family|luxury enclaves/i, 'Custom homes only: no multi-unit or enclave work'],
  [/years of experience|decades of/i, 'Founded 2021: use "since 2021" only, no year counts'],
  [/more cost-effective than|at a lower price|measurable savings|maximize ROI|better margins|boost your bottom line/i, 'No outcome or comparison promises'],
  [/completely transparent|complete transparency|fully transparent|every invoice|every subcontractor bid/i, 'No "open books" in substance and no absolute transparency claims'],
  [/morning, noon, or night|at your convenience|any ?time, from anywhere|24\/7|around the clock/i, 'No time commitment anywhere'],
  [/minimum of 10%|annual profits/i, 'Charitable giving is "10% of profits"'],
  [/highest (?:safety|quality|standards)/i, 'No superlative promises'],
  [/\bunparalleled\b|\bpremier\b|award[- ]winning|world[- ]class/i, 'Marketing filler / invented distinction'],
  [/\b\d+ reviews? on Google/i, 'Review counts are not on the Fact Sheet'],
  [/selling my custom home/i, 'Sell framing is "home or lot"'],
  [/no surprises|surprise change orders|hidden surprises/i, 'No absolute promises'],
  [/never in the dark|never feel left in the dark|will always attract|\bunmatched\b/i, 'No absolute promises'],
  [/walk candidate lots|review a lot before you buy|if you are still looking/i, 'Nothing about services beyond custom homes (no lot-finding or lot-vetting service)'],
  [/award[- ]worthy|comprehensive warranty|full builder warranty|long-term peace of mind/i, 'Warranty is described as the Warranty page describes it; no invented distinctions'],
  // Notes from the client drafts must never ship.
  [/For Josh|For Shay|Claude is not a lawyer|written by Claude/i, 'Draft note leaked onto the site'],
  [/general template|not legal advice|reviewed by counsel/i, 'Placeholder legal note: the legal pages use the approved draft text'],
  // The client portal is a button to Buildertrend's own login page, never an embedded login (N6, N7).
  [/NewLoginFrame/, 'No embedded Buildertrend login: link to the login page instead'],
  [/938-4113/, 'That phone number is not ours: the site phone is (480) 340-8700'],
];

/** Rules that read only visible text (see the header). Each lands with the fix that clears it. */
const TEXT_RULES = [];

/**
 * Rules whose fixes are still being made: reported, never enforced. Run
 * `node scripts/check-copy.mjs --pending` for every hit. When a rule reaches zero hits,
 * move it up to TEXT_RULES in the same commit so it can never come back.
 */
const PENDING_TEXT_RULES = [
  [/—|&mdash;|&#8212;|&#x2014;/, 'No em dashes in site copy, titles or meta'],
  [/\bStudio\b/, 'The office is the "Office", never the "Studio"'],
  [/\bdaily (?:photos|updates|progress|reports)\b/i, 'Client updates are "photos and weekly updates", never "daily"'],
  [/cutting[- ]edge|sustainable (?:practices|construction|solutions)|innovative,? sustainable|future[- ]proof/i, 'No "cutting-edge" or "sustainable practices"'],
  [/energy[- ]efficien|smart[- ]home|home automation/i, 'Energy and smart-home claims: say once, in the approved sentence', { except: ['src/developers.html', 'src/project.html'] }],
  [/appraised at/i, 'Project values use the short label "Completed home value"'],
];

const files = [
  ...fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.html')).map((f) => path.join('src', f)),
  ...fs.readdirSync(path.join(root, 'partials')).map((f) => path.join('partials', f)),
];

let bad = 0;
const WARRANTY_OK = new Set([path.join('src', 'warranty.html'), path.join('src', 'homeowner-resources.html')]);
const NAV_ONLY_OK = new Set([path.join('partials', 'nav.html'), path.join('partials', 'nav-dropdown.html')]);

/** Scope check for TEXT_RULES; paths are compared with forward slashes. */
function inScope(rel, scope = {}) {
  const p = rel.split(path.sep).join('/');
  if (scope.only && !scope.only.includes(p)) return false;
  if (scope.except && scope.except.includes(p)) return false;
  return true;
}

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
