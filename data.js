/* TeeViewer data helper.
   status.tw sends Access-Control-Allow-Origin: https://status.tw only, so a
   direct browser fetch fails on every other origin. Try the API first, then
   two public CORS relays. ddstats.tw allows any origin and needs no relay. */
(function () {
  'use strict';

  var RELAYS = [
    function (url) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url); },
    function (url) { return 'https://cors.eu.org/' + url; }
  ];

  var cache = new Map();

  function timeout(ms) {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      return AbortSignal.timeout(ms);
    }
    var controller = new AbortController();
    setTimeout(function () { controller.abort(); }, ms);
    return controller.signal;
  }

  async function getJSON(url, ms) {
    var response = await fetch(url, { signal: timeout(ms || 12000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  window.fetchJSON = function (url) {
    if (cache.has(url)) return cache.get(url);
    var task = (async function () {
      try {
        return await getJSON(url, 8000);
      } catch (directError) {
        for (var i = 0; i < RELAYS.length; i += 1) {
          try {
            return await getJSON(RELAYS[i](url), 15000);
          } catch (relayError) {
            /* try the next relay */
          }
        }
        throw new Error('Live data unavailable');
      }
    })();
    cache.set(url, task);
    return task;
  };
})();
