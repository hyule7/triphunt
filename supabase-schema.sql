-- ═══════════════════════════════════════════════════════════════════
-- TripHunt v31 — Complete Supabase Schema
-- Run in Supabase SQL Editor: https://app.supabase.com/project/_/sql
-- ═══════════════════════════════════════════════════════════════════

-- ── EXISTING TABLES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscribers (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email             text UNIQUE NOT NULL,
  origin_preference text DEFAULT 'LHR',
  source            text DEFAULT 'website',
  subscribed_at     timestamptz DEFAULT now(),
  active            boolean DEFAULT true,
  unsubscribed_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(active);
CREATE INDEX IF NOT EXISTS idx_subscribers_origin ON subscribers(origin_preference) WHERE active = true;

CREATE TABLE IF NOT EXISTS price_alerts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email        text NOT NULL,
  origin_code  text NOT NULL,
  dest_code    text NOT NULL,
  dest_name    text,
  target_price numeric NOT NULL,
  adults       integer DEFAULT 1,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(active);

CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text UNIQUE NOT NULL,
  name       text,
  origin     text DEFAULT 'LHR',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination text NOT NULL, origin text DEFAULT 'LHR',
  price numeric NOT NULL, airline text, booking_url text,
  depart_date date, return_date date, created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wishlists_user_id_idx ON wishlists(user_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint    text PRIMARY KEY, p256dh text, auth text,
  origin_pref text, dest_pref text, email text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_active ON push_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_push_subs_origin ON push_subscriptions(origin_pref) WHERE active = true;

-- ── NEW: DEALS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug           text UNIQUE NOT NULL,
  origin_code    text NOT NULL,
  origin_city    text NOT NULL,
  origin_airport text NOT NULL,
  dest_code      text NOT NULL,
  dest_name      text NOT NULL,
  dest_country   text NOT NULL,
  dest_region    text NOT NULL,
  dest_emoji     text DEFAULT 'V',
  price          numeric NOT NULL,
  typical_price  numeric NOT NULL,
  saving_pct     integer NOT NULL,
  saving_amount  numeric NOT NULL,
  price_vs_avg   integer NOT NULL,
  deal_score     integer NOT NULL,
  deal_tier      text NOT NULL,
  deal_label     text NOT NULL,
  deal_badge     text DEFAULT '',
  is_error_fare  boolean DEFAULT false,
  is_exceptional boolean DEFAULT false,
  longhaul       boolean DEFAULT false,
  airline        text DEFAULT '',
  stops          integer DEFAULT 0,
  depart_date    date,
  return_date    date,
  booking_url    text NOT NULL,
  deal_url       text,
  seo_title      text,
  seo_description text,
  discovered_at  timestamptz DEFAULT now(),
  expires_at     date,
  active         boolean DEFAULT true,
  click_count    integer DEFAULT 0,
  share_count    integer DEFAULT 0,
  notified       boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_deals_active     ON deals(active, deal_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_origin     ON deals(origin_code) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_deals_dest       ON deals(dest_code) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_deals_region     ON deals(dest_region) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_deals_tier       ON deals(deal_tier) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_deals_error      ON deals(is_error_fare) WHERE active = true AND is_error_fare = true;
CREATE INDEX IF NOT EXISTS idx_deals_score      ON deals(deal_score DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_deals_discovered ON deals(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_slug       ON deals(slug);

-- ── NEW: PRICE HISTORY ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_history (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_code text NOT NULL,
  dest_code   text NOT NULL,
  price       numeric NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  source      text DEFAULT 'api'
);
CREATE INDEX IF NOT EXISTS idx_ph_route ON price_history(origin_code, dest_code);
CREATE INDEX IF NOT EXISTS idx_ph_date  ON price_history(recorded_at DESC);

-- 90-day route averages
CREATE MATERIALIZED VIEW IF NOT EXISTS route_avg_prices AS
SELECT origin_code, dest_code,
  AVG(price)::numeric(10,2) AS avg_price,
  MIN(price)::numeric(10,2) AS min_price,
  MAX(price)::numeric(10,2) AS max_price,
  COUNT(*) AS sample_count,
  MAX(recorded_at) AS last_updated
FROM price_history
WHERE recorded_at > now() - INTERVAL '90 days'
GROUP BY origin_code, dest_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_avg_pk ON route_avg_prices(origin_code, dest_code);

-- ── NEW: DEAL CLICKS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_clicks (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id    uuid REFERENCES deals(id) ON DELETE SET NULL,
  deal_slug  text, origin_code text, dest_code text, price numeric,
  source     text DEFAULT 'homepage',
  medium     text DEFAULT 'organic',
  session_id text, user_agent text,
  clicked_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clicks_deal ON deal_clicks(deal_id);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON deal_clicks(clicked_at DESC);

-- ── NEW: DEAL SHARES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_shares (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_slug text NOT NULL,
  platform  text NOT NULL,
  shared_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shares_slug ON deal_shares(deal_slug);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE subscribers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_clicks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_shares        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active deals" ON deals;
CREATE POLICY "Public can read active deals" ON deals FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role deals" ON deals;
CREATE POLICY "Service role deals" ON deals USING (auth.role() = 'service_role');
CREATE POLICY "Service role on subscribers"     ON subscribers     USING (auth.role() = 'service_role');
CREATE POLICY "Service role on price_alerts"    ON price_alerts    USING (auth.role() = 'service_role');
CREATE POLICY "Service role on price_history"   ON price_history   USING (auth.role() = 'service_role');
CREATE POLICY "Service role on deal_clicks"     ON deal_clicks     USING (auth.role() = 'service_role');
CREATE POLICY "Service role on deal_shares"     ON deal_shares     USING (auth.role() = 'service_role');
CREATE POLICY "Service role on push_subs"       ON push_subscriptions USING (auth.role() = 'service_role');
CREATE POLICY "Users read own"                  ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own"                ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role on users"           ON users USING (auth.role() = 'service_role');
CREATE POLICY "Users own wishlist"              ON wishlists USING (auth.uid() = user_id);
CREATE POLICY "Service role on wishlists"       ON wishlists USING (auth.role() = 'service_role');

-- ── HELPER FUNCTIONS ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_deal_clicks(p_slug text)
RETURNS void AS $$ UPDATE deals SET click_count = click_count + 1 WHERE slug = p_slug AND active = true; $$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_deal_shares(p_slug text)
RETURNS void AS $$ UPDATE deals SET share_count = share_count + 1 WHERE slug = p_slug AND active = true; $$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION expire_old_deals() RETURNS integer AS $$
DECLARE n integer;
BEGIN
  UPDATE deals SET active = false WHERE active = true AND (expires_at < CURRENT_DATE OR discovered_at < now() - INTERVAL '3 days');
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── SEED DATA (delete before go-live or keep for fallback display) ─
INSERT INTO deals (slug,origin_code,origin_city,origin_airport,dest_code,dest_name,dest_country,dest_region,dest_emoji,price,typical_price,saving_pct,saving_amount,price_vs_avg,deal_score,deal_tier,deal_label,deal_badge,is_error_fare,is_exceptional,longhaul,airline,stops,depart_date,return_date,booking_url,deal_url,seo_title,seo_description,expires_at,active)
VALUES
  ('london-to-tokyo-349','LHR','London','London Heathrow','NRT','Tokyo','Japan','Asia','⛩️',349,620,44,271,56,91,'exceptional','🔥 Exceptional Deal','EXCEPTIONAL',false,true,true,'JAL',1,CURRENT_DATE+21,CURRENT_DATE+28,'https://www.aviasales.com/search/LHR?marker=499405','https://www.triphunt.org/deal/london-to-tokyo-349','London to Tokyo from £349 | TripHunt','44% off flights from London to Tokyo. Usually £620 — now £349.',CURRENT_DATE+30,true),
  ('manchester-to-new-york-210','MAN','Manchester','Manchester Airport','JFK','New York','USA','Americas','🗽',210,380,45,170,55,89,'exceptional','🔥 Exceptional Deal','EXCEPTIONAL',false,true,true,'American Airlines',0,CURRENT_DATE+18,CURRENT_DATE+25,'https://www.aviasales.com/search/MAN?marker=499405','https://www.triphunt.org/deal/manchester-to-new-york-210','Manchester to New York from £210 | TripHunt','45% off flights from Manchester to New York. Usually £380 — now £210.',CURRENT_DATE+30,true),
  ('london-to-bali-390','LHR','London','London Heathrow','DPS','Bali','Indonesia','Asia','🌺',390,590,34,200,66,81,'exceptional','🔥 Exceptional Deal','EXCEPTIONAL',false,true,true,'Singapore Airlines',1,CURRENT_DATE+24,CURRENT_DATE+38,'https://www.aviasales.com/search/LHR?marker=499405','https://www.triphunt.org/deal/london-to-bali-390','London to Bali from £390 | TripHunt','34% off flights from London to Bali. Usually £590 — now £390.',CURRENT_DATE+30,true),
  ('birmingham-to-dubai-199','BHX','Birmingham','Birmingham Airport','DXB','Dubai','UAE','Middle East','🏙️',199,280,29,81,71,75,'great','⚡ Great Deal','GREAT DEAL',false,false,true,'Emirates',0,CURRENT_DATE+14,CURRENT_DATE+21,'https://www.aviasales.com/search/BHX?marker=499405','https://www.triphunt.org/deal/birmingham-to-dubai-199','Birmingham to Dubai from £199 | TripHunt','29% off flights from Birmingham to Dubai. Usually £280 — now £199.',CURRENT_DATE+30,true),
  ('manchester-to-dubai-149','MAN','Manchester','Manchester Airport','DXB','Dubai','UAE','Middle East','🏙️',149,280,47,131,53,92,'exceptional','🔥 Exceptional Deal','EXCEPTIONAL',true,true,true,'Emirates',0,CURRENT_DATE+10,CURRENT_DATE+17,'https://www.aviasales.com/search/MAN?marker=499405','https://www.triphunt.org/deal/manchester-to-dubai-149','Manchester to Dubai from £149 | TripHunt','🚨 Possible error fare — 47% off. Usually £280 — now £149.',CURRENT_DATE+30,true),
  ('london-to-bangkok-299','LHR','London','London Heathrow','BKK','Bangkok','Thailand','Asia','🛺',299,520,43,221,58,88,'exceptional','🔥 Exceptional Deal','EXCEPTIONAL',false,true,true,'Thai Airways',1,CURRENT_DATE+21,CURRENT_DATE+35,'https://www.aviasales.com/search/LHR?marker=499405','https://www.triphunt.org/deal/london-to-bangkok-299','London to Bangkok from £299 | TripHunt','43% off flights from London to Bangkok. Usually £520 — now £299.',CURRENT_DATE+30,true),
  ('edinburgh-to-new-york-249','EDI','Edinburgh','Edinburgh Airport','JFK','New York','USA','Americas','🗽',249,380,34,131,66,80,'exceptional','🔥 Exceptional Deal','EXCEPTIONAL',false,true,true,'Norwegian',0,CURRENT_DATE+28,CURRENT_DATE+35,'https://www.aviasales.com/search/EDI?marker=499405','https://www.triphunt.org/deal/edinburgh-to-new-york-249','Edinburgh to New York from £249 | TripHunt','34% off from Edinburgh to New York. Usually £380 — now £249.',CURRENT_DATE+30,true),
  ('bristol-to-lisbon-44','BRS','Bristol','Bristol Airport','LIS','Lisbon','Portugal','Europe','🌞',44,105,58,61,42,88,'exceptional','🔥 Exceptional Deal','EXCEPTIONAL',false,true,false,'easyJet',0,CURRENT_DATE+14,CURRENT_DATE+18,'https://www.aviasales.com/search/BRS?marker=499405','https://www.triphunt.org/deal/bristol-to-lisbon-44','Bristol to Lisbon from £44 | TripHunt','58% off from Bristol to Lisbon. Usually £105 — now £44.',CURRENT_DATE+30,true),
  ('london-to-cape-town-349','LHR','London','London Heathrow','CPT','Cape Town','South Africa','Africa','🦁',349,520,33,171,67,78,'great','⚡ Great Deal','GREAT DEAL',false,false,true,'British Airways',1,CURRENT_DATE+35,CURRENT_DATE+49,'https://www.aviasales.com/search/LHR?marker=499405','https://www.triphunt.org/deal/london-to-cape-town-349','London to Cape Town from £349 | TripHunt','33% off from London to Cape Town. Usually £520 — now £349.',CURRENT_DATE+30,true),
  ('london-to-singapore-389','LHR','London','London Heathrow','SIN','Singapore','Singapore','Asia','🦁',389,480,19,91,81,70,'great','⚡ Great Deal','GREAT DEAL',false,false,true,'Singapore Airlines',0,CURRENT_DATE+21,CURRENT_DATE+28,'https://www.aviasales.com/search/LHR?marker=499405','https://www.triphunt.org/deal/london-to-singapore-389','London to Singapore from £389 | TripHunt','19% off from London to Singapore. Usually £480 — now £389.',CURRENT_DATE+30,true)
ON CONFLICT (slug) DO UPDATE SET price=EXCLUDED.price, deal_score=EXCLUDED.deal_score, active=EXCLUDED.active, discovered_at=now();
