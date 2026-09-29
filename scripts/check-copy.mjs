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
  [/cost-plus|fixed-price/i, 'Say nothing about contract type'],
  [/\bcash (?:home )?buyer|cash offer/i, 'Sell page: brand voice, not a cash-buyer ad'],
];

const files = [
  ...fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.html')).map((f) => path.join('src', f)),
  ...fs.readdirSync(path.join(root, 'partials')).map((f) => path.join('partials', f)),
];

let bad = 0;
for (const rel of files) {
  const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
  lines.forEach((line, i) => {
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
