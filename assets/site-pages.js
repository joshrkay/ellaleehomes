/**
 * Shared interactions for Ella Lee Homes content pages.
 * FAQ accordion: toggles open state + panel max-height and keeps ARIA in sync
 * (aria-expanded on the trigger, aria-controls pointing at the answer panel).
 * Used by faq.html and investors.html.
 */
(function () {
  var qs = document.querySelectorAll('.faq-q');
  qs.forEach(function (q, i) {
    var item = q.closest('.faq-item');
    var ans = item ? item.querySelector('.faq-a') : null;
    if (!ans) return;
    if (!ans.id) ans.id = 'faq-a-' + (i + 1);
    q.setAttribute('aria-expanded', 'false');
    q.setAttribute('aria-controls', ans.id);
    q.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      ans.style.maxHeight = open ? ans.scrollHeight + 'px' : null;
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
})();
