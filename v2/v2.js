/* ============================================================
   ELLA LEE HOMES — v2 shared interactions
   Preloader, scroll reveals, nav state, gateway hover,
   parallax bands, and animated stat counters.
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- PRELOADER ---- */
  function runPreloader() {
    var pre = document.getElementById('pre');
    if (!pre) return ready();
    var fill = pre.querySelector('#pre-bar i');
    var pct = pre.querySelector('#pre-pct');
    var mark = pre.querySelector('#pre-mark span');
    if (mark) requestAnimationFrame(function () {
      mark.style.transition = 'transform 1s cubic-bezier(0.16,1,0.3,1)';
      mark.style.transform = 'translateY(0)';
    });
    var p = 0;
    var dur = reduce ? 1 : 1500;
    var start = performance.now();
    function tick(now) {
      p = Math.min((now - start) / dur, 1);
      var e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      if (fill) fill.style.right = (100 - e * 100) + '%';
      if (pct) pct.textContent = String(Math.floor(e * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(function () { pre.classList.add('done'); ready(); }, 250);
    }
    requestAnimationFrame(tick);
  }

  function ready() {
    document.body.classList.add('loaded');
    var gw = document.querySelector('.gw');
    if (gw) requestAnimationFrame(function () { gw.classList.add('ready'); });
    initReveals();
    onScroll();
  }

  /* ---- SCROLL REVEALS ---- */
  var revealEls = [];
  function initReveals() {
    revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal, .line-mask'));
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('fired'); io.unobserve(en.target); }
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('fired'); });
    }
  }

  /* ---- NAV SCROLL STATE + PARALLAX ---- */
  var nav = document.querySelector('.v2nav');
  var bands = Array.prototype.slice.call(document.querySelectorAll('.band-bg'));
  function onScroll() {
    var y = window.pageYOffset;
    if (nav) nav.classList.toggle('scrolled', y > 60);
    if (!reduce) {
      bands.forEach(function (b) {
        var sec = b.parentElement;
        var r = sec.getBoundingClientRect();
        var prog = (window.innerHeight - r.top) / (window.innerHeight + r.height);
        b.style.transform = 'translateY(' + (prog * 16 - 8) + '%)';
      });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ---- GATEWAY HOVER EXPAND ---- */
  var gw = document.querySelector('.gw');
  if (gw) {
    var panels = gw.querySelectorAll('.gw-panel');
    panels.forEach(function (p) {
      p.addEventListener('mouseenter', function () {
        gw.setAttribute('data-hover', p.classList.contains('is-home') ? 'left' : 'right');
      });
    });
    gw.addEventListener('mouseleave', function () { gw.removeAttribute('data-hover'); });
    // keyboard / click navigation
    panels.forEach(function (p) {
      p.addEventListener('click', function () {
        var href = p.getAttribute('data-href');
        if (href) window.location.href = href;
      });
      p.setAttribute('tabindex', '0');
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.click(); }
      });
    });
  }

  /* ---- ANIMATED STAT COUNTERS ---- */
  function animateCounters() {
    var nums = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    if (!nums.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      nums.forEach(function (n) { n.firstChild ? (n.childNodes[0].nodeValue = n.getAttribute('data-count')) : (n.textContent = n.getAttribute('data-count')); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var dec = (el.getAttribute('data-count').split('.')[1] || '').length;
        var dur = 1600, start = performance.now();
        var target0 = el.childNodes[0];
        function step(now) {
          var t = Math.min((now - start) / dur, 1);
          var e = 1 - Math.pow(1 - t, 3);
          var val = (target * e).toFixed(dec);
          if (target0 && target0.nodeType === 3) target0.nodeValue = val;
          else el.textContent = val;
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---- FORM (demo) ---- */
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('.cta-form');
    if (!f) return;
    e.preventDefault();
    var btn = f.querySelector('.cta-submit');
    if (btn) btn.textContent = 'Thank you — we’ll be in touch.';
  });

  /* ---- MOBILE NAV (simple anchor scroll, links already work) ---- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { runPreloader(); animateCounters(); });
  } else { runPreloader(); animateCounters(); }
})();
