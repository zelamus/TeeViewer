/* TeeViewer data helper.
   status.tw sends Access-Control-Allow-Origin: https://status.tw only, so a
   direct browser fetch fails on every other origin. Use public CORS relays.
   ddstats.tw allows any origin and needs no relay. All relays are free. */
(function () {
  'use strict';

  var RELAYS = [
    { url: function (u) { return 'https://r.jina.ai/' + u; }, text: true },
    { url: function (u) { return 'https://cors.eu.org/' + u; }, text: false },
    { url: function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); }, text: false }
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

  function parseRelayText(body) {
    var start = -1;
    var objectStart = body.indexOf('{');
    var arrayStart = body.indexOf('[');

    if (objectStart !== -1 && arrayStart !== -1) {
      start = Math.min(objectStart, arrayStart);
    } else if (objectStart !== -1) {
      start = objectStart;
    } else if (arrayStart !== -1) {
      start = arrayStart;
    }

    if (start === -1) {
      throw new Error('No JSON in relay response');
    }

    return JSON.parse(body.slice(start));
  }

  async function getJSON(requestUrl, asText) {
    var response = await fetch(requestUrl, { signal: timeout(25000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return asText ? parseRelayText(await response.text()) : response.json();
  }

  window.fetchJSON = function (url) {
    if (cache.has(url)) return cache.get(url);
    var task = (async function () {
      for (var i = 0; i < RELAYS.length; i += 1) {
        try {
          return await getJSON(RELAYS[i].url(url), RELAYS[i].text);
        } catch (relayError) {
          /* try the next relay */
        }
      }
      throw new Error('Live data unavailable');
    })();
    cache.set(url, task);
    return task;
  };
})();
