-- ─────────────────────────────────────────────
-- MIGRATION : Ajout du numéro WhatsApp vendeur
-- Coller dans : Supabase > SQL Editor > New Query
-- ─────────────────────────────────────────────

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- Initialiser avec le numéro de téléphone existant si présent
UPDATE stores
SET whatsapp_phone = owner_phone
WHERE whatsapp_phone IS NULL AND owner_phone IS NOT NULL;
