// DNKa' API on Cloudflare Workers (D1 + KV) — replaces the Supabase project.
//
// Public (used by the embeds on dnka.com.pl / dnka.world / dnka.store):
//   GET  /banners?lang=pl|en|uk        live banners for that site
//   GET  /instructors[?country=PL]     active instructors
//   GET  /partners                     partner shops
//   GET  /settings/:key                [{ value }] (same shape PostgREST gave)
//   POST /applications                 partnership form → D1 + email (Resend)
//   GET  /storage/v1/object/public/banner-images/<path>   uploaded pictures (KV)
//
// Admin (dnka.pages.dev, Bearer token from /admin/login):
//   POST   /admin/login                { password } → { token, expires_at }
//   GET    /admin/t/:table?order=col.asc,col.desc
//   POST   /admin/t/:table             insert → row
//   PATCH  /admin/t/:table/:id         update → row
//   DELETE /admin/t/:table/:id
//   PUT    /admin/img/<path>           raw body → KV
//   DELETE /admin/img/<path>
//
// Secrets (set in the Cloudflare dashboard, never in code):
//   ADMIN_PASSWORD, SESSION_SECRET, RESEND_API_KEY

const TABLES = {
  banners: { pk: 'id', uuid: true, bools: ['active', 'active_en', 'active_uk'], touch: true },
  instructors: { pk: 'id', uuid: false, bools: ['active'], touch: true },
  partners: { pk: 'id', uuid: true, bools: [] },
  site_settings: { pk: 'key', uuid: false, bools: [], json: ['value'], touch: true },
  partner_applications: { pk: 'id', uuid: true, bools: ['is_read'] },
};

const IMG_PREFIX = '/storage/v1/object/public/banner-images/';
const SESSION_HOURS = 24 * 7;
const MAX_IMG_BYTES = 8 * 1024 * 1024;
const LOGIN_FAILS_MAX = 10; // per IP per 15 minutes

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, Prefer, x-upsert',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  });
}
const fail = (status, message, code) => json({ message, code: code || String(status) }, status);

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (req.method === 'GET' && p.startsWith(IMG_PREFIX)) return image(env, decodeURIComponent(p.slice(IMG_PREFIX.length)));
      if (req.method === 'GET' && p === '/banners') return publicBanners(env, url.searchParams.get('lang'));
      if (req.method === 'GET' && p === '/instructors') return publicInstructors(env, url.searchParams.get('country'));
      if (req.method === 'GET' && p === '/partners') return publicPartners(env);
      if (req.method === 'GET' && p.startsWith('/settings/')) return publicSetting(env, decodeURIComponent(p.slice(10)));
      if (req.method === 'POST' && p === '/applications') return application(req, env, ctx);
      if (req.method === 'POST' && p === '/admin/login') return login(req, env);
      if (p.startsWith('/admin/')) {
        if (!(await authed(req, env))) return fail(401, 'Сесія завершилась — увійдіть ще раз', 'auth');
        if (p.startsWith('/admin/t/')) return adminTable(req, env, url);
        if (p.startsWith('/admin/img/')) return adminImage(req, env, decodeURIComponent(p.slice(11)));
      }
      if (p === '/' || p === '/health') return json({ ok: true });
      return fail(404, 'Not found');
    } catch (err) {
      console.error(err && err.stack || err);
      return fail(500, String(err && err.message || err));
    }
  },
};

/* ------------------------------------------------------------ helpers */

function decode(table, row) {
  if (!row) return row;
  const t = TABLES[table];
  for (const c of t.bools) if (c in row && row[c] !== null) row[c] = !!row[c];
  for (const c of t.json || []) if (row[c] != null) { try { row[c] = JSON.parse(row[c]); } catch (e) {} }
  return row;
}

function encodeValue(table, col, v) {
  const t = TABLES[table];
  if (v === undefined) return null;
  if (t.bools.includes(col)) return v === null ? null : (v ? 1 : 0);
  if ((t.json || []).includes(col)) return v === null ? null : JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return v;
}

const colCache = {};
async function columns(env, table) {
  if (!colCache[table]) {
    const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
    colCache[table] = new Set(results.map(r => r.name));
  }
  return colCache[table];
}

function isLive(active, starts, ends, now) {
  if (!active) return false;
  if (starts && Date.parse(starts) > now) return false;
  if (ends && Date.parse(ends) <= now) return false;
  return true;
}

/* ------------------------------------------------------------ public */

async function publicBanners(env, lang) {
  const sfx = lang === 'en' ? '_en' : lang === 'uk' ? '_uk' : '';
  const { results } = await env.DB.prepare('SELECT * FROM banners ORDER BY placement ASC, position ASC').all();
  const now = Date.now();
  const rows = results
    .filter(b => isLive(b['active' + sfx], b['starts_at' + sfx], b['ends_at' + sfx], now))
    .map(b => decode('banners', b));
  // short browser/CDN cache: a scheduled banner still appears within a minute
  return json(rows, 200, { 'Cache-Control': 'public, max-age=60' });
}

async function publicInstructors(env, country) {
  const cols = 'slug,name,country,country_code,city,city_pl,category,category_pl,description,description_pl,instagram,photo';
  const sql = `SELECT ${cols} FROM instructors WHERE active = 1` +
    (country ? ' AND country_code = ?1' : '') + ' ORDER BY country ASC, sort ASC';
  const st = env.DB.prepare(sql);
  const { results } = await (country ? st.bind(country.toUpperCase()) : st).all();
  return json(results, 200, { 'Cache-Control': 'public, max-age=300' });
}

async function publicPartners(env) {
  const { results } = await env.DB.prepare('SELECT * FROM partners ORDER BY country ASC, name ASC').all();
  return json(results, 200, { 'Cache-Control': 'public, max-age=300' });
}

async function publicSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM site_settings WHERE key = ?1').bind(key).first();
  return json(row ? [decode('site_settings', row)] : [], 200, { 'Cache-Control': 'public, max-age=300' });
}

async function image(env, path) {
  if (path.startsWith('login-fail:')) return new Response('Not found', { status: 404, headers: CORS });
  const { value, metadata } = await env.IMAGES.getWithMetadata(path, { type: 'stream' });
  if (!value) return new Response('Not found', { status: 404, headers: CORS });
  return new Response(value, {
    headers: {
      'Content-Type': (metadata && metadata.type) || 'image/jpeg',
      // every upload gets a new timestamped path, so a picture never changes
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...CORS,
    },
  });
}

/* ------------------------------------------------------------ partnership form */

const FORM_TYPE_LABELS = { distributor: "Дистриб'ютор", salon: 'Салон', training_center: 'Навчальний центр' };
const APP_FIELDS = ['form_type', 'lang', 'company', 'location', 'phone', 'email', 'website', 'contact_person', 'comment'];

async function application(req, env, ctx) {
  let body;
  try { body = await req.json(); } catch (e) { return fail(400, 'Bad request'); }
  if (Array.isArray(body)) body = body[0];
  const row = {};
  for (const f of APP_FIELDS) {
    const v = body && body[f];
    row[f] = v == null ? null : String(v).slice(0, f === 'comment' ? 3000 : 300);
  }
  if (!row.company || !(row.email || row.phone)) return fail(400, 'Missing fields');
  row.id = crypto.randomUUID();
  row.is_read = 0;
  row.created_at = new Date().toISOString();
  const cols = Object.keys(row);
  await env.DB.prepare(`INSERT INTO partner_applications (${cols.join(',')}) VALUES (${cols.map((_, i) => '?' + (i + 1)).join(',')})`)
    .bind(...cols.map(c => row[c])).run();
  ctx.waitUntil(sendApplicationEmail(env, row));
  return json({ ok: true }, 201);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

async function sendApplicationEmail(env, row) {
  if (!env.RESEND_API_KEY) { console.error('RESEND_API_KEY is not set'); return; }
  const typeLabel = FORM_TYPE_LABELS[row.form_type] || row.form_type || '';
  const lang = String(row.lang || '').toUpperCase();
  const html = `
    <h2>Нова заявка на співпрацю</h2>
    <p><b>Тип:</b> ${esc(typeLabel)} (${esc(lang)})</p>
    <p><b>Компанія:</b> ${esc(row.company)}</p>
    <p><b>Локація:</b> ${esc(row.location)}</p>
    <p><b>Телефон:</b> ${esc(row.phone)}</p>
    <p><b>Email:</b> ${esc(row.email)}</p>
    <p><b>Сайт:</b> ${esc(row.website) || '—'}</p>
    <p><b>Контактна особа:</b> ${esc(row.contact_person)}</p>
    ${row.comment ? `<p><b>Коментар:</b> ${esc(row.comment)}</p>` : ''}
    <hr>
    <p style="color:#888;font-size:12px">Цей лист надіслано автоматично з форми співпраці на сайті DNKa'.</p>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: env.MAIL_FROM || "DNKA Partnerstwo <onboarding@resend.dev>",
      to: [env.MAIL_TO || 'dnkasales@gmail.com'],
      subject: `Нова заявка (${typeLabel}, ${lang}) — ${row.company}`,
      html,
    }),
  });
  if (!res.ok) console.error('resend error', res.status, await res.text());
}

/* ------------------------------------------------------------ admin auth */

const enc = new TextEncoder();
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(env, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

// constant-time string compare (via HMAC of both sides, so lengths don't leak either)
async function same(env, a, b) {
  const [x, y] = await Promise.all([hmac(env, 'cmp:' + a), hmac(env, 'cmp:' + b)]);
  let d = x.length ^ y.length;
  for (let i = 0; i < x.length && i < y.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

async function login(req, env) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return fail(503, 'Пароль адмінки ще не налаштований');
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const failKey = 'login-fail:' + ip;
  const fails = parseInt(await env.IMAGES.get(failKey) || '0', 10);
  if (fails >= LOGIN_FAILS_MAX) return fail(429, 'Забагато спроб — спробуйте через 15 хвилин');
  let body = {};
  try { body = await req.json(); } catch (e) {}
  if (!(await same(env, String(body.password || ''), env.ADMIN_PASSWORD))) {
    await env.IMAGES.put(failKey, String(fails + 1), { expirationTtl: 900 });
    return fail(401, 'Невірний пароль', 'invalid_credentials');
  }
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  return json({ token: exp + '.' + await hmac(env, 'session:' + exp), expires_at: exp });
}

async function authed(req, env) {
  const h = req.headers.get('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !env.SESSION_SECRET || +exp < Date.now()) return false;
  return same(env, sig, await hmac(env, 'session:' + exp));
}

/* ------------------------------------------------------------ admin data */

async function adminTable(req, env, url) {
  const [, , , table, id] = url.pathname.split('/').map(decodeURIComponent);
  const t = TABLES[table];
  if (!t) return fail(404, 'Unknown table');
  const cols = await columns(env, table);

  if (req.method === 'GET') {
    const order = (url.searchParams.get('order') || '').split(',').filter(Boolean).map(o => {
      const [c, dir] = o.split('.');
      if (!cols.has(c)) throw new Error('bad order column ' + c);
      return `${c} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
    });
    const { results } = await env.DB.prepare(`SELECT * FROM ${table}` + (order.length ? ' ORDER BY ' + order.join(', ') : '')).all();
    return json(results.map(r => decode(table, r)));
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const row = {};
    for (const [k, v] of Object.entries(body || {})) if (cols.has(k)) row[k] = encodeValue(table, k, v);
    if (t.uuid && !row[t.pk]) row[t.pk] = crypto.randomUUID();
    const now = new Date().toISOString();
    if (cols.has('created_at') && !row.created_at) row.created_at = now;
    if (cols.has('updated_at') && !row.updated_at) row.updated_at = now;
    const keys = Object.keys(row);
    const res = await run(env.DB.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => '?' + (i + 1)).join(',')}) RETURNING *`)
      .bind(...keys.map(k => row[k])));
    return res.error ? res.error : json(decode(table, res.row), 201);
  }

  if (!id) return fail(400, 'Missing id');
  const idVal = t.uuid || table === 'site_settings' ? id : Number(id);

  if (req.method === 'PATCH') {
    const body = await req.json();
    const row = {};
    for (const [k, v] of Object.entries(body || {})) if (cols.has(k) && k !== t.pk) row[k] = encodeValue(table, k, v);
    if (t.touch && cols.has('updated_at')) row.updated_at = new Date().toISOString();
    const keys = Object.keys(row);
    if (!keys.length) return fail(400, 'Nothing to update');
    const res = await run(env.DB.prepare(`UPDATE ${table} SET ${keys.map((k, i) => `${k} = ?${i + 1}`).join(', ')} WHERE ${t.pk} = ?${keys.length + 1} RETURNING *`)
      .bind(...keys.map(k => row[k]), idVal));
    if (res.error) return res.error;
    return res.row ? json(decode(table, res.row)) : fail(404, 'Not found');
  }

  if (req.method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM ${table} WHERE ${t.pk} = ?1`).bind(idVal).run();
    return json({ ok: true });
  }
  return fail(405, 'Method not allowed');
}

// D1 errors → the same codes the admin already understands (23505 = duplicate)
async function run(stmt) {
  try {
    return { row: await stmt.first() };
  } catch (err) {
    const msg = String(err && err.message || err);
    if (/UNIQUE constraint failed/i.test(msg)) return { error: fail(409, msg, '23505') };
    throw err;
  }
}

async function adminImage(req, env, path) {
  if (!path || path.includes('..')) return fail(400, 'Bad path');
  if (req.method === 'PUT') {
    const type = req.headers.get('Content-Type') || 'application/octet-stream';
    if (!/^image\//.test(type)) return fail(415, 'Only images');
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_IMG_BYTES) return fail(413, 'Файл завеликий (максимум 8 МБ)');
    await env.IMAGES.put(path, buf, { metadata: { type } });
    return json({ path });
  }
  if (req.method === 'DELETE') {
    await env.IMAGES.delete(path);
    return json({ ok: true });
  }
  return fail(405, 'Method not allowed');
}
