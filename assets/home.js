/**
 * Homepage behaviour: sticky/hiding nav, mobile drawer, "More" menu, the
 * scroll-driven Experience timeline, the dragging project strip and FAQ
 * accordions.
 *
 * Ported from the design-canvas export, which drove all of this from a
 * component class; every effect here is plain DOM work, so it runs as a
 * standalone script with no framework.
 */
(function () {
  'use strict';

  var arcCache = {};

  /** Concave mask for a project card's copy panel. */
  function arcPanel(dipPx, h) {
    if (!h) return 'none';
    var u = Math.max(1, Math.min(30, (dipPx / h) * 100));
    var key = 'p' + u.toFixed(1);
    if (!arcCache[key]) {
      arcCache[key] = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='%23000' d='M0 " +
        u.toFixed(2) + " Q50 " + (-u).toFixed(2) + " 100 " + u.toFixed(2) + " L100 100 Q50 " +
        (100 - 2 * u).toFixed(2) + " 0 100 Z'/%3E%3C/svg%3E\")";
    }
    return arcCache[key];
  }

  /** Matching arc for the card's image frame. */
  function arcFor(dipPx, h) {
    if (!h) return 'none';
    var q = Math.max(2, Math.min(46, (2 * dipPx / h) * 100));
    var key = q.toFixed(1);
    if (!arcCache[key]) {
      arcCache[key] = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath fill='%23000' d='M0 0 Q50 " +
        key + " 100 0 L100 100 Q50 " + (100 - q).toFixed(1) + " 0 100 Z'/%3E%3C/svg%3E\")";
    }
    return arcCache[key];
  }

  /** Widen and arc each card according to its distance from centre screen. */
  function curve(track) {
    var mid = window.innerWidth / 2;
    for (var i = 0; i < track.children.length; i++) {
      var card = track.children[i];
      var box = card.getBoundingClientRect();
      if (box.right < -400 || box.left > window.innerWidth + 400) continue;
      var d = (box.left + box.width / 2 - mid) / mid;
      if (d > 1.5) d = 1.5;
      if (d < -1.5) d = -1.5;
      var a = Math.abs(d);
      var frame = card.querySelector('[data-elh-frame]');

      var k = Math.min(a, 1.3);
      card.style.transform = '';
      card.style.opacity = '';
      var slot = frame && frame.querySelector('.elh-img');
      if (slot) {
        slot.style.transform = 'scaleX(' + (1 + k * 0.3).toFixed(4) + ') scaleY(' + (1 + k * 0.1).toFixed(4) + ')';
        slot.style.transformOrigin = '50% 50%';
      }
      var vw = window.innerWidth;
      var dip = 28;
      if (card.style.maskImage) {
        card.style.webkitMaskImage = 'none';
        card.style.maskImage = 'none';
      }
      var apply = function (el, img) {
        el.style.webkitMaskImage = img;
        el.style.maskImage = img;
        el.style.webkitMaskRepeat = 'no-repeat';
        el.style.maskRepeat = 'no-repeat';
        el.style.webkitMaskSize = vw + 'px 100%';
        el.style.maskSize = vw + 'px 100%';
        el.style.webkitMaskPosition = (-box.left).toFixed(1) + 'px 0';
        el.style.maskPosition = (-box.left).toFixed(1) + 'px 0';
      };
      var panel = card.querySelector('[data-elh-panel]');
      var fh = frame ? frame.getBoundingClientRect().height : 0;
      var ph = panel ? panel.getBoundingClientRect().height : 0;
      var fArc = arcFor(dip, fh);
      var pArc = arcPanel(dip, ph);
      if (fArc === 'none' || pArc === 'none') continue;
      if (frame) {
        frame.style.transform = '';
        apply(frame, fArc);
      }
      if (panel) {
        panel.style.marginTop = -dip + 'px';
        apply(panel, pArc);
      }
    }
  }

  /** Auto-scroll speed of the project strip, in pixels per second: the same on a 60 Hz and a 120 Hz screen. */
  var STRIP_PX_PER_SEC = 18;
  /** Longest frame time the strip counts, so a tab that sat in the background does not make it jump on return. */
  var STRIP_MAX_DT = 0.1;
  /** How long the strip waits for its photos to decode before it starts anyway. */
  var STRIP_DECODE_WAIT_MS = 3000;

  /**
   * Resolves once every image under `root` has loaded and decoded, or after `ms`, whichever comes first.
   * Decoding ahead of time keeps a card from scrolling into view before its photo is ready to paint.
   */
  function whenDecoded(root, ms) {
    var jobs = Array.prototype.map.call(root.querySelectorAll('img'), function (img) {
      // A lazy image never loads until it is near the screen, so it could not be decoded ahead of time.
      if (img.loading === 'lazy') img.loading = 'eager';
      return img.decode ? img.decode().catch(function () { /* a broken image must not hold the strip back */ }) : Promise.resolve();
    });
    return new Promise(function (resolve) {
      var timer = setTimeout(resolve, ms);
      Promise.all(jobs).then(function () { clearTimeout(timer); resolve(); });
    });
  }

  /** Endless, draggable project strip. */
  function initStrip() {
    var track = document.querySelector('[data-elh-track]');
    var strip = document.querySelector('[data-elh-strip]');
    if (!track || !strip) return;

    var originalCount;
    if (track.dataset.elhReady) {
      originalCount = parseInt(track.dataset.elhOriginals, 10) || (track.children.length / 3);
    } else {
      var originals = Array.prototype.slice.call(track.children);
      originalCount = originals.length;
      track.dataset.elhReady = '1';
      track.dataset.elhOriginals = String(originalCount);
      for (var r = 0; r < 2; r++) {
        for (var j = 0; j < originals.length; j++) {
          var c = originals[j].cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          c.setAttribute('tabindex', '-1');
          // Cloned ids would otherwise collide with the originals.
          Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (n) {
            n.setAttribute('id', n.getAttribute('id') + '--loop' + (r + 1));
          });
          track.appendChild(c);
        }
      }
    }

    var s = track.__elhStrip || (track.__elhStrip = { x: 0, target: 0, paused: false, span: 0, step: 0, dragging: false });
    s.originalCount = originalCount;

    var measure = function () {
      var first = track.children[0];
      if (!first) return;
      var w = first.getBoundingClientRect().width;
      if (w < 60) return;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      s.step = w + gap;
      s.span = s.step * s.originalCount;
      curve(track);
    };
    measure();
    if (window.ResizeObserver && !track.__elhRO) {
      track.__elhRO = new ResizeObserver(measure);
      track.__elhRO.observe(track.children[0]);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);

    strip.addEventListener('pointerenter', function () { s.paused = true; });
    strip.addEventListener('pointerleave', function () { s.paused = false; });

    var startX = 0;
    var startTarget = 0;
    // The cards are links wrapping images, both natively draggable. Without
    // this the browser starts a link/image drag on pointerdown, fires
    // pointercancel, and the strip's own drag dies after a few pixels.
    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    // A drag that ends over a card would otherwise fire its click and
    // navigate. Past this much movement, treat it as a drag and swallow the
    // click that follows.
    var DRAG_SLOP = 6;
    var dragged = false;
    track.addEventListener('pointerdown', function (e) {
      s.dragging = true; startX = e.clientX; startTarget = s.target;
      dragged = false;
      track.style.cursor = 'grabbing';
    });
    track.addEventListener('pointermove', function (e) {
      if (!s.dragging) return;
      if (!dragged && Math.abs(e.clientX - startX) > DRAG_SLOP) {
        dragged = true;
        // Capture only once this is genuinely a drag. Capturing on pointerdown
        // retargets the click to the track, which is what kept the cards from
        // opening their project page at all.
        try { track.setPointerCapture(e.pointerId); } catch (err) { /* capture is best-effort */ }
      }
      s.target = startTarget - (e.clientX - startX);
      s.x = s.target;
    });
    var endDrag = function () { s.dragging = false; track.style.cursor = 'grab'; };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    // Capture phase, so this runs before the anchor sees the click.
    track.addEventListener('click', function (e) {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    if (!track.__elhRaf) {
      var last = 0;
      var tick = function (now) {
        if (!track.isConnected) { track.__elhRaf = null; return; }
        // Seconds since the previous frame, so the speed does not depend on the screen's refresh rate.
        var dt = last ? Math.min(Math.max((now - last) / 1000, 0), STRIP_MAX_DT) : 0;
        last = now;
        if (!s.step || s.step < 60) measure();
        if (!s.paused && !s.dragging) s.target += STRIP_PX_PER_SEC * dt;
        // Same 7% per frame at 60 Hz, now as a function of elapsed time.
        s.x += (s.target - s.x) * (1 - Math.pow(0.93, dt * 60));
        if (s.span > 0) {
          while (s.x >= s.span) { s.x -= s.span; s.target -= s.span; }
          while (s.x < 0) { s.x += s.span; s.target += s.span; }
        }
        track.style.transform = 'translate3d(' + (-s.x).toFixed(2) + 'px,0,0)';
        curve(track);
        track.__elhRaf = requestAnimationFrame(tick);
      };
      // Hold the loop until the photos (the clones too) have decoded; the flag keeps a second initStrip() from starting another loop.
      track.__elhRaf = true;
      whenDecoded(track, STRIP_DECODE_WAIT_MS).then(function () {
        track.__elhRaf = track.isConnected ? requestAnimationFrame(tick) : null;
      });
    }
    curve(track);
    requestAnimationFrame(function () { curve(track); });
  }

  var stage = null;

  /** Light up the Experience timeline up to `idx`, `p` through to the next stop. */
  function setStage(idx, p) {
    var fill = document.querySelector('[data-elh-tl-fill]');
    if (fill && fill.parentElement) {
      var railBox = fill.parentElement.getBoundingClientRect();
      var railW = railBox.width || 1;
      var railL = railBox.left;
      var stops = Array.prototype.map.call(document.querySelectorAll('[data-elh-tl-node]'), function (n) {
        var r = n.getBoundingClientRect();
        return ((r.left + r.width / 2) - railL) / railW * 100;
      });
      var rail = document.querySelector('[data-elh-tl-rail]');
      if (rail && stops.length) rail.style.width = stops[stops.length - 1].toFixed(2) + '%';
      if (stops.length) {
        var t = Math.max(0, Math.min(1, p == null ? 0 : p));
        var from = stops[Math.min(idx, stops.length - 1)];
        var to = stops[Math.min(idx + 1, stops.length - 1)];
        fill.style.width = (from + (to - from) * t).toFixed(2) + '%';
      }
    }
    if (idx === stage) return;
    stage = idx;
    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-tl-node]'), function (el, i) {
      el.style.background = i <= idx ? '#BFA06A' : '#001526';
      el.style.borderColor = i <= idx ? '#BFA06A' : 'rgba(234,229,220,.42)';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-tl-label]'), function (el, i) {
      el.style.color = i === idx ? '#EAE5DC' : 'rgba(234,229,220,.62)';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-tl-img]'), function (el, i) {
      el.style.opacity = i === idx ? '1' : '0';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-tl-copy]'), function (el, i) {
      var on = i === idx;
      el.style.opacity = on ? '1' : '0';
      el.style.transform = on ? 'translateY(0)' : 'translateY(14px)';
      el.style.pointerEvents = on ? 'auto' : 'none';
    });
  }

  var lastY = null;
  var drawerOpen = false;
  var moreOpen = false;

  function handleScroll() {
    // The shared top nav is owned by assets/elh-nav.js.
    var sweep = document.querySelector('[data-elh-sweep]');
    if (sweep) {
      var r = sweep.getBoundingClientRect();
      var vh = window.innerHeight;
      var sp = (vh * 0.82 - r.top) / (r.height + vh * 0.34);
      sp = sp < 0 ? 0 : sp > 1 ? 1 : sp;
      var edge = (sp * 118).toFixed(1);
      var tail = (sp * 118 + 16).toFixed(1);
      sweep.style.backgroundImage =
        'linear-gradient(100deg, #EAE5DC 0%, #EAE5DC ' + edge + '%, rgba(234,229,220,.3) ' + tail + '%, rgba(234,229,220,.3) 100%)';
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-parallax]'), function (el) {
      var box = el.parentElement.getBoundingClientRect();
      var pp = (box.top + box.height / 2 - window.innerHeight / 2) / window.innerHeight;
      el.style.transform = 'translateY(' + (pp * -34).toFixed(2) + 'px)';
    });

    var tl = document.querySelector('[data-elh-tl-wrap]');
    if (tl && tl.offsetParent !== null) {
      var tr = tl.getBoundingClientRect();
      var span = tr.height - window.innerHeight;
      var p = span > 0 ? -tr.top / span : 0;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var stops = [0, 0.29, 0.58, 0.87];
      var idx = 0;
      for (var i = 0; i < stops.length; i++) if (p >= stops[i]) idx = i;
      var nextStop = idx < 3 ? stops[idx + 1] : 1;
      var t = idx < 3 ? (p - stops[idx]) / (nextStop - stops[idx]) : 0;
      setStage(idx, t);
    }
  }

  function setDrawer(open) {
    var d = document.querySelector('[data-elh-drawer]');
    var s = document.querySelector('[data-elh-scrim]');
    if (!d || !s) return;
    drawerOpen = open;
    d.style.transform = open ? 'translateX(0)' : 'translateX(-100%)';
    s.style.opacity = open ? '1' : '0';
    s.style.pointerEvents = open ? 'auto' : 'none';
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function setMore(open) {
    var panel = document.querySelector('[data-elh-more-panel]');
    var caret = document.querySelector('[data-elh-more-caret]');
    var trigger = document.querySelector('[data-elh-click="toggleMore"]');
    if (!panel) return;
    moreOpen = open;
    // The panel is the shared `.nav-dd-panel` the inner pages use, so it
    // animates off a class rather than an inline display swap.
    panel.classList.toggle('is-open', open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (caret) caret.style.transform = open ? 'rotate(-135deg) translateY(2px)' : 'rotate(45deg) translateY(-2px)';
  }

  function stripNudge(dir) {
    var t = document.querySelector('[data-elh-track]');
    if (t && t.__elhStrip) t.__elhStrip.target += dir * t.__elhStrip.step;
  }

  /** The reviews strip is a native scroller (swipe, wheel and keyboard keep working); the arrows only add a way to move it. */
  function reviewsParts() {
    var scroller = document.getElementById('reviews-scroller');
    if (!scroller) return null;
    return {
      scroller: scroller,
      prev: document.querySelector('[data-elh-click="reviewsPrev"]'),
      next: document.querySelector('[data-elh-click="reviewsNext"]'),
      group: document.querySelector('[data-elh-reviews-nav]'),
    };
  }

  /** Distance between one card's left edge and the next: card width plus the flex gap. */
  function reviewsStep(scroller) {
    var first = scroller.children[0];
    if (!first) return 0;
    var gap = parseFloat(getComputedStyle(scroller).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  /** Hide the arrows when nothing overflows; mark each one aria-disabled at its end of the strip. */
  function reviewsSync() {
    var r = reviewsParts();
    if (!r || !r.prev || !r.next) return;
    var max = r.scroller.scrollWidth - r.scroller.clientWidth;
    if (r.group) r.group.hidden = max <= 1;
    r.prev.setAttribute('aria-disabled', r.scroller.scrollLeft <= 1 ? 'true' : 'false');
    r.next.setAttribute('aria-disabled', r.scroller.scrollLeft >= max - 1 ? 'true' : 'false');
  }

  /** One card per press. A card-wide step lands on the next snap point, so scroll-snap stays in charge. */
  function reviewsGo(dir, btn) {
    if (btn && btn.getAttribute('aria-disabled') === 'true') return;
    var r = reviewsParts();
    if (!r) return;
    var step = reviewsStep(r.scroller);
    if (!step) return;
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    r.scroller.scrollBy({ left: dir * step, behavior: calm ? 'auto' : 'smooth' });
  }

  function initReviews() {
    var r = reviewsParts();
    if (!r) return;
    r.scroller.addEventListener('scroll', reviewsSync, { passive: true });
    window.addEventListener('resize', reviewsSync);
    if (window.ResizeObserver) new ResizeObserver(reviewsSync).observe(r.scroller);
    reviewsSync();
  }

  function toggleFaq(btn) {
    var panel = btn.parentElement.querySelector('[data-elh-faq-panel]');
    var icon = btn.querySelector('[data-elh-faq-icon]');
    if (!panel) return;
    var open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    if (icon) icon.textContent = open ? '+' : '–';
  }

  var CLICK = {
    stripPrev: function () { stripNudge(-1); },
    stripNext: function () { stripNudge(1); },
    reviewsPrev: function (e, el) { reviewsGo(-1, el); },
    reviewsNext: function (e, el) { reviewsGo(1, el); },
    toggleFaq: function (e, el) { toggleFaq(el); },
  };

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-click]'), function (el) {
      var fn = CLICK[el.getAttribute('data-elh-click')];
      if (fn) el.addEventListener('click', function (e) { fn(e, el); });
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    document.addEventListener('click', function (e) {
      // The panel sits outside the trigger (it spans the viewport), so a click
      // inside it must not count as a click away.
      var root = document.querySelector('[data-elh-more]');
      var panel = document.querySelector('[data-elh-more-panel]');
      var inMenu = (root && root.contains(e.target)) || (panel && panel.contains(e.target));
      if (root && !inMenu) setMore(false);
      if (drawerOpen && e.target.closest && e.target.closest('[data-elh-drawer] a')) setDrawer(false);
      var mk = e.target.closest && e.target.closest('[data-elh-tl-marker]');
      if (mk) {
        var wrap = document.querySelector('[data-elh-tl-wrap]');
        if (wrap) {
          var i = Number(mk.dataset.elhTlMarker);
          var span = wrap.offsetHeight - window.innerHeight;
          var top = wrap.getBoundingClientRect().top + window.scrollY;
          var stops = [0.02, 0.33, 0.62, 0.93];
          window.scrollTo({ top: top + span * stops[i], behavior: 'smooth' });
        }
      }
    });

    requestAnimationFrame(handleScroll);
    initStrip();
    initReviews();

    var hv = document.querySelector('[data-elh-herovid]');
    if (hv && hv.getAttribute('src')) {
      hv.addEventListener('playing', function () { hv.style.opacity = '1'; }, { once: true });
      var play = hv.play();
      if (play && play.catch) play.catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
