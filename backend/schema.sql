-- ============================================================
-- TryOn SaaS — Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── BRANDS ──────────────────────────────────────────────────
-- Each brand/client you connect to your service
CREATE TABLE IF NOT EXISTS brands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,           -- e.g. "ambitna"
  name            TEXT NOT NULL,                  -- "Ambitna UA"
  api_key         TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  shop_url        TEXT,                           -- https://ambitna.ua
  logo_url        TEXT,
  widget_color    TEXT DEFAULT '#000000',         -- brand accent color
  widget_lang     TEXT DEFAULT 'uk',              -- uk | ru | en
  monthly_quota   INTEGER DEFAULT 500,            -- max try-ons per month
  plan            TEXT DEFAULT 'starter',         -- starter | brand | agency
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRYONS ──────────────────────────────────────────────────
-- Each virtual try-on session
CREATE TABLE IF NOT EXISTS tryons (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  session_id            TEXT,                     -- anonymous browser session
  user_email            TEXT,                     -- if user provided
  product_id            TEXT,                     -- from brand's catalog
  product_name          TEXT,
  product_url           TEXT,
  result_url            TEXT,                     -- stored in Supabase Storage
  fashn_prediction_id   TEXT,                     -- FASHN.ai job ID
  utm_url               TEXT,                     -- purchase URL with UTM
  status                TEXT DEFAULT 'completed', -- pending | completed | failed
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDER PINGS ──────────────────────────────────────────────
-- Fired when user clicks "Buy" button in widget (UTM conversion)
CREATE TABLE IF NOT EXISTS order_pings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  tryon_id    UUID REFERENCES tryons(id),
  product_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tryons_brand_id ON tryons(brand_id);
CREATE INDEX IF NOT EXISTS idx_tryons_created_at ON tryons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tryons_brand_created ON tryons(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_pings_brand ON order_pings(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brands_api_key ON brands(api_key);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
-- Disable RLS for service_role (backend uses service key)
-- Enable RLS if you add frontend direct queries
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE tryons ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_pings ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically — no extra policy needed
-- Add policies here if you build a direct frontend → Supabase connection

-- ── STORAGE BUCKET ───────────────────────────────────────────
-- Run this separately in Supabase Dashboard → Storage
-- Or via API:
--
-- Create bucket: tryon-results (public)
-- Policy: allow public read, allow service role write
--
-- SQL equivalent (run in SQL Editor):
INSERT INTO storage.buckets (id, name, public)
VALUES ('tryon-results', 'tryon-results', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for result images
CREATE POLICY "Public read tryon results"
ON storage.objects FOR SELECT
USING (bucket_id = 'tryon-results');

-- Service role can insert (handled by backend)
CREATE POLICY "Service role can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tryon-results');

-- ── SEED: Insert your first brand ────────────────────────────
-- Replace values below and run to create brand record
-- Then copy the api_key for your widget

INSERT INTO brands (slug, name, shop_url, widget_lang, monthly_quota, plan)
VALUES ('ambitna', 'Ambitna UA', 'https://ambitna.ua', 'uk', 500, 'starter')
ON CONFLICT (slug) DO NOTHING;

-- Fetch the generated api_key:
-- SELECT slug, api_key FROM brands WHERE slug = 'ambitna';
