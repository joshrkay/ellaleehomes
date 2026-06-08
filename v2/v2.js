/* ============================================================
   ELLA LEE HOMES — v2 motion system
   Lenis smooth scroll · parallax · clip + word reveals ·
   pinned parallax scenes · animated counters ·
   gateway hover-expand + curtain page transition.
   Progressive enhancement: with no JS, everything stays visible.
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  docEl.classList.add('js'); // gates the "hidden until revealed" styling

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var lenis = null;

  /* ---------------------------------------------------------
     TEXT SPLIT — wrap words for a masked stagger reveal,
     preserving inline tags (<em>) and <br>.
     --------------------------------------------------------- */
  function splitChildren(node) {
    var out = [];
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        child.nodeValue.split(/(\s+)/).forEach(function (p) {
          if (p === '') return;
          if (/^\s+$/.test(p)) { out.push(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'sw';
          var wi = document.createElement('span'); wi.className = 'swi'; wi.textContent = p;
          w.appendChild(wi); out.push(w);
        });
      } else if (child.nodeType === 1) {
        if (child.tagName === 'BR') { out.push(child.cloneNode()); }
        else {
          var clone = child.cloneNode(false);
          splitChildren(child).forEach(function (n) { clone.appendChild(n); });
          out.push(clone);
        }
      }
    });
    return out;
  }
  function applySplit(el) {
    try {
      var parts = splitChildren(el);
      el.innerHTML = '';
      parts.forEach(function (n) { el.appendChild(n); });
      var i = 0;
      el.querySelectorAll('.swi').forEach(function (wi) { wi.style.transitionDelay = (i * 0.04) + 's'; i++; });
    } catch (e) { /* leave original markup if anything goes wrong */ }
  }

  /* ---------------------------------------------------------
     REVEAL OBSERVER
     --------------------------------------------------------- */
  function initReveals() {
    // promote prominent headings to word-split reveals (skip the hero h1 — it has its own line mask)
    var splitSel = '.section-head h2, .split-body h3, .band-inner .q, .cta-left h2, .scene-text h2';
    document.querySelectorAll(splitSel + ', [data-split]').forEach(function (el) {
      el.setAttribute('data-split', '');
      el.classList.remove('reveal', 'd1', 'd2', 'd3', 'd4', 'd5');
      applySplit(el);
    });
    // give the portrait split-media a clip-path reveal instead of a plain fade
    document.querySelectorAll('.split-media').forEach(function (el) {
      el.classList.add('clip-img');
      el.classList.remove('reveal', 'd1', 'd2', 'd3', 'd4', 'd5');
    });
    var els = Array.prototype.slice.call(
      document.querySelectorAll('.reveal, .line-mask, .clip-img, [data-split]')
    );
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (e) { e.classList.add('fired'); });
      return;
    }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('fired'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------------------------------------------------------
     ANIMATED COUNTERS
     --------------------------------------------------------- */
  function setCount(el, val) {
    if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = val;
    else el.textContent = val;
  }
  function initCounters() {
    var nums = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
    if (!nums.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      nums.forEach(function (n) { setCount(n, n.getAttribute('data-count')); });
      return;
    }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var dec = (el.getAttribute('data-count').split('.')[1] || '').length;
        var dur = 1700, start = performance.now();
        (function step(now) {
          var t = Math.min((now - start) / dur, 1);
          var e = 1 - Math.pow(1 - t, 3);
          setCount(el, (target * e).toFixed(dec));
          if (t < 1) requestAnimationFrame(step);
        })(start);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------------------------------------------------------
     SCROLL-DRIVEN: nav state, progress, parallax, scenes
     --------------------------------------------------------- */
  var nav = document.querySelector('.v2nav');
  var prog = document.querySelector('.scroll-prog');
  var parEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var bandBgs = Array.prototype.slice.call(document.querySelectorAll('.band-bg'));
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function updateScene(scene) {
    var slack = scene.offsetHeight - window.innerHeight;
    if (slack <= 0) return;
    var p = clamp(-scene.getBoundingClientRect().top / slack, 0, 1);
    var a = scene.querySelector('[data-col="a"]');
    var b = scene.querySelector('[data-col="b"]');
    if (a) { var sa = a.scrollHeight - a.parentElement.clientHeight; a.style.transform = 'translate3d(0,' + (-sa * p) + 'px,0)'; }
    if (b) { var sb = b.scrollHeight - b.parentElement.clientHeight; b.style.transform = 'translate3d(0,' + (-sb * (1 - p)) + 'px,0)'; }
  }

  function update() {
    var st = window.pageYOffset || docEl.scrollTop || 0;
    var vh = window.innerHeight;
    if (nav) nav.classList.toggle('scrolled', st > 60);
    if (prog) { var max = docEl.scrollHeight - vh; prog.style.transform = 'scaleX(' + (max > 0 ? clamp(st / max, 0, 1) : 0) + ')'; }
    if (reduce || isTouch) return; // parallax is desktop-only for smoothness
    parEls.forEach(function (el) {
      var sp = parseFloat(el.getAttribute('data-parallax')) || 0.12;
      var r = el.getBoundingClientRect();
      var center = r.top + r.height / 2 - vh / 2;
      el.style.transform = 'translate3d(0,' + (-center * sp).toFixed(1) + 'px,0)';
    });
    bandBgs.forEach(function (b) {
      var r = b.parentElement.getBoundingClientRect();
      var p = (vh - r.top) / (vh + r.height);
      b.style.transform = 'translate3d(0,' + (p * 18 - 9).toFixed(2) + '%,0)';
    });
    scenes.forEach(updateScene);
  }

  /* ---------------------------------------------------------
     LENIS SMOOTH SCROLL
     --------------------------------------------------------- */
  function initLenis() {
    if (reduce || isTouch || !window.Lenis) {
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      return;
    }
    lenis = new window.Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      syncTouch: false
    });
    function loop(t) { lenis.raf(t); update(); requestAnimationFrame(loop); }
    requestAnimationFrame(loop);
    window.addEventListener('resize', update);
    // route in-page anchors through Lenis
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id.length < 2) return;
        var el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -8, duration: 1.3 });
      });
    });
  }

  /* ---------------------------------------------------------
     GATEWAY — hover expand + curtain page transition
     --------------------------------------------------------- */
  function initGateway() {
    var gw = document.querySelector('.gw');
    if (!gw) return;
    var panels = gw.querySelectorAll('.gw-panel');
    panels.forEach(function (p) {
      p.setAttribute('tabindex', '0');
      p.addEventListener('mouseenter', function () {
        gw.setAttribute('data-hover', p.classList.contains('is-home') ? 'left' : 'right');
      });
      function go() {
        if (gw.classList.contains('exit')) return;
        var side = p.classList.contains('is-home') ? 'home' : 'invest';
        var href = p.getAttribute('data-href');
        gw.removeAttribute('data-hover');
        gw.classList.add('exit', 'exit-' + side);
        try { sessionStorage.setItem('elh-enter', '1'); } catch (e) {}
        setTimeout(function () { window.location.href = href; }, 820);
      }
      p.addEventListener('click', go);
      p.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });
    gw.addEventListener('mouseleave', function () { if (!gw.classList.contains('exit')) gw.removeAttribute('data-hover'); });
  }

  /* ---------------------------------------------------------
     ENTRANCE — replay a soft curtain on pages reached from gateway
     --------------------------------------------------------- */
  function playEntrance() {
    var fromGate = false;
    try { fromGate = sessionStorage.getItem('elh-enter') === '1'; sessionStorage.removeItem('elh-enter'); } catch (e) {}
    var c = document.querySelector('.page-curtain');
    if (!c || !fromGate || reduce) { if (c) c.remove(); return false; }
    c.classList.add('show');
    requestAnimationFrame(function () { requestAnimationFrame(function () { c.classList.add('lift'); }); });
    setTimeout(function () { c.remove(); }, 1100);
    return true;
  }

  /* ---------------------------------------------------------
     PRELOADER + BOOT
     --------------------------------------------------------- */
  function boot() {
    initReveals();
    initCounters();
    initLenis();
    initGateway();
    update();
    var gw = document.querySelector('.gw');
    if (gw) requestAnimationFrame(function () { gw.classList.add('ready'); });
    // failsafe: never leave content hidden
    setTimeout(function () {
      document.querySelectorAll('.reveal, .line-mask, .clip-img, [data-split]').forEach(function (e) { e.classList.add('fired'); });
    }, 4500);
  }

  function runPreloader() {
    var pre = document.getElementById('pre');
    var entered = playEntrance();
    // arriving from the gateway → the curtain is the intro; skip the numeric preloader
    if (entered) { if (pre) pre.classList.add('done'); boot(); return; }
    if (!pre) { boot(); return; }
    var fill = pre.querySelector('#pre-bar i');
    var pct = pre.querySelector('#pre-pct');
    var mark = pre.querySelector('#pre-mark span');
    if (mark) requestAnimationFrame(function () {
      mark.style.transition = 'transform 1s cubic-bezier(0.16,1,0.3,1)';
      mark.style.transform = 'translateY(0)';
    });
    var dur = reduce ? 1 : 1400, start = performance.now(), done = false;
    function finish() { if (done) return; done = true; pre.classList.add('done'); boot(); }
    (function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      if (fill) fill.style.right = (100 - e * 100) + '%';
      if (pct) pct.textContent = String(Math.floor(e * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 220);
    })(start);
    setTimeout(finish, 4000); // hard failsafe
  }

  /* ---------------------------------------------------------
     FORM (demo)
     --------------------------------------------------------- */
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('.cta-form');
    if (!f) return;
    e.preventDefault();
    var btn = f.querySelector('.cta-submit');
    if (btn) btn.textContent = 'Thank you — we’ll be in touch.';
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runPreloader);
  else runPreloader();
})();
