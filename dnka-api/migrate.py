"""Export the Supabase tables into D1 INSERTs (data.sql).

Pictures: every Supabase Storage URL is replaced with its compressed copy on
dnka.pages.dev (the manifest is read from the current embed/main.js), so the
sites never touch Supabase again. Usage:
  SUPABASE_PAT=... python3 -I migrate.py <path to deployed embed/main.js> > data.sql
"""
import json, os, re, sys, urllib.request

REF = 'okayenoycyzjufxgflhs'
PRE = 'https://%s.supabase.co/storage/v1/object/public/banner-images/' % REF
PAGES = 'https://dnka.pages.dev/fallback/img/banner-images/'
TABLES = ['banners', 'instructors', 'partners', 'site_settings', 'partner_applications']
BOOLS = {'active', 'active_en', 'active_uk', 'is_read'}


def query(sql):
    req = urllib.request.Request(
        'https://api.supabase.com/v1/projects/%s/database/query' % REF,
        data=json.dumps({'query': sql}).encode(),
        headers={'Authorization': 'Bearer ' + os.environ['SUPABASE_PAT'], 'Content-Type': 'application/json',
                 'User-Agent': 'dnka-migrate'})
    return json.load(urllib.request.urlopen(req))


src = open(sys.argv[1], encoding='utf-8').read()
banner_keys = json.loads(re.search(r'var B = (\[.*?\]);', src).group(1))
instructor_keys = json.loads(re.search(r'var I = (\[.*?\]);', src).group(1))
copies = {k: re.sub(r'\.[a-z]+$', '', k, flags=re.I) + '.c.webp' for k in banner_keys}
copies.update({k: k for k in instructor_keys})

missing = []


def fix_url(v):
    if isinstance(v, str) and v.startswith(PRE):
        p = v[len(PRE):].split('?')[0]
        if p in copies:
            return PAGES + copies[p]
        missing.append(p)
    return v


def lit(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return '1' if v else '0'
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (dict, list)):
        v = json.dumps(v, ensure_ascii=False)
    return "'" + str(v).replace("'", "''") + "'"


for t in TABLES:
    rows = query("select coalesce(json_agg(t), '[]') j from public.%s t" % t)[0]['j']
    print('DELETE FROM %s;' % t)
    for r in rows:
        r = {k: fix_url(v) for k, v in r.items()}
        cols = list(r)
        print('INSERT INTO %s (%s) VALUES (%s);' % (t, ','.join(cols), ','.join(lit(r[c]) for c in cols)))
    sys.stderr.write('%s: %d rows\n' % (t, len(rows)))

if missing:
    sys.stderr.write('NO COPY FOR: %s\n' % missing)
