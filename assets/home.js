/**
 * Homepage behaviour: sticky/hiding nav, mobile drawer, "More" menu, the
 * scroll-driven Experience timeline, the dragging project strip, FAQ
 * accordions and the inquiry form.
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
      var tick = function () {
        if (!track.isConnected) { track.__elhRaf = null; return; }
        if (!s.step || s.step < 60) measure();
        if (!s.paused && !s.dragging) s.target += 0.17;
        s.x += (s.target - s.x) * 0.07;
        if (s.span > 0) {
          while (s.x >= s.span) { s.x -= s.span; s.target -= s.span; }
          while (s.x < 0) { s.x += s.span; s.target += s.span; }
        }
        track.style.transform = 'translate3d(' + (-s.x).toFixed(2) + 'px,0,0)';
        curve(track);
        track.__elhRaf = requestAnimationFrame(tick);
      };
      track.__elhRaf = requestAnimationFrame(tick);
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
      el.style.color = i === idx ? '#EAE5DC' : 'rgba(234,229,220,.44)';
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
    var nav = document.querySelector('[data-elh-nav]');
    if (nav) {
      var y = window.scrollY;
      var hero = document.getElementById('top');
      var heroBottom = hero ? hero.offsetHeight - 80 : 600;
      var prev = lastY == null ? 0 : lastY;
      var goingDown = y > prev + 4;
      var goingUp = y < prev - 4;
      if (goingDown || goingUp) lastY = y;
      else if (lastY == null) lastY = y;
      var isPhone = window.matchMedia('(max-width: 767px)').matches;
      if (isPhone) {
        nav.style.transform = 'translateY(0)';
        nav.style.background = 'transparent';
        nav.style.backdropFilter = 'none';
        nav.style.borderBottomColor = 'rgba(234,229,220,0)';
        lastY = y;
      } else if (y < heroBottom) {
        nav.style.transform = 'translateY(0)';
      } else if (goingDown) {
        nav.style.transform = 'translateY(-105%)';
      } else if (goingUp) {
        nav.style.transform = 'translateY(0)';
      }
      var past = y > 80;
      if (!isPhone) {
        nav.style.background = past ? 'rgba(0,21,38,.94)' : 'transparent';
        nav.style.backdropFilter = past ? 'blur(10px)' : 'none';
        nav.style.paddingTop = past ? '13px' : '20px';
        nav.style.paddingBottom = past ? '13px' : '20px';
        nav.style.borderBottomColor = past ? 'rgba(234,229,220,.14)' : 'rgba(234,229,220,0)';
      }
    }

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
    openDrawer: function () { setDrawer(true); },
    closeDrawer: function () { setDrawer(false); },
    toggleMore: function (e) { e.stopPropagation(); setMore(!moreOpen); },
    stripPrev: function () { stripNudge(-1); },
    stripNext: function () { stripNudge(1); },
    toggleFaq: function (e, el) { toggleFaq(el); },
  };

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-click]'), function (el) {
      var fn = CLICK[el.getAttribute('data-elh-click')];
      if (fn) el.addEventListener('click', function (e) { fn(e, el); });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-submit]'), function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = form.querySelector('[data-elh-form-msg]');
        if (msg) msg.style.display = 'block';
        form.reset();
      });
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
