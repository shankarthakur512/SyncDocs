-- =============================================================================
-- Row Level Security (RLS) — defense-in-depth for tenant isolation
-- -----------------------------------------------------------------------------
-- The PRIMARY authorization mechanism is strict ORM scoping in the service
-- layer (every query is filtered by the caller's membership). RLS is a SECOND,
-- database-enforced layer: even a bug in application code, or a raw query, can
-- never read/write rows the current user has no membership for.
--
-- HOW IT WORKS
--   The app sets a per-transaction GUC `app.current_user_id` (see
--   src/lib/db-rls.ts -> withUserContext). Policies below compare each row's
--   membership against that value. With no value set, policies deny by default.
--
-- IMPORTANT: This is OPT-IN. Apply it only after routing DB access through
-- `withUserContext`, otherwise queries made without the GUC set will be blocked.
-- Run with the DIRECT (non-pooled) connection:
--   psql "$DIRECT_URL" -f prisma/rls/enable-rls.sql
-- =============================================================================

-- Enable + force RLS so even the table owner is subject to policies.
ALTER TABLE "Document"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document"           FORCE  ROW LEVEL SECURITY;
ALTER TABLE "DocumentMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentMembership" FORCE  ROW LEVEL SECURITY;

-- Convenience expression: the current request's user id (NULL if unset).
-- current_setting(..., true) returns NULL instead of erroring when unset.

-- ---------------------------------------------------------------------------
-- Document: a user may see/modify a document only via a membership row.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS document_select ON "Document";
CREATE POLICY document_select ON "Document"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "DocumentMembership" m
      WHERE m."documentId" = "Document".id
        AND m."userId" = current_setting('app.current_user_id', true)
    )
  );

-- Writes to a document require an OWNER membership.
DROP POLICY IF EXISTS document_modify ON "Document";
CREATE POLICY document_modify ON "Document"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "DocumentMembership" m
      WHERE m."documentId" = "Document".id
        AND m."userId" = current_setting('app.current_user_id', true)
        AND m.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DocumentMembership" m
      WHERE m."documentId" = "Document".id
        AND m."userId" = current_setting('app.current_user_id', true)
        AND m.role = 'OWNER'
    )
  );

-- ---------------------------------------------------------------------------
-- DocumentMembership: a user may read memberships of documents they belong to;
-- only OWNERs of that document may add/modify/remove memberships.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS membership_select ON "DocumentMembership";
CREATE POLICY membership_select ON "DocumentMembership"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "DocumentMembership" self
      WHERE self."documentId" = "DocumentMembership"."documentId"
        AND self."userId" = current_setting('app.current_user_id', true)
    )
  );

DROP POLICY IF EXISTS membership_modify ON "DocumentMembership";
CREATE POLICY membership_modify ON "DocumentMembership"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "DocumentMembership" owner
      WHERE owner."documentId" = "DocumentMembership"."documentId"
        AND owner."userId" = current_setting('app.current_user_id', true)
        AND owner.role = 'OWNER'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DocumentMembership" owner
      WHERE owner."documentId" = "DocumentMembership"."documentId"
        AND owner."userId" = current_setting('app.current_user_id', true)
        AND owner.role = 'OWNER'
    )
  );
