-- ==============================================================================
-- Harbor & Thread — Newsletter Subscribers Schema Migration
-- Architecture: Database-First, Row Level Security (RLS) Enforced
-- Table: public.newsletter_subscribers
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure email is stored normalized (lowercase, trimmed)
  CONSTRAINT newsletter_email_normalized CHECK (
    email = lower(trim(email)) AND
    length(email) >= 5 AND
    email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  )
);

-- Case-insensitive unique index / constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscribers_email_unique
  ON public.newsletter_subscribers (email);

-- Performance index for active subscriber queries (administrative use)
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active
  ON public.newsletter_subscribers (is_active, created_at DESC);


-- ------------------------------------------------------------------------------
-- 2. AUTOMATED UPDATED_AT TRIGGER
-- ------------------------------------------------------------------------------
-- Uses the existing handle_updated_at() trigger function from Stage 2
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    DROP TRIGGER IF EXISTS set_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
    CREATE TRIGGER set_newsletter_subscribers_updated_at
      BEFORE UPDATE ON public.newsletter_subscribers
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated visitors may subscribe (INSERT only)
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Public can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  WITH CHECK (true);

-- CRITICAL PRIVACY & SECURITY RULES:
-- 1. NO SELECT policy is granted to anon/public.
--    Prevents harvesting or scraping of customer email addresses.
-- 2. NO UPDATE policy is granted to anon/public.
--    Prevents unauthorized modification of subscriber records.
-- 3. NO DELETE policy is granted to anon/public.
--    Prevents unauthorized purging of subscriber lists.


-- ------------------------------------------------------------------------------
-- 4. MINIMAL PRIVILEGE GRANTS
-- ------------------------------------------------------------------------------
-- Revoke all default public permissions
REVOKE ALL ON public.newsletter_subscribers FROM PUBLIC;
REVOKE ALL ON public.newsletter_subscribers FROM anon;
REVOKE ALL ON public.newsletter_subscribers FROM authenticated;

-- Grant INSERT only to anon and authenticated roles
GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT INSERT ON public.newsletter_subscribers TO authenticated;

-- Full access reserved exclusively for service_role (backend/admin)
GRANT ALL ON public.newsletter_subscribers TO service_role;
