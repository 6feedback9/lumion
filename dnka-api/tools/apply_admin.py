"""Puts the current admin-v2.css / admin-v2.js into /vercel/dep/index.html and
sets every site's schedule clock to Kyiv. Safe to run more than once."""
import re, sys
D = '/vercel/dep/index.html'
h = open(D, encoding='utf-8').read()
h = re.sub(r"const SITE_TZ = \{[^}]*\};[^\n]*",
           "const SITE_TZ = { pl: 'Europe/Kyiv', en: 'Europe/Kyiv', uk: 'Europe/Kyiv' }; // one clock for every site, so equal dates open together", h, count=1)
h = re.sub(r"const SITE_TZ_LABEL = \{[^}]*\};",
           "const SITE_TZ_LABEL = { pl: 'час Києва', en: 'час Києва', uk: 'час Києва' };", h, count=1)
css = open('/vercel/api/admin-v2.css', encoding='utf-8').read()
js = open('/vercel/api/admin-v2.js', encoding='utf-8').read()
i = h.index('  /* ---------- Layout v2'); j = h.index('</style>', i)
h = h[:i] + css.lstrip('\n') + h[j:]
i = h.index('/* ---------- Layout v2: each banner'); j = h.index('// bootstrap: check existing session', i)
h = h[:i] + js.lstrip('\n') + '\n' + h[j:]
assert 'Warsaw' not in h and 'Варшав' not in h, 'Warsaw still referenced'
open(D, 'w', encoding='utf-8').write(h)
open('/vercel/prev/index.html', 'w', encoding='utf-8').write(h)
print('admin patched')
