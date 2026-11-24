// Highlight the current page's nav item.
(function () {
  function apply() {
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!path) return;
    var items = document.querySelectorAll('.nav-buttons .categories, .nav-buttons a');
    items.forEach(function (el) {
      var hay = ((el.getAttribute('onclick') || '') + ' ' + (el.getAttribute('href') || '')).toLowerCase();
      if (hay.indexOf(path) !== -1) {
        el.classList.add('active');
        el.setAttribute('aria-current', 'page');
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();