// Admin data client for the DNKa' API on Cloudflare (dnka-api Worker).
// It keeps the small part of the supabase-js interface the admin uses
// (sb.auth / sb.from(...) / sb.storage), so the admin code itself is unchanged.
const API_URL = 'https://dnka-api.dnka-world.workers.dev';
const SESSION_KEY = 'dnka-admin-session';

const sb = (() => {
  function readSession() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return s && s.expires_at > Date.now() ? s : null;
    } catch (e) { return null; }
  }

  async function call(method, path, body, headers) {
    const s = readSession();
    const h = Object.assign({}, headers || {});
    if (s) h.Authorization = 'Bearer ' + s.token;
    let payload = body;
    if (body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) {
      h['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(API_URL + path, { method, headers: h, body: payload });
    } catch (err) {
      return { data: null, error: { message: 'Немає з\'єднання з сервером' } };
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401 && path !== '/admin/login') {
        localStorage.removeItem(SESSION_KEY);
        setTimeout(() => location.reload(), 1500);
      }
      return { data: null, error: { message: (data && data.message) || ('HTTP ' + res.status), code: data && data.code } };
    }
    return { data, error: null };
  }

  // Thenable query builder: from(t).select().order() / insert().select().single()
  // / update().eq() / delete().eq()
  class Query {
    constructor(table) { this.table = table; this.op = 'select'; this.orders = []; this.filters = {}; }
    select() { if (this.op === 'select') this.op = 'select'; return this; }
    order(col, opts) { this.orders.push(col + '.' + (opts && opts.ascending === false ? 'desc' : 'asc')); return this; }
    insert(row) { this.op = 'insert'; this.row = row; return this; }
    update(row) { this.op = 'update'; this.row = row; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(col, val) { this.filters[col] = val; return this; }
    single() { this.one = true; return this; }
    async run() {
      const base = '/admin/t/' + this.table;
      const id = this.filters.id !== undefined ? this.filters.id : this.filters.key;
      if (this.op === 'select') return call('GET', base + (this.orders.length ? '?order=' + this.orders.join(',') : ''));
      if (this.op === 'insert') return call('POST', base, Array.isArray(this.row) ? this.row[0] : this.row);
      if (id === undefined) return { data: null, error: { message: 'Missing id filter' } };
      const path = base + '/' + encodeURIComponent(id);
      if (this.op === 'update') return call('PATCH', path, this.row);
      return call('DELETE', path);
    }
    then(resolve, reject) { return this.run().then(resolve, reject); }
  }

  return {
    auth: {
      async getSession() { return { data: { session: readSession() }, error: null }; },
      async signInWithPassword({ password }) {
        const { data, error } = await call('POST', '/admin/login', { password });
        if (error) return { data: null, error };
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        return { data: { session: data }, error: null };
      },
      async signOut() { localStorage.removeItem(SESSION_KEY); return { error: null }; },
    },
    from(table) { return new Query(table); },
    storage: {
      from(bucket) {
        const enc = path => path.split('/').map(encodeURIComponent).join('/');
        return {
          async upload(path, file, opts) {
            const type = (opts && opts.contentType) || file.type || 'application/octet-stream';
            const { error } = await call('PUT', '/admin/img/' + enc(path), file, { 'Content-Type': type });
            return { data: error ? null : { path }, error };
          },
          getPublicUrl(path) {
            return { data: { publicUrl: API_URL + '/storage/v1/object/public/' + bucket + '/' + enc(path) } };
          },
          async remove(paths) {
            await Promise.all(paths.map(p => call('DELETE', '/admin/img/' + enc(p))));
            return { error: null };
          },
        };
      },
    },
  };
})();
