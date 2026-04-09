-- ╔══════════════════════════════════════════════════════════════╗
-- ║          FRESHMART — BASE DE DONNÉES SUPABASE              ║
-- ║  Coller ce script dans : Supabase > SQL Editor > New Query ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 2. TABLE : BOUTIQUES (stores)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id          TEXT PRIMARY KEY DEFAULT 'store_' || gen_random_uuid()::text,
  name        TEXT NOT NULL,
  emoji       TEXT DEFAULT '🏪',
  owner_name  TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  city        TEXT,
  country     TEXT DEFAULT 'Bénin',
  address     TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. TABLE : SUPER ADMINS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admins (
  id          TEXT PRIMARY KEY DEFAULT 'sa_' || gen_random_uuid()::text,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,   -- à hashéer en production (bcrypt côté serveur)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Compte démo Super Admin
INSERT INTO super_admins (id, first_name, last_name, email, password)
VALUES ('sa_demo', 'Super', 'Admin', 'superadmin@freshmart.com', 'super123')
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────
-- 4. TABLE : ADMINS VENDEURS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id          TEXT PRIMARY KEY DEFAULT 'adm_' || gen_random_uuid()::text,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  phone       TEXT,
  store_id    TEXT REFERENCES stores(id) ON DELETE SET NULL,
  store_name  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Boutique + admin démo
INSERT INTO stores (id, name, emoji, owner_name, owner_email, owner_phone, city, country, address, active)
VALUES ('store_1', 'FreshMart Cotonou', '🌿', 'Admin Demo', 'admin@freshmart.com', '+229 97 00 00 01', 'Cotonou', 'Bénin', 'Quartier Ganhi', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO admins (id, first_name, last_name, email, password, phone, store_id, store_name)
VALUES ('adm_1', 'Admin', 'Demo', 'admin@freshmart.com', 'admin123', '+229 97 00 00 01', 'store_1', 'FreshMart Cotonou')
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────
-- 5. TABLE : CLIENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY DEFAULT 'cli_' || gen_random_uuid()::text,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  country     TEXT DEFAULT 'Bénin',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 6. TABLE : PRODUITS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           BIGINT PRIMARY KEY DEFAULT extract(epoch from now())::bigint,
  store_id     TEXT REFERENCES stores(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  name_en      TEXT,
  category     TEXT NOT NULL,
  category_en  TEXT,
  price        INTEGER NOT NULL DEFAULT 0,
  promo_price  INTEGER,
  stock        INTEGER NOT NULL DEFAULT 0,
  description  TEXT,
  description_en TEXT,
  emoji        TEXT DEFAULT '📦',
  image_base64 TEXT,      -- image stockée en base64
  is_new       BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Produits démo
INSERT INTO products (id, store_id, name, name_en, category, category_en, price, stock, description, description_en, emoji)
VALUES
  (1, 'store_1', 'Tomates fraîches', 'Fresh Tomatoes', 'Légumes', 'Vegetables', 1500, 45, 'Tomates locales cultivées sans pesticides.', 'Local pesticide-free tomatoes.', '🍅'),
  (2, 'store_1', 'Poulet fermier', 'Free-range Chicken', 'Viandes', 'Meat', 4500, 12, 'Poulet élevé en plein air.', 'Free-range chicken.', '🍗'),
  (3, 'store_1', 'Riz importé 5kg', 'Imported Rice 5kg', 'Épicerie', 'Grocery', 6000, 0, 'Riz long grain de qualité.', 'Premium long-grain rice.', '🌾'),
  (4, 'store_1', 'Huile de palme 1L', 'Palm Oil 1L', 'Épicerie', 'Grocery', 2500, 30, 'Huile de palme rouge artisanale.', 'Artisanal red palm oil.', '🫙'),
  (5, 'store_1', 'Bananes plantain', 'Plantain Bananas', 'Fruits', 'Fruits', 800, 7, 'Plantains mûrs à point.', 'Ripe plantains.', '🍌'),
  (6, 'store_1', 'Poisson capitaine', 'Captain Fish', 'Poissons', 'Fish', 5500, 18, 'Poisson frais de l''Atlantique.', 'Fresh Atlantic fish.', '🐟'),
  (7, 'store_1', 'Œufs fermiers ×12', 'Farm Eggs', 'Laitier', 'Dairy', 1800, 24, 'Œufs frais de poules en plein air.', 'Fresh free-range eggs.', '🥚')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 7. TABLE : COMMANDES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           TEXT PRIMARY KEY DEFAULT 'FM-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  store_id     TEXT REFERENCES stores(id) ON DELETE SET NULL,
  client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  client_name  TEXT,
  client_phone TEXT,
  client_email TEXT,
  client_addr  TEXT,
  items        JSONB NOT NULL DEFAULT '[]',   -- [{id, name, emoji, price, qty}]
  total        INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','delivered','cancelled')),
  delivery_type TEXT DEFAULT 'pickup',         -- 'pickup' | 'delivery'
  note         TEXT,
  qr_code      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8. TABLE : RÉSERVATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id           TEXT PRIMARY KEY DEFAULT 'RES-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  store_id     TEXT REFERENCES stores(id) ON DELETE SET NULL,
  client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  client_name  TEXT,
  client_phone TEXT,
  product_id   BIGINT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity     INTEGER NOT NULL DEFAULT 1,
  date         DATE,
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 9. TABLE : ANNONCES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id        TEXT PRIMARY KEY DEFAULT 'ann_' || gen_random_uuid()::text,
  title     TEXT NOT NULL,
  message   TEXT NOT NULL,
  type      TEXT DEFAULT 'info' CHECK (type IN ('info','urgent','premium','update')),
  target    TEXT DEFAULT 'all',   -- 'all' ou store_id spécifique
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 10. TABLE : PREMIUM
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS premium (
  store_id    TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  stats       BOOLEAN DEFAULT false,
  marketing   BOOLEAN DEFAULT false,
  delivery    BOOLEAN DEFAULT false,
  ai          BOOLEAN DEFAULT false,
  mobile      BOOLEAN DEFAULT false,
  multistore  BOOLEAN DEFAULT false,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 11. TABLE : AVIS VENDEURS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_reviews (
  id         TEXT PRIMARY KEY DEFAULT 'vr_' || gen_random_uuid()::text,
  admin_email TEXT NOT NULL,
  store_name TEXT,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      TEXT NOT NULL,
  comment    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 12. TABLE : AVIS CLIENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_reviews (
  id          TEXT PRIMARY KEY DEFAULT 'cr_' || gen_random_uuid()::text,
  client_email TEXT NOT NULL,
  client_name TEXT,
  store_id    TEXT REFERENCES stores(id) ON DELETE CASCADE,
  store_name  TEXT,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT NOT NULL,
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_email, store_id)
);

-- ─────────────────────────────────────────────
-- 13. TABLE : JOURNAL D'ACTIVITÉ
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity (
  id         BIGSERIAL PRIMARY KEY,
  message    TEXT NOT NULL,
  type       TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 14. TABLE : NOTIFICATIONS CLIENT
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  client_email TEXT NOT NULL,
  order_id    TEXT REFERENCES orders(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  status      TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 15. TRIGGERS : updated_at automatique
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- 16. ROW LEVEL SECURITY (RLS) — Sécurité
-- ─────────────────────────────────────────────
-- Active le RLS sur toutes les tables
ALTER TABLE stores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins   ENABLE ROW LEVEL SECURITY;

-- Politique permissive pour la clé ANON (accès public via API)
-- IMPORTANT : en production, restreindre selon les besoins
CREATE POLICY "allow_all_anon" ON stores         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON admins         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON clients        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON products       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON orders         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON reservations   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON announcements  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON premium        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON vendor_reviews FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON client_reviews FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON activity       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON notifications  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_anon" ON super_admins   FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- FIN — Base de données FreshMart prête ✓
-- ─────────────────────────────────────────────
