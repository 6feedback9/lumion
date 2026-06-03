// ============================================================
// LumiOn — Backend Server
// Stack: Node.js + Express
// AI: FASHN.ai API (virtual try-on)
// DB: Supabase (PostgreSQL)
// ============================================================

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const FormData = require('form-data');
const crypto = require('crypto');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// ── ENV ──────────────────────────────────────────────────────
const {
  FASHN_API_KEY,        // from fashn.ai dashboard
  SUPABASE_URL,         // from supabase project settings
  SUPABASE_SERVICE_KEY, // service_role key (not anon)
  PORT = 3001,
  WIDGET_ORIGIN,        // e.g. https://lumion.lumiwebagency.com
} = process.env;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── MIDDLEWARE ───────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => cb(null, true), // restrict in prod to your domains
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-brand-key'],
}));

// ── HELPERS ──────────────────────────────────────────────────
function toBase64(buffer) {
  return buffer.toString('base64');
}

async function urlToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buf = await res.buffer();
  const ct = res.headers.get('content-type') || 'image/jpeg';
  return { data: toBase64(buf), mediaType: ct };
}

// Verify brand API key → return brand record
async function authBrand(req, res) {
  const key = req.headers['x-brand-key'];
  if (!key) { res.status(401).json({ error: 'Missing x-brand-key header' }); return null; }

  const { data: brand, error } = await supabase
    .from('brands')
    .select('*')
    .eq('api_key', key)
    .eq('active', true)
    .single();

  if (error || !brand) { res.status(401).json({ error: 'Invalid API key' }); return null; }
  return brand;
}

// ── ROUTES ───────────────────────────────────────────────────

// Health check
app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// ── 1. GENERATE TRY-ON ──────────────────────────────────────
// POST /api/tryon
// Headers: x-brand-key: <brand api key>
// Body (multipart): person_photo (file), garment_url OR garment_photo (file)
// Optional body fields: product_id, product_name, user_email, session_id
//
// Returns: { tryon_id, result_url, utm_url }

app.post('/api/tryon', upload.fields([
  { name: 'person_photo', maxCount: 1 },
  { name: 'garment_photo', maxCount: 1 },
]), async (req, res) => {
  const brand = await authBrand(req, res);
  if (!brand) return;

  try {
    // ── Check monthly quota
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count } = await supabase
      .from('tryons')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brand.id)
      .gte('created_at', monthStart);

    if (count >= brand.monthly_quota) {
      return res.status(429).json({ error: 'Monthly quota exceeded', quota: brand.monthly_quota, used: count });
    }

    // ── Prepare images for FASHN API
    let personBase64, personMediaType;
    let garmentBase64, garmentMediaType;

    if (req.files?.person_photo?.[0]) {
      personBase64 = toBase64(req.files.person_photo[0].buffer);
      personMediaType = req.files.person_photo[0].mimetype;
    } else {
      return res.status(400).json({ error: 'person_photo is required' });
    }

    if (req.files?.garment_photo?.[0]) {
      garmentBase64 = toBase64(req.files.garment_photo[0].buffer);
      garmentMediaType = req.files.garment_photo[0].mimetype;
    } else if (req.body.garment_url) {
      const g = await urlToBase64(req.body.garment_url);
      garmentBase64 = g.data;
      garmentMediaType = g.mediaType;
    } else {
      return res.status(400).json({ error: 'garment_photo or garment_url is required' });
    }

    // ── Call FASHN API
    // Docs: https://docs.fashn.ai
    const fashnRes = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FASHN_API_KEY}`,
      },
      body: JSON.stringify({
        model_image: `data:${personMediaType};base64,${personBase64}`,
        garment_image: `data:${garmentMediaType};base64,${garmentBase64}`,
        category: req.body.category || 'tops',        // tops | bottoms | one-pieces
        mode: 'balanced',                             // quality | balanced | performance
        num_samples: 1,
      }),
    });

    if (!fashnRes.ok) {
      const err = await fashnRes.json().catch(() => ({}));
      console.error('FASHN API error:', err);
      return res.status(502).json({ error: 'AI generation failed', details: err });
    }

    const fashnData = await fashnRes.json();

    // FASHN returns a prediction ID → poll for result
    const predictionId = fashnData.id;
    let resultUrl = null;
    let attempts = 0;

    while (attempts < 30 && !resultUrl) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
        headers: { 'Authorization': `Bearer ${FASHN_API_KEY}` },
      });
      const pollData = await pollRes.json();

      if (pollData.status === 'completed') {
        resultUrl = pollData.output?.[0];
        break;
      }
      if (pollData.status === 'failed') {
        return res.status(502).json({ error: 'FASHN generation failed', details: pollData });
      }
      attempts++;
    }

    if (!resultUrl) {
      return res.status(504).json({ error: 'Generation timed out' });
    }

    // ── Upload result image to Supabase Storage
    const resultFetch = await fetch(resultUrl);
    const resultBuffer = await resultFetch.buffer();
    const fileName = `${brand.slug}/${Date.now()}_${crypto.randomBytes(6).toString('hex')}.jpg`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('tryon-results')
      .upload(fileName, resultBuffer, { contentType: 'image/jpeg', upsert: false });

    if (storageError) {
      console.error('Storage error:', storageError);
      // fallback to FASHN URL if storage fails
    }

    const { data: { publicUrl } } = supabase.storage.from('tryon-results').getPublicUrl(fileName);
    const finalResultUrl = publicUrl || resultUrl;

    // ── Build UTM purchase URL
    const baseProductUrl = req.body.product_url || brand.shop_url;
    const utmParams = new URLSearchParams({
      utm_source: 'tryon',
      utm_medium: 'widget',
      utm_campaign: brand.slug,
      utm_content: req.body.product_id || 'unknown',
    });
    const utmUrl = `${baseProductUrl}?${utmParams.toString()}`;

    // ── Save to DB
    const tryonId = crypto.randomUUID();
    const sessionId = req.body.session_id || crypto.randomUUID();

    const { error: dbError } = await supabase.from('tryons').insert({
      id: tryonId,
      brand_id: brand.id,
      session_id: sessionId,
      user_email: req.body.user_email || null,
      product_id: req.body.product_id || null,
      product_name: req.body.product_name || null,
      product_url: baseProductUrl || null,
      result_url: finalResultUrl,
      fashn_prediction_id: predictionId,
      utm_url: utmUrl,
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    if (dbError) console.error('DB insert error:', dbError);

    // ── Respond
    res.json({
      tryon_id: tryonId,
      result_url: finalResultUrl,
      utm_url: utmUrl,
      session_id: sessionId,
    });

  } catch (err) {
    console.error('Unhandled error in /api/tryon:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});


// ── 2. BRAND STATS (for admin panel) ────────────────────────
// GET /api/stats
// Headers: x-brand-key
// Query: ?period=30d|7d|month

app.get('/api/stats', async (req, res) => {
  const brand = await authBrand(req, res);
  if (!brand) return;

  const days = req.query.period === '7d' ? 7 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: tryons, error } = await supabase
    .from('tryons')
    .select('id, product_id, product_name, status, created_at, user_email, utm_url')
    .eq('brand_id', brand.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Count orders (sessions that clicked UTM → tracked via /api/order-ping)
  const { count: orderCount } = await supabase
    .from('order_pings')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brand.id)
    .gte('created_at', since);

  // Group by day
  const byDay = {};
  tryons.forEach(t => {
    const day = t.created_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });

  // Top products
  const productCounts = {};
  tryons.forEach(t => {
    const key = t.product_name || t.product_id || 'Unknown';
    productCounts[key] = (productCounts[key] || 0) + 1;
  });
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const uniqueUsers = new Set(tryons.map(t => t.session_id || t.user_email)).size;

  res.json({
    total: tryons.length,
    orders: orderCount || 0,
    conversion: tryons.length > 0 ? ((orderCount / tryons.length) * 100).toFixed(1) : '0',
    unique_users: uniqueUsers,
    quota: brand.monthly_quota,
    by_day: byDay,
    top_products: topProducts,
    recent: tryons.slice(0, 20),
  });
});


// ── 3. HISTORY ──────────────────────────────────────────────
// GET /api/history?page=1&limit=20&status=all
app.get('/api/history', async (req, res) => {
  const brand = await authBrand(req, res);
  if (!brand) return;

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const from = (page - 1) * limit;

  let query = supabase
    .from('tryons')
    .select('*', { count: 'exact' })
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ items: data, total: count, page, limit });
});


// ── 4. ORDER PING (UTM conversion tracking) ─────────────────
// Called by widget's "Buy" button click
// POST /api/order-ping
// Body: { brand_slug, tryon_id, product_id }
app.post('/api/order-ping', express.json(), async (req, res) => {
  const { brand_slug, tryon_id, product_id } = req.body;

  if (!brand_slug) return res.status(400).json({ error: 'brand_slug required' });

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', brand_slug)
    .single();

  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  await supabase.from('order_pings').insert({
    brand_id: brand.id,
    tryon_id: tryon_id || null,
    product_id: product_id || null,
    created_at: new Date().toISOString(),
  });

  res.json({ ok: true });
});


// ── 5. BRAND PUBLIC INFO (for widget init) ──────────────────
// GET /api/brand/:slug/config
app.get('/api/brand/:slug/config', async (req, res) => {
  const { data: brand, error } = await supabase
    .from('brands')
    .select('slug, name, logo_url, shop_url, widget_color, widget_lang, active')
    .eq('slug', req.params.slug)
    .eq('active', true)
    .single();

  if (error || !brand) return res.status(404).json({ error: 'Brand not found' });
  res.json(brand);
});


// ── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`LumiOn backend running on port ${PORT}`);
});

module.exports = app;
