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
  var CACHE_PREFIX = 'teeviewer-cache:';
  var CACHE_TTL = 10 * 60 * 1000;

  function readStored(url) {
    try {
      var raw = window.localStorage.getItem(CACHE_PREFIX + url);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      return entry && entry.ts && entry.data ? entry : null;
    } catch (error) {
      return null;
    }
  }

  function writeStored(url, data) {
    try {
      window.localStorage.setItem(CACHE_PREFIX + url, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (error) {
      /* storage may be unavailable */
    }
  }

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
    var stored = readStored(url);

    if (stored && Date.now() - stored.ts < CACHE_TTL) {
      return Promise.resolve(stored.data);
    }

    if (cache.has(url)) return cache.get(url);
    var task = (async function () {
      for (var i = 0; i < RELAYS.length; i += 1) {
        try {
          var data = await getJSON(RELAYS[i].url(url), RELAYS[i].text);
          writeStored(url, data);
          return data;
        } catch (relayError) {
          /* try the next relay */
        }
      }
      if (stored) return stored.data;
      throw new Error('Live data unavailable');
    })();
    cache.set(url, task);
    return task;
  };
})();
