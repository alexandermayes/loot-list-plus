-- Rollback the defensive characters policy from 20260514000001
-- ============================================================
-- Users reported being unable to access their guild/characters after the
-- prior migration. Dropping the new SELECT policy to restore prior behavior.
-- The CGM reactivations from 20260514000001 are additive (only flipped
-- is_active false → true) and remain in place — they cannot hide rows.

DROP POLICY IF EXISTS "Guild members can view characters with submissions" ON characters;
