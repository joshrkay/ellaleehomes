/* The Google reviews strip (partials/reviews.html) on Home, Why Us, Developers and Our Story:
   a looping native scroller, plus arrows that move it one card at a time. Moved here from assets/home.js. */
(function () {
  /** The reviews strip is a native scroller (swipe, wheel and keyboard keep working); the arrows only add a way to move it. */
  function reviewsParts() {
    var scroller = document.getElementById('reviews-scroller');
    if (!scroller) return null;
    return {
      scroller: scroller,
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

  /** Cards in one copy of the reviews; the strip holds three copies so it can wrap without a visible jump. */
  function reviewsSetWidth(scroller) {
    var n = parseInt(scroller.dataset.elhOriginals, 10) || 0;
    return n * reviewsStep(scroller);
  }

  /** Hide the arrows when nothing overflows. The strip loops, so neither arrow is ever disabled. */
  function reviewsSync() {
    var r = reviewsParts();
    if (!r) return;
    var set = reviewsSetWidth(r.scroller);
    if (set > 0) {
      var x = r.scroller.scrollLeft;
      // Past either outer copy: jump by exactly one copy, landing on the identical card (snap points line up).
      if (x < set * 0.5) r.scroller.scrollLeft = x + set;
      else if (x >= set * 1.5) r.scroller.scrollLeft = x - set;
    }
    if (r.group) r.group.hidden = r.scroller.scrollWidth - r.scroller.clientWidth <= 1;
  }

  /** One card per press. A card-wide step lands on the next snap point, so scroll-snap stays in charge. */
  function reviewsGo(dir, btn) {
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
    var sc = r.scroller;
    if (!sc.dataset.elhOriginals) {
      var originals = Array.prototype.slice.call(sc.children);
      sc.dataset.elhOriginals = String(originals.length);
      for (var k = 0; k < 2; k++) {
        originals.forEach(function (card) {
          var c = card.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          Array.prototype.forEach.call(c.querySelectorAll('a,button'), function (n) { n.setAttribute('tabindex', '-1'); });
          if (c.matches('a,button')) c.setAttribute('tabindex', '-1');
          sc.appendChild(c);
        });
      }
      // Start on the middle copy so there is room to scroll both ways.
      sc.scrollLeft = reviewsSetWidth(sc);
    }
    sc.addEventListener('scroll', reviewsSync, { passive: true });
    window.addEventListener('resize', reviewsSync);
    if (window.ResizeObserver) new ResizeObserver(reviewsSync).observe(sc);
    reviewsSync();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-elh-reviews-go]'), function (btn) {
      btn.addEventListener('click', function () { reviewsGo(Number(btn.getAttribute('data-elh-reviews-go')), btn); });
    });
    initReviews();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
