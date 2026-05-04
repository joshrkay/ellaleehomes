#!/usr/bin/env node
/**
 * Fetches each Ella Lee Homes project page and extracts full-size wp-content JPEG URLs
 * (strips WordPress thumbnail suffixes like -300x200).
 */
const BASE = 'https://ellaleehomes.com';

const PAGES = [
  { slug: 'mitchell', url: '/mitchell/' },
  { slug: 'hazelwood-1', url: '/hazelwood-1/' },
  { slug: 'hazelwood-2', url: '/hazelwood-2/' },
  { slug: 'apache', url: '/apache/' },
  { slug: '68th', url: '/68th/' },
  { slug: '68th-2', url: '/68th-2/' },
  { slug: '41st', url: '/41st/' },
  { slug: '5th-st', url: '/5th-st/' },
  { slug: '4th-st', url: '/4th-st/' },
  { slug: '2nd-st', url: '/2nd-st/' },
  { slug: 'via-estrella', url: '/via-estrella/' },
  { slug: 'dc2', url: '/dc2/' },
  { slug: 'dc1', url: '/dc1/' },
  { slug: 'earll', url: '/earll/' },
  { slug: 'coolidge', url: '/coolidge/' },
  { slug: 'larkspur', url: '/larkspur/' },
  { slug: 'charter-oak', url: '/previous-projects/charter-oak/' },
];

const RE = /https:\/\/ellaleehomes\.com\/wp-content\/uploads\/[^"'\\s<>)]+\.(?:jpe?g|webp|png)/gi;
const SIZE_SUFFIX = /-\d+x\d+(?=\.(jpe?g|webp|png)$)/i;

const SKIP = /FAVVV|favicon|logo|placeholder|icon/i;

function normalizeUrl(u) {
  let s = u.replace(SIZE_SUFFIX, '');
  if (s.endsWith('-scaled.jpg')) s = s.replace(/-scaled\.jpg$/, '.jpg');
  return s;
}

/** First-seen order, deduped, normalized — matches hero/carousel order on page. */
function orderedImages(html) {
  const seen = new Set();
  const list = [];
  RE.lastIndex = 0;
  let m;
  while ((m = RE.exec(html)) !== null) {
    const n = normalizeUrl(m[0]);
    if (SKIP.test(n)) continue;
    if (!seen.has(n)) {
      seen.add(n);
      list.push(n);
    }
  }
  return list;
}

async function fetchHtml(path) {
  const res = await fetch(BASE + path, {
    headers: { 'User-Agent': 'ellaleehomes-static-sync/1.0' },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.text();
}

const out = {};
for (const { slug, url } of PAGES) {
  const html = await fetchHtml(url);
  const normalized = orderedImages(html);
  const og = html.match(/property="og:image"\s+content="([^"]+)"/i);
  let hero = og ? normalizeUrl(og[1]) : normalized[0] || null;
  if (hero && SKIP.test(hero)) hero = normalized[0] || null;
  out[slug] = {
    url: BASE + url,
    images: normalized,
    hero,
  };
}

console.log(JSON.stringify(out, null, 2));
