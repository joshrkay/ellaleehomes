/**
 * Custom cursor follow + hover grow (links, buttons, cards, gallery tiles).
 */
(function initSiteCursor() {
  function start() {
    const curDot = document.getElementById('cur');
    const curRing = document.getElementById('cur-ring');
    if (!curDot || !curRing) return;
    const curInner = curDot.querySelector('#cur-dot');
    if (!curInner) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    });

    (function loop() {
      curDot.style.cssText =
        `left:${mx}px;top:${my}px;position:fixed;z-index:9999;pointer-events:none;mix-blend-mode:difference`;
      const grow = document.body.classList.contains('cursor-grow');
      const size = grow ? 48 : 30;
      curInner.style.cssText = `width:${size}px;height:${size}px;background:var(--paper);border-radius:50%;transform:translate(-50%,-50%)`;
      rx += (mx - rx) * 0.1;
      ry += (my - ry) * 0.1;
      curRing.style.left = `${rx}px`;
      curRing.style.top = `${ry}px`;
      requestAnimationFrame(loop);
    })();

    const SELECTOR =
      'a,button,[role="button"],.proj-card,.related-card,.gallery-img,.sqft-tab,.sort-select,.tw-opt';

    function bind(el) {
      if (el.dataset.cursorBound === '1') return;
      el.dataset.cursorBound = '1';
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-grow'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-grow'));
    }

    document.querySelectorAll(SELECTOR).forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
