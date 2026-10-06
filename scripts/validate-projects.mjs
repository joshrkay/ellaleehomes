#!/usr/bin/env node
/**
 * Checks the portfolio data (data/projects.json) before the site is built from it. Zero dependencies, no network.
 *
 *   node scripts/validate-projects.mjs            report: every problem, exit 0 (the state until launch)
 *   node scripts/validate-projects.mjs --strict   the same, but exit 1 while any error remains
 *   ELH_LAUNCH=1 npm run build                    same as --strict, inside the build (set it on the go-live deploy)
 *   --summary                                     counts only, two lines (used inside `npm run build`)
 *
 * Errors are records the site cannot use as they stand: a required field is empty, a value is not one the site
 * accepts (baths of 5.2, a style that is neither farmhouse nor contemporary), a photo file is missing. Warnings are
 * advice and never fail the run: a number outside the usual range, two homes sharing a value or a floor area, and
 * a page that repeats a fact by hand (Developers, Why Us, Home, Our Story) and disagrees with the data.
 * scripts/check-launch.mjs reports the errors as launch blockers of class P.
 *
 * The checks themselves are in scripts/lib/projects-validate.mjs; the fields are described in data/README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadProjects, ProjectsError } from './lib/projects.mjs';
import { validateProjects, errorsOf, warningsOf } from './lib/projects-validate.mjs';
import { toCsv } from './lib/projects-csv.mjs';

const args = process.argv.slice(2);
const STRICT = args.includes('--strict') || process.env.ELH_LAUNCH === '1';
const SUMMARY = args.includes('--summary');

let projects;
try {
  projects = loadProjects();
} catch (err) {
  if (!(err instanceof ProjectsError)) throw err;
  console.error(`validate-projects: ${err.message}`);
  process.exit(1);
}

const { findings, info, counts } = validateProjects(projects);
const errors = errorsOf(findings);
const warnings = warningsOf(findings);
const label = STRICT ? 'STRICT' : 'report';
const what = `${counts.projects} projects (${counts.listed} on the portfolio, ${counts.photosOnly} photos only)`;
const tally = `${errors.length} error(s), ${warnings.length} warning(s)`;

// Rebecca's sheet is committed (data/projects.csv); say so when it no longer matches the data.
let staleSheet = false;
try {
  staleSheet = fs.readFileSync(path.join(ROOT, 'data', 'projects.csv'), 'utf8') !== toCsv(projects, findings);
} catch {
  // no sheet yet: nothing to be stale
}

const line = (f) => {
  const at = f.where ? `${f.where}: ` : '';
  return `  [${f.code}] ${at}${f.slug && !f.message.startsWith(f.slug) ? `${f.slug}.${f.field}: ` : ''}${f.message}`;
};
const printGroup = (title, list) => {
  if (!list.length) return;
  console.log(`\n${title} (${list.length})`);
  const doneGroups = new Set();
  for (const f of [...list].sort((a, b) => a.code.localeCompare(b.code))) {
    if (f.group) {
      if (doneGroups.has(f.group)) continue;
      doneGroups.add(f.group);
      console.log(`  [${f.code}] ${f.groupMessage}`);
    } else console.log(line(f));
  }
};

if (SUMMARY) {
  console.log(`validate-projects (${label}): ${what}: ${tally}${findings.length && !STRICT ? '; run `npm run check:projects` for the list' : ''}`);
  // A failing go-live build must say what to fix, so the strict summary lists the errors too.
  if (STRICT) printGroup('Errors: the site cannot use these as they are', errors);
  if (staleSheet) console.log('data/projects.csv is out of date with data/projects.json: run `npm run projects:csv`');
} else {
  console.log(`validate-projects (${label}): ${what}`);
  printGroup('Errors: the site cannot use these as they are', errors);
  printGroup('Warnings: worth a look, none blocks a launch', warnings);
  console.log('');
  for (const i of info) console.log(i);
  if (staleSheet) console.log('data/projects.csv is out of date with data/projects.json: run `npm run projects:csv`');
  console.log(`validate-projects (${label}): ${tally}.${STRICT ? '' : ' Report mode: exit 0. ELH_LAUNCH=1 or --strict exits 1 while an error remains.'}`);
}

if (STRICT && errors.length) {
  console.error('validate-projects: FAILED. Clear every error above (data/README.md says how) before the go-live deploy.');
  process.exit(1);
}
