#!/usr/bin/env node
/**
 * Fails the build when wording the Website Fact Sheet rules out comes back.
 * Source of truth: docs/website-plan.md §1. Add a rule here when a decision is made.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  [/open[- ]books?/i, 'Cost-plus is stated plainly; never "open books"'],
  [/fixed[- ]price|choice of contract/i, 'Never imply fixed price or a choice of contract structures'],
  [/remodel|renovation|new homes only|commercial (?:work|building|projects)/i, 'Custom homes only; do not mention what we do not do'],
  [/design(?:ing)? phase|permitting phase|planning and permitting|planning phase/i, 'Timeline is construction only: no design or permitting phases'],
  [/>5\.0<|rated 5\.0|5\.0 (?:rating|across)/i, 'No 5.0 rating badge'],
  [/the phoenix valley|greater phoenix valley/i, 'Statewide phrasing is "Arizona"'],
  [/\bcash (?:home )?buyer|cash offer/i, 'Sell page: brand voice, not a cash-buyer ad'],
];

const files = [
  ...fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.html')).map((f) => path.join('src', f)),
  ...fs.readdirSync(path.join(root, 'partials')).map((f) => path.join('partials', f)),
];

let bad = 0;
const WARRANTY_OK = new Set([path.join('src', 'warranty.html'), path.join('src', 'homeowner-resources.html')]);
for (const rel of files) {
  const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/warranty@ellaleehomes\.com/.test(line) && !WARRANTY_OK.has(rel)) {
      bad++;
      console.error(`${rel}:${i + 1}: "warranty@" — only on the Warranty and Homeowner Resources pages`);
    }
    for (const [rx, why] of RULES) {
      const m = line.match(rx);
      if (m) {
        bad++;
        console.error(`${rel}:${i + 1}: "${m[0]}" — ${why}`);
      }
    }
  });
}
if (bad) {
  console.error(`\ncheck-copy: ${bad} banned phrase(s). See docs/website-plan.md §1.`);
  process.exit(1);
}
console.log('check-copy: ok');
