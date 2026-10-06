#!/usr/bin/env node
/**
 * Reads Rebecca's returned sheet (see `npm run projects:csv`), checks it, and shows what it would change in
 * data/projects.json, field by field, old to new. It writes nothing unless you add --write.
 *
 *   npm run projects:import -- returned.csv            dry run: the diff and the checks
 *   npm run projects:import -- returned.csv --write    save data/projects.json
 *
 * Rules
 *   - A blank cell changes nothing. Only a cell that says CLEAR empties a field, so a half-filled sheet can never
 *     wipe what the site already has.
 *   - Only the sheet's columns are read. Galleries, story text, amenities and the card's own labels are never
 *     touched, and the `check` column is ignored.
 *   - A slug the data does not have is a problem, not a new project (add the project first: data/README.md).
 *   - Any cell that cannot be read (a baths of "five", a status that is not one of the four) stops the import with
 *     the row, the slug and the column named. Nothing is written until the sheet is clean.
 *   - The fields the pages show that follow from the sheet follow with it, and are listed as "derived": the value's
 *     label, the size band, the status label. When a sheet value settles a disagreement between the portfolio card
 *     and the project page (a `card` override), the override is dropped so both show the sheet's value.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA_FILE, loadProjects, saveProjects, ProjectsError, bandFromSqft, fmtMoney, isPhotosOnly } from './lib/projects.mjs';
import { validateProjects, errorsOf, warningsOf } from './lib/projects-validate.mjs';
import { COLUMNS, FIELDS, CLEAR, parseCsv, parseCell, show } from './lib/projects-csv.mjs';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: npm run projects:import -- <returned.csv> [--write]');
  process.exit(2);
}

let sheet;
try {
  sheet = fs.readFileSync(path.resolve(file), 'utf8');
} catch (err) {
  console.error(`projects:import: cannot read ${file} (${err.code || err.message})`);
  process.exit(2);
}

let projects;
try {
  projects = loadProjects();
} catch (err) {
  if (!(err instanceof ProjectsError)) throw err;
  console.error(`projects:import: ${err.message}`);
  process.exit(1);
}

const problems = [];
const ignored = [];
const rows = parseCsv(sheet);
const header = (rows[0] || []).map((c) => String(c).trim().toLowerCase().replace(/\s+/g, '_'));
const slugAt = header.indexOf('slug');
if (slugAt < 0) problems.push('the sheet has no "slug" column in its first row');
for (const c of header) if (c && !COLUMNS.includes(c)) ignored.push(c);
const fields = FIELDS.filter((f) => header.includes(f.col));

const next = JSON.parse(JSON.stringify(projects));
const bySlug = new Map(next.map((p) => [p.slug, p]));
const seenRow = new Map();
/** @type {{ slug: string, name: string, lines: { label: string, from: string, to: string, derived?: boolean }[], notes: string[] }[]} */
const changes = [];

/** The standard words under a project's name on its page. Anything else is a hand-written label and is left alone. */
const standardStatusLabel = (status, year) => ({ sold: year ? `Sold ${year}` : 'Sold', 'for-sale': 'For Sale', 'in-progress': 'In Progress', 'photos-only': null })[status] ?? null;
const sameValue = (a, b) => (a ?? null) === (b ?? null);
/** Which card overrides a changed field settles. */
const OVERRIDES = { name: ['name'], year: ['year'], value: ['value', 'valueLabel'], sqft: ['sqft'], beds: ['beds'], baths: ['baths'] };

for (let r = 1; r < rows.length && slugAt >= 0; r++) {
  const row = rows[r];
  const human = r + 1; // the row number a spreadsheet shows
  if (row.every((c) => String(c).trim() === '')) continue;
  const slug = String(row[slugAt] ?? '').trim().toLowerCase();
  if (!slug) {
    problems.push(`row ${human}: no slug`);
    continue;
  }
  const p = bySlug.get(slug);
  if (!p) {
    problems.push(`row ${human}: slug "${slug}" is not in data/projects.json (add the project there first; data/README.md says how)`);
    continue;
  }
  if (seenRow.has(slug)) {
    problems.push(`row ${human}: slug "${slug}" is already on row ${seenRow.get(slug)}`);
    continue;
  }
  seenRow.set(slug, human);

  const entry = { slug, name: p.name, lines: [], notes: [] };
  const old = { ...p };
  const changed = new Set();
  for (const f of fields) {
    const raw = String(row[header.indexOf(f.col)] ?? '');
    const t = raw.trim();
    if (t === '') continue; // blank: no change, never a clear
    let value;
    if (t.toUpperCase() === CLEAR) value = null;
    else {
      const parsed = parseCell(f, raw);
      if (!parsed.ok) {
        const hint = f.key === 'status' && /^complete/i.test(t) ? ' (use sold for a home that is completed and sold, for-sale for one that is completed and on the market)' : '';
        problems.push(`row ${human} (${slug}), column ${f.col}: ${parsed.why}${hint}`);
        continue;
      }
      value = parsed.value;
    }
    if (sameValue(p[f.key], value)) continue;
    entry.lines.push({ label: f.col, from: show(f, p[f.key]), to: show(f, value) });
    p[f.key] = value;
    changed.add(f.key);
  }
  if (!changed.size) continue;

  // What follows from the sheet.
  const derive = (key, to, label = key) => {
    if (sameValue(p[key], to)) return;
    entry.lines.push({ label, from: p[key] == null ? '(empty)' : JSON.stringify(p[key]), to: to == null ? '(empty)' : JSON.stringify(to), derived: true });
    p[key] = to;
  };
  if (changed.has('value')) derive('valueLabel', p.value == null ? null : fmtMoney(p.value));
  if (changed.has('status')) {
    derive('statusLabel', standardStatusLabel(p.status, p.year));
    if (p.status === 'photos-only') derive('band', 'new');
    else if (old.status === 'photos-only' && Number.isFinite(p.sqft)) derive('band', bandFromSqft(p.sqft));
  } else if (changed.has('year') && old.statusLabel && old.statusLabel === standardStatusLabel(old.status, old.year)) {
    derive('statusLabel', standardStatusLabel(p.status, p.year));
  } else if (changed.has('year') && old.statusLabel && String(old.statusLabel).includes(String(old.year))) {
    entry.notes.push(`statusLabel "${old.statusLabel}" still names ${old.year}: edit it in data/projects.json if the year changed on purpose`);
  }
  if (changed.has('sqft') && !isPhotosOnly(p) && Number.isFinite(p.sqft)) derive('band', bandFromSqft(p.sqft));
  if (p.card) {
    for (const key of changed) {
      for (const k of OVERRIDES[key] ?? []) {
        if (k in p.card) {
          entry.notes.push(`the portfolio card showed ${JSON.stringify(p.card[k])} for ${k}, the project page ${JSON.stringify(old[k])}: this sheet settles it, both now show ${JSON.stringify(p[k])}`);
          delete p.card[k];
        }
      }
    }
    if (!Object.keys(p.card).length) delete p.card;
  }
  if (changed.has('style') && p.style && p.styleLabel && !String(p.styleLabel).toLowerCase().includes(p.style)) {
    entry.notes.push(`style is now ${p.style}, but the card label "${p.styleLabel}" does not say so, and the portfolio's Style filter reads the label: change styleLabel in data/projects.json too`);
  }
  changes.push(entry);
}

/* ---- the report ---- */
const total = changes.reduce((n, c) => n + c.lines.filter((l) => !l.derived).length, 0);
console.log(`projects:import ${WRITE ? '(--write)' : '(dry run)'}: ${path.basename(file)}, ${Math.max(rows.length - 1, 0)} row(s), ${fields.length} column(s) read${ignored.length ? `, ignored: ${ignored.join(', ')}` : ''}`);
for (const c of changes) {
  console.log(`\n${c.slug} (${c.name})`);
  const name = (l) => (l.derived ? `derived ${l.label}` : l.label);
  const width = Math.max(...c.lines.map((l) => name(l).length));
  for (const l of c.lines) console.log(`  ${name(l).padEnd(width)}  ${l.from}  ->  ${l.to}`);
  for (const n of c.notes) console.log(`  note: ${n}`);
}

const key = (f) => `${f.code}|${f.slug}|${f.field}|${f.message}`;
const was = validateProjects(projects, { cross: false }).findings;
const now = validateProjects(next, { cross: false }).findings;
const wasKeys = new Set(was.map(key));
const nowKeys = new Set(now.map(key));
const introduced = now.filter((f) => !wasKeys.has(key(f)));
const cleared = was.filter((f) => !nowKeys.has(key(f)));
console.log(`\n${changes.length} project(s) change, ${total} field(s) from the sheet${changes.length ? '' : ': nothing to do'}.`);
console.log(`Data check: ${errorsOf(now).length} error(s) and ${warningsOf(now).length} warning(s) after (${errorsOf(was).length} and ${warningsOf(was).length} before); ${cleared.length} cleared, ${introduced.length} new.`);
for (const f of introduced.slice(0, 20)) console.log(`  new [${f.code}] ${f.slug}.${f.field}: ${f.message}`);
if (introduced.length > 20) console.log(`  ...and ${introduced.length - 20} more (npm run check:projects lists them all)`);

if (problems.length) {
  console.log(`\n${problems.length} problem(s) in the sheet. Nothing was written${WRITE ? ' (--write is ignored until they are fixed)' : ''}:`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
// A cell can be well formed and still leave a record the site cannot use (CLEAR in a required column, baths of 5.2).
// A normal build only reports such errors, so one saved here could be deployed. Refuse errors the sheet creates;
// the ones the data already had are not the sheet's fault and can be cleared one sheet at a time.
const newErrors = errorsOf(introduced);
if (newErrors.length) {
  console.log(`\nThis sheet would introduce ${newErrors.length} new data error(s), listed above as "new". Nothing was written${WRITE ? '' : ' (and --write would refuse too)'}: fix those cells and run again. Errors the data already had do not block an import.`);
  process.exit(1);
}
if (!changes.length) process.exit(0);
if (!WRITE) {
  console.log('\nDry run: nothing written. Run again with --write to save data/projects.json.');
  process.exit(0);
}
saveProjects(next, DATA_FILE);
console.log(`\nWrote ${path.relative(ROOT, DATA_FILE)}. Next: npm run build (regenerates the pages from it), and npm run projects:csv so the sheet shows the new notes.`);
