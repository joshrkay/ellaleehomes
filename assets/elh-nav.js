/* Ella Lee Homes — shared top-nav behaviour.
   Owns the fixed header (transparent over the first screen, solid after),
   hide-on-scroll, the mobile drawer and the Learn mega-panel.
   The homepage passes ELH_NAV_HERO=1 via a data attribute on <body> so the
   bar stays transparent across its taller hero; other pages go solid at 80px. */
(function () {
  'use strict';
  var nav = document.querySelector('[data-elh-nav]');
  if (!nav) return;

  var lastY = null, drawerOpen = false, moreOpen = false;

  function heroBottom() {
    var hero = document.querySelector('[data-elh-hero], #top');
    return hero ? hero.offsetHeight - 80 : 0;
  }

  function syncHeight() {
    document.documentElement.style.setProperty('--elh-nav-h', nav.offsetHeight + 'px');
  }

  function onScroll() {
    syncHeight();
    if (moreOpen) return;
    var y = window.scrollY;
    var hb = heroBottom();
    var prev = lastY == null ? 0 : lastY;
    var goingDown = y > prev + 4, goingUp = y < prev - 4;
    if (goingDown || goingUp) lastY = y; else if (lastY == null) lastY = y;
    var isPhone = window.matchMedia('(max-width: 767px)').matches;
    if (isPhone) {
      nav.style.transform = 'translateY(0)';
      nav.style.background = 'transparent';
      nav.style.backdropFilter = 'none';
      nav.style.borderBottomColor = 'rgba(234,229,220,0)';
      lastY = y;
      return;
    }
    if (y < hb) nav.style.transform = 'translateY(0)';
    else if (goingDown) nav.style.transform = 'translateY(-105%)';
    else if (goingUp) nav.style.transform = 'translateY(0)';
    var past = y > 80;
    nav.style.background = past ? 'rgba(0,21,38,.94)' : 'transparent';
    nav.style.backdropFilter = past ? 'blur(10px)' : 'none';
    nav.style.paddingTop = past ? '13px' : '20px';
    nav.style.paddingBottom = past ? '13px' : '20px';
    nav.style.borderBottomColor = past ? 'rgba(234,229,220,.14)' : 'rgba(234,229,220,0)';
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
    var panel = document.querySelector('[data-elh-more-panel], .nav-dd-panel');
    var caret = document.querySelector('[data-elh-more-caret]');
    var trigger = document.querySelector('[data-elh-click="toggleMore"]');
    if (!panel) return;
    moreOpen = open;
    panel.classList.toggle('is-open', open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (caret) caret.style.transform = open ? 'rotate(-135deg) translateY(2px)' : 'rotate(45deg) translateY(-2px)';
    // With the panel down the bar must read as a solid navy shelf, not as
    // transparent glass over the hero photo.
    if (open) {
      nav.style.transform = 'translateY(0)';
      nav.style.background = '#001526';
      nav.style.backdropFilter = 'none';
      nav.style.borderBottomColor = 'rgba(234,229,220,0)';
      syncHeight();
      setTimeout(syncHeight, 420);
    } else {
      onScroll();
    }
  }

  var CLICK = {
    openDrawer: function () { setDrawer(true); },
    closeDrawer: function () { setDrawer(false); },
    toggleMore: function (e) { e.stopPropagation(); setMore(!moreOpen); }
  };

  Array.prototype.forEach.call(document.querySelectorAll('[data-elh-click]'), function (el) {
    var fn = CLICK[el.getAttribute('data-elh-click')];
    if (fn) el.addEventListener('click', function (e) { fn(e, el); });
  });

  document.addEventListener('click', function (e) {
    if (!moreOpen) return;
    var panel = document.querySelector('[data-elh-more-panel], .nav-dd-panel');
    if (panel && !panel.contains(e.target) && !e.target.closest('[data-elh-more]')) setMore(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (moreOpen) setMore(false);
    if (drawerOpen) setDrawer(false);
  });

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

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', syncHeight);
  onScroll();
})();
