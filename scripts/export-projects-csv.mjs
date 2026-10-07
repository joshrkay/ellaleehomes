#!/usr/bin/env node
/**
 * Writes Rebecca's sheet: one row per project, from data/projects.json.
 *
 *   npm run projects:csv                    data/projects.csv
 *   npm run projects:csv -- --out file.csv  somewhere else
 *   npm run projects:csv -- --stdout        print it instead of writing it
 *
 * Columns: slug, name, status, market, neighborhood, year_completed, beds, baths, sqft, completed_home_value, style,
 * card_photo, hero_photo, photo_folder, builder, featured, check. A cell is blank where the site has nothing, never a
 * placeholder. `check` lists, in plain words, what the validator would like her to look at on that row.
 * `completed_home_value` is the value of the finished home, including the land, not the construction cost.
 * The sheet comes back through `npm run projects:import`; data/README.md describes both.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadProjects, ProjectsError } from './lib/projects.mjs';
import { validateProjects } from './lib/projects-validate.mjs';
import { COLUMNS, toCsv } from './lib/projects-csv.mjs';

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? path.resolve(args[outAt + 1] ?? '') : path.join(ROOT, 'data', 'projects.csv');

let projects;
try {
  projects = loadProjects();
} catch (err) {
  if (!(err instanceof ProjectsError)) throw err;
  console.error(`projects:csv: ${err.message}`);
  process.exit(1);
}

const { findings } = validateProjects(projects);
const csv = toCsv(projects, findings);

if (args.includes('--stdout')) {
  process.stdout.write(csv);
} else {
  if (outAt >= 0 && !args[outAt + 1]) {
    console.error('projects:csv: --out needs a file name');
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, csv, 'utf8');
  const lines = csv.trimEnd().split('\n');
  const withNotes = projects.filter((p) => findings.some((f) => f.slug === p.slug && f.plain)).length;
  console.log(`projects:csv: wrote ${path.relative(ROOT, out) || out} (${projects.length} rows, ${withNotes} with a note in the check column)`);
  console.log(`columns: ${COLUMNS.join(',')}`);
  console.log(`first row: ${lines[1]}`);
}
