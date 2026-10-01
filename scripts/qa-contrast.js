// Evaluated in the page by scripts/qa.py (check X5e). Called once per scroll position; each call records,
// for every piece of text and every icon (SVG) inside the viewport, its WCAG 2.x contrast ratio and keeps the BEST
// ratio seen for that element (so text that is dimmed until it scrolls into view is judged in its resting, visible state).
// The last call (final = true) returns one record per element:
// { sel, text, size, weight, fg, bg, ratio, large, image }.
// Icons are returned with large = true (the 3:1 threshold for graphics).
(final) => {
  const S = (window.__qaContrast = window.__qaContrast || new Map());
  if (final) return [...S.values()];
  const parse = (s) => {
    const m = (s || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const over = (top, bot, a) => [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a)];
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const W = document.documentElement.clientWidth, VH = window.innerHeight;
  // contrast of colour `fgRaw` (rgba array) drawn by element `el` (extraAlpha = extra opacity on the glyph/stroke itself)
  const measure = (el, fgRaw, extraAlpha) => {
    const chain = [];
    for (let e = el; e; e = e.parentElement) chain.push(e);
    const css = chain.map((e) => getComputedStyle(e));
    const opAbove = new Array(chain.length);
    let acc = 1;
    for (let i = chain.length - 1; i >= 0; i--) { acc *= parseFloat(css[i].opacity); opAbove[i] = acc; }
    if (opAbove[0] < 0.05) return null;                   // fully transparent right now
    let image = false;
    const layers = [];
    for (let i = 0; i < chain.length; i++) {
      const bi = css[i].backgroundImage;
      if (bi && bi !== 'none' && !/^url\(["']?data:/.test(bi)) { image = true; break; }
      const c = parse(css[i].backgroundColor);
      if (c && c[3] > 0) { layers.push([c, c[3] * opAbove[i]]); if (c[3] >= 1 && opAbove[i] >= 1) break; }
    }
    let base = [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i][0], base, layers[i][1]);
    const fg = over(fgRaw, base, fgRaw[3] * opAbove[0] * extraAlpha);
    const L1 = lum(fg), L2 = lum(base);
    return { fg, base, image, ratio: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100 };
  };
  const inView = (el, minSize) => {
    const rects = el.getClientRects();
    if (!rects.length) return false;
    const r = rects[0];
    return !(r.width < minSize || r.height < minSize || r.right <= 0 || r.left >= W || r.bottom <= 0 || r.top >= VH);
  };
  const clsOf = (el) => (el.className && el.className.baseVal !== undefined ? el.className.baseVal : (el.className || '')).toString().trim().split(/\s+/).slice(0, 2).join('.');
  const record = (el, key, m, extra) => {
    const prev = S.get(key);
    if (prev && prev.ratio >= m.ratio) return;
    S.set(key, Object.assign({ fg: hex(m.fg), bg: hex(m.base), ratio: m.ratio, image: m.image }, extra));
  };
  // --- text
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const done = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const txt = (t.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (txt.length < 2) continue;
    const el = t.parentElement;
    if (!el || done.has(el)) continue;
    if (el.closest('script, style, noscript, svg, template, option, [hidden]')) continue;
    if (!inView(el, 4)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    done.add(el);
    const fgRaw = parse(cs.color);
    if (!fgRaw) continue;
    const m = measure(el, fgRaw, 1);
    if (!m) continue;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const cls = clsOf(el);
    record(el, el, m, {
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : ''),
      text: txt.slice(0, 40), size: Math.round(size * 10) / 10, weight, large: size >= 24 || (size >= 18.66 && weight >= 700),
    });
  }
  // --- icons: the first drawn shape of every visible SVG, judged at the 3:1 graphics threshold
  for (const svg of document.querySelectorAll('svg')) {
    if (svg.closest('[hidden], defs, symbol') || !inView(svg, 8)) continue;
    const cs0 = getComputedStyle(svg);
    if (cs0.visibility === 'hidden' || cs0.display === 'none') continue;
    const shape = svg.querySelector('path, circle, rect, line, polyline, polygon, ellipse, text');
    if (!shape) continue;
    const cs = getComputedStyle(shape);
    const strokeOn = cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0 && !/^url/.test(cs.stroke);
    const fillOn = cs.fill && cs.fill !== 'none' && !/^url/.test(cs.fill);
    const raw = parse(strokeOn ? cs.stroke : fillOn ? cs.fill : null);
    if (!raw) continue;
    const extra = parseFloat(strokeOn ? cs.strokeOpacity : cs.fillOpacity) * parseFloat(cs.opacity);
    const m = measure(svg, raw, isNaN(extra) ? 1 : extra);
    if (!m) continue;
    const cls = clsOf(svg);
    record(svg, svg, m, { sel: 'svg' + (svg.parentElement && svg.parentElement.className && svg.parentElement.className.toString ? ' in .' + svg.parentElement.className.toString().trim().split(/\s+/)[0] : '') + (cls ? '.' + cls : ''), text: '(icon)', size: Math.round(svg.getBoundingClientRect().width), weight: 400, large: true });
  }
  return null;
}
