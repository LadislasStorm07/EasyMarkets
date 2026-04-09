-- ─────────────────────────────────────────────
-- MIGRATION : Ajout du type de boutique
-- Coller dans : Supabase > SQL Editor > New Query
-- ─────────────────────────────────────────────

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'Épicerie';

-- Mettre à jour la boutique démo existante
UPDATE stores SET store_type = 'Épicerie' WHERE store_type IS NULL;
