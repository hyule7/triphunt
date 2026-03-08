-- ════════════════════════════════════════════════════════════════
-- TripHunt v31 — Supabase Schema Additions
-- Run in Supabase SQL editor: https://app.supabase.com → SQL Editor
-- Safe to run on top of existing schema (uses IF NOT EXISTS)
-- ════════════════════════════════════════════════════════════════

-- ── DEALS table (populated by dealRadar scheduled function) ──────
CREATE TABLE IF NOT EXISTS deals (
  slug            text PRIMARY KEY,           -- e.g. "london-to-bali-390"
  origin_code     text NOT NULL,              -- e.g. "LHR"
  origin_city     text NOT NULL,              -- e.g. "London"
  origin_airport  text,                       -- e.g. "London Heathrow"
  dest_code       text NOT NULL,              -- e.g. "DPS"
  dest_name       text NOT NULL,              -- e.g. "Bali"
  dest_country    text,
  dest_region     text,
  dest_emoji      text,

  -- Pricing
  price           numeric NOT NULL,
  typical_price   numeric,
  saving_pct      numeric,
  saving_amount   numeric,
  price_vs_avg    numeric,                    -- e.g. 66 = price is 66% of average

  -- Scoring
  deal_score      numeric NOT NULL,           -- 0-99
  deal_tier       text,                       -- legendary/exceptional/great/good
  deal_label      text,
  deal_badge      text,
  is_error_fare   boolean DEFAULT false,
  is_exceptional  boolean DEFAULT false,

  -- Flight details
  airline         text,
  stops           integer DEFAULT 0,
  depart_date     date,
  return_date     date,

  -- Links
  booking_url     text,
  deal_url        text,

  -- SEO
  seo_title       text,
  seo_description text,

  -- Status
  longhaul        boolean DEFAULT false,
  active          boolean DEFAULT true,
  featured        boolean DEFAULT false,
  click_count     integer DEFAULT 0,

  -- Timestamps
  discovered_at   timestamptz DEFAULT now(),
  expires_at      timestamptz,
  updated_at      timestamptz DEFAULT now()
);

-- Indexes for fast homepage queries
CREATE INDEX IF NOT EXISTS idx_deals_active_score  ON deals(active, deal_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_origin        ON deals(origin_code);
CREATE INDEX IF NOT EXISTS idx_deals_error_fare    ON deals(is_error_fare) WHERE is_error_fare = true;
CREATE INDEX IF NOT EXISTS idx_deals_exceptional   ON deals(is_exceptional) WHERE is_exceptional = true;
CREATE INDEX IF NOT EXISTS idx_deals_longhaul      ON deals(longhaul) WHERE longhaul = true;
CREATE INDEX IF NOT EXISTS idx_deals_expires       ON deals(expires_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deals_updated_at ON deals;
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: public can read active deals, only service role can write
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deals_public_read"   ON deals;
DROP POLICY IF EXISTS "deals_service_write" ON deals;

CREATE POLICY "deals_public_read" ON deals
  FOR SELECT USING (active = true);

CREATE POLICY "deals_service_write" ON deals
  FOR ALL USING (auth.role() = 'service_role');

-- ── DEAL CLICKS tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_clicks (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_slug  text REFERENCES deals(slug) ON DELETE CASCADE,
  origin_code text,
  dest_code   text,
  price       numeric,
  ref_id      text,              -- referral ID if came from share link
  clicked_at  timestamptz DEFAULT now(),
  ua          text               -- user agent (truncated)
);

CREATE INDEX IF NOT EXISTS idx_deal_clicks_slug ON deal_clicks(deal_slug);
CREATE INDEX IF NOT EXISTS idx_deal_clicks_time ON deal_clicks(clicked_at DESC);

ALTER TABLE deal_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clicks_insert_public" ON deal_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "clicks_read_service"  ON deal_clicks FOR SELECT USING (auth.role() = 'service_role');

-- ── REFERRALS tracking ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_id      text NOT NULL,         -- sharer's referral ID
  referred_ip text,                  -- hashed, not raw IP
  source      text,                  -- whatsapp/twitter/email/copy
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_ref_id ON referrals(ref_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals_insert" ON referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "referrals_read_service" ON referrals FOR SELECT USING (auth.role() = 'service_role');

-- ── PUSH SUBSCRIPTIONS (if not exists from v30) ───────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint    text PRIMARY KEY,
  p256dh      text,
  auth        text,
  origin_pref text DEFAULT 'LHR',
  dest_pref   text,
  email       text,
  ref_id      text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_active        ON push_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_push_origin        ON push_subscriptions(origin_pref);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_service_only" ON push_subscriptions
  USING (auth.role() = 'service_role');

-- ── DEAL SEO PAGES view (for sitemap generation) ──────────────────
CREATE OR REPLACE VIEW deal_seo_pages AS
SELECT
  slug,
  deal_url,
  seo_title,
  seo_description,
  origin_city,
  dest_name,
  price,
  deal_score,
  updated_at
FROM deals
WHERE active = true
  AND deal_score >= 65
ORDER BY deal_score DESC;

-- ── Helper: get top deals per airport (for homepage sections) ─────
CREATE OR REPLACE FUNCTION get_homepage_deals(
  p_origin     text DEFAULT 'LHR',
  p_limit      int  DEFAULT 12
)
RETURNS TABLE (
  slug text, origin_code text, origin_city text,
  dest_code text, dest_name text, dest_country text, dest_emoji text,
  price numeric, typical_price numeric, saving_pct numeric, saving_amount numeric,
  deal_score numeric, deal_tier text, deal_label text, deal_badge text,
  is_error_fare boolean, is_exceptional boolean,
  airline text, stops integer, depart_date date, return_date date,
  booking_url text, deal_url text, longhaul boolean
)
LANGUAGE sql STABLE AS $$
  SELECT
    slug, origin_code, origin_city,
    dest_code, dest_name, dest_country, dest_emoji,
    price, typical_price, saving_pct, saving_amount,
    deal_score, deal_tier, deal_label, deal_badge,
    is_error_fare, is_exceptional,
    airline, stops, depart_date, return_date,
    booking_url, deal_url, longhaul
  FROM deals
  WHERE active = true
    AND (p_origin = 'ANY' OR origin_code = p_origin)
  ORDER BY deal_score DESC
  LIMIT p_limit;
$$;
