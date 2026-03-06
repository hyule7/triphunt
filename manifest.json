-- ──────────────────────────────────────────────────────────────────────────────
-- TripHunt · PostgreSQL Database Schema (Supabase)
-- Run this in: Supabase > SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── AIRPORTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS airports (
  code         CHAR(3)       PRIMARY KEY,
  name         VARCHAR(200)  NOT NULL,
  city         VARCHAR(100)  NOT NULL,
  country      VARCHAR(100)  NOT NULL,
  latitude     DECIMAL(9,6),
  longitude    DECIMAL(9,6),
  popular      BOOLEAN       DEFAULT false,
  hub          BOOLEAN       DEFAULT false,   -- major connecting hub
  timezone     VARCHAR(60),
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- ── ROUTES ────────────────────────────────────────────────────────────────────
-- Cached route performance data (updated by background job)
CREATE TABLE IF NOT EXISTS routes (
  id                SERIAL PRIMARY KEY,
  origin_code       CHAR(3)       NOT NULL REFERENCES airports(code) ON DELETE CASCADE,
  dest_code         CHAR(3)       NOT NULL REFERENCES airports(code) ON DELETE CASCADE,
  average_price     DECIMAL(8,2),
  min_price         DECIMAL(8,2),
  max_price         DECIMAL(8,2),
  flight_time_mins  INTEGER,
  airlines          TEXT[],                  -- e.g. ['BA','EZY','FR']
  direct_available  BOOLEAN       DEFAULT true,
  weekly_searches   INTEGER       DEFAULT 0, -- for sorting popular routes
  last_updated      TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (origin_code, dest_code)
);
CREATE INDEX IF NOT EXISTS idx_routes_origin  ON routes(origin_code);
CREATE INDEX IF NOT EXISTS idx_routes_dest    ON routes(dest_code);
CREATE INDEX IF NOT EXISTS idx_routes_price   ON routes(average_price);
CREATE INDEX IF NOT EXISTS idx_routes_popular ON routes(weekly_searches DESC);

-- ── DEALS ─────────────────────────────────────────────────────────────────────
-- Live flight deal cache (populated from TravelPayouts API, expires hourly)
CREATE TABLE IF NOT EXISTS deals (
  id               SERIAL PRIMARY KEY,
  origin_code      CHAR(3)       NOT NULL,
  dest_code        CHAR(3)       NOT NULL,
  price            DECIMAL(8,2)  NOT NULL,
  airline          VARCHAR(100),
  depart_date      DATE,
  return_date      DATE,
  booking_url      TEXT,
  deal_score       SMALLINT      CHECK (deal_score BETWEEN 0 AND 100),
  deal_grade       VARCHAR(20),  -- 'exceptional','great','good','fair','high'
  number_of_stops  SMALLINT      DEFAULT 0,
  fetched_at       TIMESTAMPTZ   DEFAULT NOW(),
  expires_at       TIMESTAMPTZ   GENERATED ALWAYS AS (fetched_at + INTERVAL '1 hour') STORED
);
CREATE INDEX IF NOT EXISTS idx_deals_origin   ON deals(origin_code);
CREATE INDEX IF NOT EXISTS idx_deals_score    ON deals(deal_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_expires  ON deals(expires_at);
CREATE INDEX IF NOT EXISTS idx_deals_route    ON deals(origin_code, dest_code);

-- Auto-delete expired deals to keep table lean
CREATE OR REPLACE FUNCTION delete_expired_deals() RETURNS void LANGUAGE sql AS $$
  DELETE FROM deals WHERE expires_at < NOW();
$$;

-- ── PACKAGE HOLIDAYS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_holidays (
  id           SERIAL PRIMARY KEY,
  destination  VARCHAR(100)  NOT NULL,
  dest_code    CHAR(3),
  hotel_name   VARCHAR(200),
  hotel_stars  SMALLINT      CHECK (hotel_stars BETWEEN 1 AND 5),
  nights       SMALLINT      NOT NULL DEFAULT 7,
  price_pp     DECIMAL(8,2)  NOT NULL,
  includes     TEXT[]        DEFAULT ARRAY['flights','hotel'],
  image_url    TEXT,
  valid_from   DATE,
  valid_to     DATE,
  booking_url  TEXT          NOT NULL,
  rating       DECIMAL(3,1), -- 0.0–10.0
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pkg_dest  ON package_holidays(destination);
CREATE INDEX IF NOT EXISTS idx_pkg_price ON package_holidays(price_pp);

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255)  UNIQUE NOT NULL,
  name            VARCHAR(200),
  origin_code     CHAR(3)       REFERENCES airports(code),
  marketing       BOOLEAN       DEFAULT false,  -- email opt-in
  verified        BOOLEAN       DEFAULT false,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_origin  ON users(origin_code);

-- ── PRICE ALERTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_alerts (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         REFERENCES users(id) ON DELETE SET NULL,
  email          VARCHAR(255) NOT NULL,
  origin_code    CHAR(3)      NOT NULL,
  dest_code      CHAR(3)      NOT NULL,
  dest_name      VARCHAR(200),
  depart_date    DATE,
  return_date    DATE,
  adults         SMALLINT     DEFAULT 1,
  target_price   DECIMAL(8,2),               -- alert when price drops below this
  last_price     DECIMAL(8,2),
  triggered_at   TIMESTAMPTZ,                -- last time an alert email was sent
  active         BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON price_alerts(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_alerts_route  ON price_alerts(origin_code, dest_code);
CREATE INDEX IF NOT EXISTS idx_alerts_email  ON price_alerts(email);

-- ── CONVERSIONS ───────────────────────────────────────────────────────────────
-- Affiliate click/conversion tracking for revenue analytics
CREATE TABLE IF NOT EXISTS conversions (
  id           SERIAL PRIMARY KEY,
  origin_code  CHAR(3),
  dest_code    CHAR(3),
  price        DECIMAL(8,2),
  partner      VARCHAR(50),   -- 'jetradar','hotellook','klook','discovercars'
  deal_score   SMALLINT,
  session_id   VARCHAR(200),
  user_agent   TEXT,
  referrer     TEXT,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conv_partner    ON conversions(partner);
CREATE INDEX IF NOT EXISTS idx_conv_route      ON conversions(origin_code, dest_code);
CREATE INDEX IF NOT EXISTS idx_conv_created_at ON conversions(created_at DESC);

-- ── DESTINATIONS ──────────────────────────────────────────────────────────────
-- Enriched destination content for SEO pages
CREATE TABLE IF NOT EXISTS destinations (
  code             CHAR(3)      PRIMARY KEY REFERENCES airports(code),
  country          VARCHAR(100) NOT NULL,
  description      TEXT,        -- 200-word destination overview
  best_time        VARCHAR(200),
  avg_temp_jan     SMALLINT,    -- Celsius
  avg_temp_jul     SMALLINT,
  visa_uk          VARCHAR(100),-- e.g. 'Visa-free 90 days', 'Visa required'
  currency         VARCHAR(10),
  timezone_offset  SMALLINT,    -- hours from UTC
  hero_image_url   TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- ── SEO PAGE METADATA ─────────────────────────────────────────────────────────
-- Track which pages have been generated and indexed
CREATE TABLE IF NOT EXISTS seo_pages (
  id           SERIAL PRIMARY KEY,
  url_path     TEXT         UNIQUE NOT NULL,
  page_type    VARCHAR(50),  -- 'route','month_route','budget','airport','destination'
  origin_code  CHAR(3),
  dest_code    CHAR(3),
  month        SMALLINT,
  budget_max   INTEGER,
  indexed_at   TIMESTAMPTZ,
  last_crawled TIMESTAMPTZ,
  impressions  INTEGER      DEFAULT 0,
  clicks       INTEGER      DEFAULT 0,
  avg_position DECIMAL(5,2),
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_seo_type       ON seo_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_seo_route      ON seo_pages(origin_code, dest_code);
CREATE INDEX IF NOT EXISTS idx_seo_clicks     ON seo_pages(clicks DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (Supabase)
-- ──────────────────────────────────────────────────────────────────────────────

-- Users can only see their own data
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts   ENABLE ROW LEVEL SECURITY;

-- Public read on airports, routes, deals, destinations
ALTER TABLE airports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations   ENABLE ROW LEVEL SECURITY;

-- Policies: public read for lookup tables
CREATE POLICY "airports_public_read"     ON airports     FOR SELECT USING (true);
CREATE POLICY "routes_public_read"       ON routes       FOR SELECT USING (true);
CREATE POLICY "deals_public_read"        ON deals        FOR SELECT USING (true);
CREATE POLICY "destinations_public_read" ON destinations FOR SELECT USING (true);

-- Price alerts: anyone can insert (alert signup), only owner can read/delete
CREATE POLICY "alerts_public_insert" ON price_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "alerts_owner_select"  ON price_alerts FOR SELECT  USING (email = current_user);
CREATE POLICY "alerts_owner_delete"  ON price_alerts FOR DELETE  USING (email = current_user);

-- ──────────────────────────────────────────────────────────────────────────────
-- USEFUL VIEWS
-- ──────────────────────────────────────────────────────────────────────────────

-- Top deals by deal score (for homepage deal tiles)
CREATE OR REPLACE VIEW top_deals_view AS
  SELECT d.*, a_o.city AS origin_city, a_d.city AS dest_city,
         a_d.country AS dest_country
  FROM   deals d
  JOIN   airports a_o ON a_o.code = d.origin_code
  JOIN   airports a_d ON a_d.code = d.dest_code
  WHERE  d.expires_at > NOW()
  ORDER  BY d.deal_score DESC, d.price ASC;

-- Revenue summary (for monitoring affiliate performance)
CREATE OR REPLACE VIEW revenue_summary AS
  SELECT partner,
         COUNT(*)                    AS clicks,
         SUM(price)                  AS total_value,
         AVG(price)                  AS avg_price,
         DATE_TRUNC('day', created_at) AS day
  FROM   conversions
  GROUP  BY partner, DATE_TRUNC('day', created_at)
  ORDER  BY day DESC, clicks DESC;

-- ──────────────────────────────────────────────────────────────────────────────
-- SEED DATA — UK airports for initial deploy
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO airports (code, name, city, country, latitude, longitude, popular, hub) VALUES
  ('LHR','London Heathrow',    'London',     'UK', 51.47, -0.46,  true, true),
  ('LGW','London Gatwick',     'London',     'UK', 51.15, -0.18,  true, false),
  ('STN','London Stansted',    'London',     'UK', 51.88,  0.24,  true, false),
  ('MAN','Manchester Airport', 'Manchester', 'UK', 53.35, -2.27,  true, true),
  ('BHX','Birmingham Airport', 'Birmingham', 'UK', 52.45, -1.74,  true, false),
  ('EDI','Edinburgh Airport',  'Edinburgh',  'UK', 55.95, -3.36,  true, false),
  ('GLA','Glasgow Airport',    'Glasgow',    'UK', 55.87, -4.43,  true, false),
  ('BRS','Bristol Airport',    'Bristol',    'UK', 51.38, -2.72,  true, false)
ON CONFLICT (code) DO NOTHING;
