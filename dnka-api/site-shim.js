/* Data source: the DNKa' API on Cloudflare (dnka-api Worker). The embeds below
   still build their old Supabase URLs, so they're mapped here; if the API is
   unreachable, the last exported copy on dnka.pages.dev/fallback/ is used so
   the sites never lose their banners / partners / instructors. */
(function () {
  if (window.__dnkaFallback) return;
  window.__dnkaFallback = true;
  var S = 'https://okayenoycyzjufxgflhs.supabase.co/rest/v1/';
  var API = 'https://dnka-api.dnka-world.workers.dev/';
  var F = 'https://dnka.pages.dev/fallback/';
  var orig = window.fetch.bind(window);
  function route(p) {
    var m;
    if (p.indexOf('rpc/live_banners') === 0) {
      m = /p_lang=([a-z]+)/.exec(p);
      var lang = m ? m[1] : 'pl';
      return { api: 'banners?lang=' + lang, fb: 'banners_' + lang + '.json' };
    }
    if (p.indexOf('instructors') === 0) {
      var pl = /country_code=eq\.PL/.test(p);
      return { api: 'instructors' + (pl ? '?country=PL' : ''), fb: 'instructors' + (pl ? '_pl' : '') + '.json' };
    }
    if (p.indexOf('partners') === 0) return { api: 'partners', fb: 'partners.json' };
    if (p.indexOf('site_settings') === 0) {
      m = /key=eq\.([^&]+)/.exec(p);
      if (!m) return null;
      var key = decodeURIComponent(m[1]);
      return { api: 'settings/' + encodeURIComponent(key), fb: 'settings_' + key + '.json' };
    }
    return null;
  }
  window.fetch = function (input, init) {
    var u = typeof input === 'string' ? input : (input && input.url) || '';
    if (u.indexOf(S) !== 0) return orig(input, init);
    var p = u.slice(S.length);
    var method = ((init && init.method) || 'GET').toUpperCase();
    if (method === 'POST' && p.indexOf('partner_applications') === 0) {
      return orig(API + 'applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: init && init.body });
    }
    var r = method === 'GET' ? route(p) : null;
    if (!r) return orig(input, init);
    return orig(API + r.api).then(
      function (res) { return res.ok ? res : orig(F + r.fb); },
      function () { return orig(F + r.fb); }
    );
  };
})();

