/**
 * Rebecca's sheet: data/projects.json as a CSV she can edit, and the way back.
 *
 *   npm run projects:csv                         writes data/projects.csv
 *   npm run projects:import -- returned.csv      shows what her sheet would change; add --write to save it
 *
 * The columns are fixed (below). Everything else in a project (galleries, story text, amenities, the card's own
 * labels) is not in the sheet and is never touched by an import.
 */
import { STATUSES, STYLES, fmtInt, fmtMoney, portfolioOrder } from './projects.mjs';
import { plainNotes } from './projects-validate.mjs';

/** The sheet's columns, in order. `check` is for reading only: notes from the validator, ignored on import. */
export const COLUMNS = [
  'slug', 'name', 'status', 'market', 'neighborhood', 'year_completed', 'beds', 'baths', 'sqft',
  'completed_home_value', 'style', 'card_photo', 'hero_photo', 'photo_folder', 'builder', 'featured', 'check',
];

/** Column to data field, and how a cell is read. */
export const FIELDS = [
  { col: 'name', key: 'name', kind: 'text' },
  { col: 'status', key: 'status', kind: 'enum', values: STATUSES },
  { col: 'market', key: 'market', kind: 'text' },
  { col: 'neighborhood', key: 'neighborhood', kind: 'text' },
  { col: 'year_completed', key: 'year', kind: 'year' },
  { col: 'beds', key: 'beds', kind: 'whole' },
  { col: 'baths', key: 'baths', kind: 'number' },
  { col: 'sqft', key: 'sqft', kind: 'whole' },
  { col: 'completed_home_value', key: 'value', kind: 'money' },
  { col: 'style', key: 'style', kind: 'enum', values: STYLES },
  { col: 'card_photo', key: 'cardPhoto', kind: 'text' },
  { col: 'hero_photo', key: 'heroPhoto', kind: 'text' },
  { col: 'photo_folder', key: 'photoFolder', kind: 'text' },
  { col: 'builder', key: 'builder', kind: 'text' },
  { col: 'featured', key: 'featured', kind: 'bool' },
];

/* ------------------------------------------------------------------ writing */

/** A cell as the sheet shows it. Numbers are plain digits, so a spreadsheet does not turn them into dates or currency. */
export function cellFor(p, field) {
  const v = p[field.key];
  if (v === null || v === undefined) return '';
  if (field.kind === 'bool') return v ? 'yes' : 'no';
  return String(v);
}

const quote = (s) => (/[",\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s);

/** The sheet, in the order the portfolio lists the homes, one row per project. */
export function toCsv(projects, findings) {
  const rows = portfolioOrder(projects).map((p) => {
    const cells = { slug: p.slug, check: plainNotes(findings, p.slug).join('; ') };
    for (const f of FIELDS) cells[f.col] = cellFor(p, f);
    return COLUMNS.map((c) => quote(cells[c] ?? '')).join(',');
  });
  return `${[COLUMNS.join(','), ...rows].join('\n')}\n`;
}

/* ------------------------------------------------------------------ reading */

/** Split CSV text into rows of cells: quotes, doubled quotes, commas and line breaks inside quotes, CRLF or LF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  let seen = false; // anything on this row yet, so a blank line is skipped
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === '') { quoted = true; seen = true; }
    else if (c === ',') { row.push(cell); cell = ''; seen = true; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      if (seen || cell !== '') { row.push(cell); rows.push(row); }
      row = []; cell = ''; seen = false;
    } else { cell += c; seen = true; }
  }
  if (seen || cell !== '') { row.push(cell); rows.push(row); }
  return rows;
}

/** The word a returned cell must say to empty a field. A blank cell never does. */
export const CLEAR = 'CLEAR';

/**
 * Read one cell. A blank cell means "no change" and a CLEAR cell means "make it empty"; the caller handles both.
 * @returns {{ ok: true, value: any } | { ok: false, why: string }}
 */
export function parseCell(field, raw) {
  const t = String(raw).trim();
  switch (field.kind) {
    case 'text':
      return { ok: true, value: t };
    case 'enum': {
      const v = t.toLowerCase().replace(/[\s_]+/g, '-');
      return field.values.includes(v) ? { ok: true, value: v } : { ok: false, why: `"${t}" is not one of ${field.values.join(', ')}` };
    }
    case 'year':
    case 'whole': {
      const v = t.replace(/[\s,]/g, '');
      if (!/^\d+$/.test(v)) return { ok: false, why: `"${t}" is not a whole number` };
      const n = Number(v);
      return field.kind === 'year' && !/^\d{4}$/.test(v) ? { ok: false, why: `"${t}" is not a four-digit year` } : { ok: true, value: n };
    }
    case 'number': {
      const v = t.replace(/\s/g, '');
      return /^\d+(\.\d+)?$/.test(v) ? { ok: true, value: Number(v) } : { ok: false, why: `"${t}" is not a number such as 5 or 5.5` };
    }
    case 'money': {
      const v = t.replace(/[\s$,]/g, '');
      return /^\d+$/.test(v) ? { ok: true, value: Number(v) } : { ok: false, why: `"${t}" is not a dollar amount such as 7035000 or $7,035,000` };
    }
    case 'bool': {
      const v = t.toLowerCase();
      if (['yes', 'y', 'true', '1'].includes(v)) return { ok: true, value: true };
      if (['no', 'n', 'false', '0'].includes(v)) return { ok: true, value: false };
      return { ok: false, why: `"${t}" is not yes or no` };
    }
    default:
      return { ok: false, why: 'unknown column type' };
  }
}

/** How a value is printed in a diff. */
export function show(field, v) {
  if (v === null || v === undefined || v === '') return '(empty)';
  if (field.kind === 'money') return fmtMoney(v);
  if (field.kind === 'whole' && field.key === 'sqft') return fmtInt(v);
  if (field.kind === 'bool') return v ? 'yes' : 'no';
  return String(v);
}
