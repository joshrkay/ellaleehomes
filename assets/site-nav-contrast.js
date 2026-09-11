/* Ella Lee Homes — automatic nav contrast.
   Samples the background directly behind the nav bar and toggles
   #nav.nav-on-light (dark text) vs default (light/cream text) so the
   menu, phone, logo and Learn trigger are always legible.        */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;

  function luminanceOfRGB(r, g, b) {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  // Returns true when the background behind the nav is LIGHT (needs dark text)
  function backgroundIsLight() {
    // Special case: a full-screen LIGHT intro overlay (e.g. homepage tan screen)
    // has pointer-events:none, so elementsFromPoint skips it. Detect it directly.
    const tan = document.getElementById('hero-tan-overlay');
    if (tan) {
      const tcs = getComputedStyle(tan);
      if (parseFloat(tcs.opacity) >= 0.5 && tcs.display !== 'none' && tcs.visibility !== 'hidden') {
        const m = (tcs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
        if (m) {
          const p = m[1].split(',').map(s => parseFloat(s));
          const a = p[3] === undefined ? 1 : p[3];
          if (a >= 0.5) return luminanceOfRGB(p[0], p[1], p[2]) > 0.6;
        }
      }
    }

    const rect = nav.getBoundingClientRect();
    const y = Math.max(2, rect.top + rect.height / 2);
    const xs = [window.innerWidth * 0.5, window.innerWidth * 0.28, window.innerWidth * 0.72];
    let light = 0, dark = 0;

    for (const x of xs) {
      let stack;
      try { stack = document.elementsFromPoint(x, y); } catch (e) { continue; }
      // First element that isn't the nav or one of its descendants
      let el = stack.find(e => e !== nav && !nav.contains(e));
      let verdict = null; // true=light, false=dark

      while (el && el !== document.documentElement) {
        const cs = getComputedStyle(el);
        // Skip fully-invisible decorative layers (e.g. a faded-out gradient)
        if (parseFloat(cs.opacity) === 0 || cs.visibility === 'hidden') { el = el.parentElement; continue; }
        // An image/video or any background image → treat as dark (heroes are darkened)
        if (el.tagName === 'VIDEO' || el.tagName === 'IMG' ||
            (cs.backgroundImage && cs.backgroundImage !== 'none')) {
          verdict = false; break;
        }
        const bg = cs.backgroundColor || '';
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const p = m[1].split(',').map(s => parseFloat(s));
          const a = p[3] === undefined ? 1 : p[3];
          if (a >= 0.5) {
            verdict = luminanceOfRGB(p[0], p[1], p[2]) > 0.6;
            break;
          }
        }
        el = el.parentElement;
      }
      if (verdict === true) light++;
      else if (verdict === false) dark++;
    }
    // Default to dark background (light text) when ambiguous
    return light > dark;
  }

  let raf = null;
  function update() {
    raf = null;
    const isLight = backgroundIsLight();
    nav.classList.toggle('nav-on-light', isLight);
    nav.classList.toggle('nav-on-dark', !isLight);
  }
  function schedule() {
    if (raf == null) raf = requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', update);
  // Catch hero intro transitions (tan → video, overlays fading) on the homepage
  let n = 0;
  const poll = setInterval(() => { update(); if (++n > 20) clearInterval(poll); }, 250);
  update();
})();
