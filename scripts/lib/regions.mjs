/**
 * Splits an HTML page template into regions so a rule can look at what a visitor
 * (or a search engine) can actually see, and ignore code comments and CSS.
 *
 * Every character of the page gets one class:
 *   visible    body text and attribute values (alt, aria-label, ...)
 *   head-meta  <title> and <meta> tags
 *   jsonld     <script type="application/ld+json">
 *   js-string  inline JavaScript that is not a comment (data blocks hold visible copy)
 *   comment    HTML comments and <script> tag markup
 *   style      <style> blocks
 *   js-comment // and block comments inside inline scripts
 */

/** Region classes a visitor or a search engine can read. */
export const SEEN = ['visible', 'head-meta', 'jsonld', 'js-string'];

/** @param {string} text @returns {string[]} one class per character */
export function classifyRegions(text) {
  const cls = new Array(text.length).fill('visible');
  const mark = (from, to, c) => {
    for (let i = from; i < to; i++) cls[i] = c;
  };

  let m;
  const comment = /<!--[\s\S]*?-->/g;
  while ((m = comment.exec(text))) mark(m.index, m.index + m[0].length, 'comment');

  const style = /<style[\s\S]*?<\/style>/gi;
  while ((m = style.exec(text))) mark(m.index, m.index + m[0].length, 'style');

  const script = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = script.exec(text))) {
    const isLd = /application\/ld\+json/i.test(m[1]);
    const bodyStart = m.index + m[0].indexOf('>') + 1;
    const bodyEnd = bodyStart + m[2].length;
    mark(m.index, bodyStart, 'comment');
    if (isLd) {
      mark(bodyStart, bodyEnd, 'jsonld');
      continue;
    }
    let pos = bodyStart;
    let inBlock = false;
    for (const line of m[2].split('\n')) {
      const end = pos + line.length;
      const t = line.trim();
      if (inBlock) {
        mark(pos, end, 'js-comment');
        if (t.includes('*/')) inBlock = false;
      } else if (t.startsWith('/*')) {
        mark(pos, end, 'js-comment');
        if (!t.includes('*/')) inBlock = true;
      } else if (t.startsWith('//')) {
        mark(pos, end, 'js-comment');
      } else {
        mark(pos, end, 'js-string');
        const idx = line.search(/\s\/\/\s/);
        if (idx >= 0) mark(pos + idx, end, 'js-comment');
      }
      pos = end + 1;
    }
  }

  const headEnd = text.search(/<\/head>/i);
  if (headEnd > 0) {
    const meta = /<(title|meta)\b[^>]*>(?:[^<]*<\/title>)?/gi;
    const head = text.slice(0, headEnd);
    while ((m = meta.exec(head))) {
      for (let i = m.index; i < m.index + m[0].length; i++) if (cls[i] === 'visible') cls[i] = 'head-meta';
    }
  }
  return cls;
}

/** 1-based line number of a character offset. */
export function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}
