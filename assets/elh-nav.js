/* Ella Lee Homes: shared top-nav behaviour.
   Owns the bar's state machine, the Learn panel and the phone drawer. The script only writes
   <html data-elh-nav-state="...">, the open/closed classes and a few ARIA attributes; every colour,
   blur and transition lives in assets/site-nav.css.

   Client rule: "Hides on scroll down, returns on scroll up. Blue background only when 'Learn' is open."

     top     the page is scrolled less than the bar is tall: transparent over the hero
     hidden  scrolled down by at least 8px since the direction last changed, once past the bar
     shown   scrolled back up by at least 6px (or the bar was reached by keyboard): neutral dark glass
     open    the Learn panel or the phone drawer is open: solid navy, the only blue the bar shows

   The same rules apply on every page, on desktop and on phones. Pages that open on a light
   background carry data-elh-nav-solid on <body>; site-nav.css gives them the neutral bar in `top` too.
   (The old data-elh-nav-clear flag is not read any more.) */
(function () {
  'use strict';
  var nav = document.querySelector('[data-elh-nav]');
  if (!nav) return;

  var root = document.documentElement;
  var burger = nav.querySelector('[data-elh-burger]');
  var trigger = nav.querySelector('[data-elh-click="toggleMore"]');
  var panel = document.querySelector('[data-elh-more-panel], .nav-dd-panel');
  var drawer = document.querySelector('[data-elh-drawer]');
  var scrim = document.querySelector('[data-elh-scrim]');

  var HIDE_AFTER = 8;  // px of downward scroll, counted from the last change of direction
  var SHOW_AFTER = 6;  // px of upward scroll, counted the same way

  var state = '';
  var moreOpen = false;
  var drawerOpen = false;
  var lastY = 0;       // scroll position at the previous frame
  var run = 0;         // signed distance scrolled since the direction last changed
  var queued = false;
  var barH = 0;        // the bar's height, measured by syncHeight() rather than on every frame

  function scrollY() {
    return Math.max(0, window.pageYOffset || root.scrollTop || 0);
  }

  // Keeps the Learn panel flush under the bar. The height does not change between states, only
  // with the breakpoint, the viewport width and the web font, so this runs on load, on resize,
  // when the font arrives and whenever the bar's box changes.
  function syncHeight() {
    var h = nav.getBoundingClientRect().height;
    if (!h) return;
    barH = h;
    root.style.setProperty('--elh-nav-h', Math.round(h * 100) / 100 + 'px');
  }

  function setState(next) {
    if (next === state) return;
    state = next;
    root.setAttribute('data-elh-nav-state', next);
  }

  function resting(y) {
    return y < barH ? 'top' : 'shown';
  }

  // Leaving the open state: the bar stays where it is, and scrolling counts from here, so closing
  // Learn after scrolling cannot make the bar jump away.
  function settle() {
    lastY = scrollY();
    run = 0;
    setState(moreOpen || drawerOpen ? 'open' : resting(lastY));
  }

  function focusInBar() {
    try { return nav.matches(':focus-within'); } catch (e) { return nav.contains(document.activeElement); }
  }

  function frame() {
    queued = false;
    var y = scrollY();
    var dy = y - lastY;
    lastY = y;
    if (moreOpen || drawerOpen) { run = 0; return; }
    if (y < barH) { run = 0; setState('top'); return; }
    if (!dy) return;
    run = run * dy > 0 ? run + dy : dy;
    if (run >= HIDE_AFTER) {
      if (!focusInBar()) setState('hidden');
    } else if (run <= -SHOW_AFTER) {
      setState('shown');
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(frame);
  }

  function burgerShown() {
    return !!burger && window.getComputedStyle(burger).display !== 'none';
  }

  /* ── Learn panel ───────────────────────────────────── */
  function setMore(open, restoreFocus) {
    if (!panel || open === moreOpen) return;
    if (open && drawerOpen) setDrawer(false);
    moreOpen = open;
    panel.classList.toggle('is-open', open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    syncHeight();
    settle();
    if (!open && restoreFocus && trigger) trigger.focus({ preventScroll: true });
  }

  /* ── Phone drawer ──────────────────────────────────── */
  function drawerItems() {
    return Array.prototype.filter.call(drawer.querySelectorAll('a[href], button'), function (el) {
      return el.getClientRects().length > 0;
    });
  }

  function setDrawer(open, restoreFocus) {
    if (!drawer || !scrim || open === drawerOpen) return;
    if (open && moreOpen) setMore(false);
    drawerOpen = open;
    drawer.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    settle();
    if (open) {
      var items = drawerItems();
      var close = drawer.querySelector('button[data-elh-click="closeDrawer"]') || items[0];
      if (close) close.focus({ preventScroll: true });
    } else if (restoreFocus && burger) {
      burger.focus({ preventScroll: true });
    }
  }

  // A modal drawer keeps Tab inside itself.
  function trapTab(e) {
    var items = drawerItems();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    var active = document.activeElement;
    if (!drawer.contains(active)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  var CLICK = {
    openDrawer: function () { setDrawer(true); },
    // A keyboard activation has detail 0; only then does focus go back to the burger. After a tap
    // or click nothing is put back, so the bar is not held open by a focused button.
    closeDrawer: function (e) { setDrawer(false, !!e && e.detail === 0); },
    toggleMore: function (e) {
      e.stopPropagation();
      var open = !moreOpen;
      setMore(open);
      if (!open && e.detail > 0 && trigger) trigger.blur();
    }
  };

  Array.prototype.forEach.call(document.querySelectorAll('[data-elh-click]'), function (el) {
    var fn = CLICK[el.getAttribute('data-elh-click')];
    if (fn) el.addEventListener('click', function (e) { fn(e, el); });
  });

  // Any link in the drawer closes it (an in-page anchor would otherwise stay behind the scrim).
  if (drawer) {
    Array.prototype.forEach.call(drawer.querySelectorAll('a[href]'), function (a) {
      a.addEventListener('click', function () { setDrawer(false); });
    });
  }

  document.addEventListener('click', function (e) {
    if (!moreOpen) return;
    if (panel && !panel.contains(e.target) && !e.target.closest('[data-elh-more]')) setMore(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (moreOpen) setMore(false, true);
      if (drawerOpen) setDrawer(false, true);
    } else if (e.key === 'Tab' && drawerOpen) {
      trapTab(e);
    }
  });

  document.addEventListener('focusin', function (e) {
    if (nav.contains(e.target)) {
      // The bar was reached with the keyboard while it was out of sight: bring it back.
      if (state === 'hidden') { lastY = scrollY(); run = 0; setState(resting(lastY)); }
    } else if (moreOpen && panel && !panel.contains(e.target)) {
      // Focus moved on past the open panel.
      setMore(false);
    }
  });

  /* ── Layout changes ────────────────────────────────── */
  function onResize() {
    syncHeight();
    // The bar can collapse to the burger (or expand) while something is open.
    if (drawerOpen && !burgerShown()) setDrawer(false);
    if (moreOpen && burgerShown()) setMore(false);
    schedule();
  }

  // The homepage's key/bore intro is a first-arrival moment only. Any click
  // that navigates home from the nav flags the next load to skip it.
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-elh-nav] a, [data-elh-drawer] a'),
    function (a) {
      var href = a.getAttribute('href') || '';
      if (!/^(index\.html|\/|#top)/.test(href)) return;
      a.addEventListener('click', function () {
        try { sessionStorage.setItem('elhSkipIntro', '1'); } catch (e) {}
      });
    }
  );

  if (burger) {
    burger.setAttribute('aria-expanded', 'false');
    if (drawer && drawer.id) burger.setAttribute('aria-controls', drawer.id);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', syncHeight);
  window.addEventListener('pageshow', function (e) { if (e.persisted) { syncHeight(); settle(); } });
  if (window.ResizeObserver) new ResizeObserver(syncHeight).observe(nav);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncHeight);

  syncHeight();
  lastY = scrollY();
  setState(resting(lastY));
})();
