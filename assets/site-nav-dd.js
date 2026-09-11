/* Ella Lee Homes — dropdown + hamburger nav behaviour */
(function () {
  'use strict';
  var gold = '#C9A96E';

  // ── Desktop dropdown ──────────────────────────────────────────────
  var ddLi     = document.querySelector('.nav-has-dd');
  var ddPanel  = document.querySelector('.nav-dd-panel');
  var ddBtn    = ddLi  && ddLi.querySelector('.nav-dd-trigger');
  var ddTimer;

  function ddOpen() {
    clearTimeout(ddTimer);
    if (!ddLi) return;
    ddLi.classList.add('dd-open');
    if (ddPanel)  ddPanel.classList.add('is-open');
    if (ddBtn)    ddBtn.setAttribute('aria-expanded', 'true');
  }
  function ddClose(delay) {
    ddTimer = setTimeout(function () {
      if (!ddLi) return;
      ddLi.classList.remove('dd-open');
      if (ddPanel)  ddPanel.classList.remove('is-open');
      if (ddBtn)    ddBtn.setAttribute('aria-expanded', 'false');
    }, delay != null ? delay : 0);
  }

  if (ddLi) {
    ddLi.addEventListener('mouseenter', ddOpen);
    ddLi.addEventListener('mouseleave', function () { ddClose(150); });
    if (ddPanel) {
      ddPanel.addEventListener('mouseenter', ddOpen);
      ddPanel.addEventListener('mouseleave', function () { ddClose(150); });
    }
    if (ddBtn) ddBtn.addEventListener('click', function () {
      ddLi.classList.contains('dd-open') ? ddClose(0) : ddOpen();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') ddClose(0);
    });
    document.addEventListener('click', function (e) {
      if (ddPanel && ddPanel.classList.contains('is-open') &&
          !ddLi.contains(e.target) && !ddPanel.contains(e.target)) {
        ddClose(0);
      }
    });
  }

  // ── Hamburger / mobile panel ──────────────────────────────────────
  var hamburger     = document.querySelector('.nav-hamburger');
  var mobileOverlay = document.querySelector('.nav-mobile-overlay');
  var learnSection  = mobileOverlay && mobileOverlay.querySelector('.nav-mobile-learn-section');
  var learnBtn      = learnSection  && learnSection.querySelector('.nav-mobile-learn-btn');

  // Mobile menu opens with Learn pre-expanded so it reads as a full menu, not a collapsed accordion.
  if (learnSection) learnSection.classList.add('open');

  function mOpen() {
    if (!hamburger || !mobileOverlay) return;
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileOverlay.classList.add('is-open');
    mobileOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function mClose() {
    if (!hamburger || !mobileOverlay) return;
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileOverlay.classList.remove('is-open');
    mobileOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', function () {
    hamburger.classList.contains('is-open') ? mClose() : mOpen();
  });
  if (mobileOverlay) mobileOverlay.addEventListener('click', function (e) {
    if (e.target === mobileOverlay) mClose();
  });
  if (learnBtn) learnBtn.addEventListener('click', function () {
    if (learnSection) learnSection.classList.toggle('open');
  });
  if (mobileOverlay) Array.prototype.forEach.call(
    mobileOverlay.querySelectorAll('a'), function (a) {
      a.addEventListener('click', mClose);
    }
  );

  // ── Hide-on-scroll: hide the bar when scrolling down, reveal on scroll up ──
  // Skipped on the homepage — its hero runs a bespoke nav-logo drift/scale
  // choreography that a translateY hide would fight (logo flies off-screen).
  var nav = document.getElementById('nav');
  if (nav && !document.body.classList.contains('theme-home')) {
    var lastY = window.pageYOffset || 0;
    var ticking = false;
    function onNavScroll() {
      var y = window.pageYOffset || 0;
      var menuOpen = mobileOverlay && mobileOverlay.classList.contains('is-open');
      var ddIsOpen = ddPanel && ddPanel.classList.contains('is-open');
      if (!menuOpen && !ddIsOpen) {
        if (y > lastY && y > 140) nav.classList.add('nav-hidden');
        else if (y < lastY - 4) nav.classList.remove('nav-hidden');
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(onNavScroll); ticking = true; }
    }, { passive: true });
  }
})();
