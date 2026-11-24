// Normalize the top nav: fixed order + active-page highlight, on every page.
(function () {
  var ORDER = ['players', 'clans', 'maps', 'servers', 'status', 'discord'];

  function hayOf(el) {
    return ((el.getAttribute('href') || '') + ' ' + (el.getAttribute('onclick') || '')).toLowerCase();
  }
  function rank(el) {
    var hay = hayOf(el);
    if (hay.indexOf('discord') !== -1 || hay.indexOf('oauth2') !== -1) return 5;
    for (var i = 0; i < 5; i++) { if (hay.indexOf(ORDER[i]) !== -1) return i; }
    return 9;
  }

  function apply() {
    var nav = document.querySelector('.nav-buttons');
    if (nav) {
      var items = Array.prototype.slice.call(nav.children);
      items.sort(function (a, b) { return rank(a) - rank(b); });
      items.forEach(function (el) { nav.appendChild(el); });
    }
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!path) return;
    document.querySelectorAll('.nav-buttons .categories, .nav-buttons a').forEach(function (el) {
      if (hayOf(el).indexOf(path) !== -1) {
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