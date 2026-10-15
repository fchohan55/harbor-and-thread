-- ==============================================================================
-- Harbor & Thread — Complete Supabase PostgreSQL Schema & Security Policies (RLS)
-- ==============================================================================

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  badge TEXT,
  is_trending BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
  ON public.products
  FOR SELECT
  USING (is_active = true);


-- 2. LOOKBOOK TABLE
CREATE TABLE IF NOT EXISTS public.lookbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  season TEXT,
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lookbook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published looks" ON public.lookbook;
CREATE POLICY "Public can view published looks"
  ON public.lookbook
  FOR SELECT
  USING (is_published = true);


-- 3. LOOKBOOK_PRODUCTS JOIN TABLE
CREATE TABLE IF NOT EXISTS public.lookbook_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookbook_id UUID NOT NULL REFERENCES public.lookbook(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lookbook_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view lookbook products" ON public.lookbook_products;
CREATE POLICY "Public can view lookbook products"
  ON public.lookbook_products
  FOR SELECT
  USING (true);


-- 4. TESTIMONIALS TABLE
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  badge TEXT DEFAULT 'VERIFIED',
  is_approved BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved testimonials only" ON public.testimonials;
CREATE POLICY "Public can view approved testimonials only"
  ON public.testimonials
  FOR SELECT
  USING (is_approved = true);


-- 5. FEEDBACK TABLE (INSERT-ONLY FOR ANONYMOUS/PUBLIC USERS)
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  feedback_type TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anonymous / Public users are permitted to INSERT feedback
DROP POLICY IF EXISTS "Public can submit feedback" ON public.feedback;
CREATE POLICY "Public can submit feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- CRITICAL SECURITY: Do NOT create any SELECT policy on public.feedback for public/anon.
-- This guarantees customer feedback records cannot be retrieved or leaked client-side.


-- ==============================================================================
-- 6. GRANT TABLE PRIVILEGES TO anon AND authenticated ROLES
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.lookbook TO anon, authenticated;
GRANT SELECT ON public.lookbook_products TO anon, authenticated;
GRANT SELECT ON public.testimonials TO anon, authenticated;

-- CRITICAL: Only INSERT permission on feedback for public/anon (NO SELECT)
GRANT INSERT ON public.feedback TO anon, authenticated;


-- ==============================================================================
-- 7. SEED DATA (Curated matching the visual source of truth)
-- ==============================================================================

-- Seed Products
INSERT INTO public.products (name, subtitle, category, price, image_url, badge, is_trending, is_active, display_order)
VALUES
  ('Beacon Denim Jeans', 'Stonewashed Indigo', 'Clothing', 95.00, 'images/jeans.jpg', 'NEW', true, true, 1),
  ('Harbor Weekend Bag', 'Premium Black', 'Accessories', 165.00, 'images/bag.jpg', 'BESTSELLER', true, true, 2),
  ('Commonwealth Watch', 'Minimal Silver', 'Accessories', 220.00, 'images/watch.jpg', 'PREMIUM', true, true, 3),
  ('Back Bay Oversized Knit Polo', 'Ivory Texture', 'Clothing', 145.00, 'images/shirt.jpg', 'TRENDING', true, true, 4),
  ('North End Outfit Set', 'Camel / Cream', 'Clothing', 255.00, 'images/outfit.jpg', 'LIMITED', true, true, 5),
  ('Seaport Sunglasses', 'Amber Frame', 'Accessories', 130.00, 'images/sunglasses.jpg', 'CURATED', true, true, 6)
ON CONFLICT DO NOTHING;

-- Seed Lookbook
INSERT INTO public.lookbook (id, title, description, season, image_url, is_published, display_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Back Bay Minimal', 'Cream knitwear, camel tailoring, and relaxed structure for polished city days.', 'Fall / Winter 2026', 'images/outfit.jpg', true, 1),
  ('c0000000-0000-0000-0000-000000000002', 'Beacon Hill Casual', 'Classic denim paired with elevated layers for effortless everyday styling.', 'Autumn Everyday', 'images/jeans.jpg', true, 2),
  ('c0000000-0000-0000-0000-000000000003', 'Seaport Weekend', 'Clean accessories and practical luxury for an easy waterfront weekend edit.', 'Coastal Weekend', 'images/bag.jpg', true, 3)
ON CONFLICT DO NOTHING;

-- Seed Lookbook Associated Products
INSERT INTO public.lookbook_products (lookbook_id, product_id, display_order)
SELECT l.id, p.id, 1
FROM public.lookbook l, public.products p
WHERE l.title = 'Back Bay Minimal' AND p.name = 'Back Bay Oversized Knit Polo'
ON CONFLICT DO NOTHING;

INSERT INTO public.lookbook_products (lookbook_id, product_id, display_order)
SELECT l.id, p.id, 2
FROM public.lookbook l, public.products p
WHERE l.title = 'Back Bay Minimal' AND p.name = 'North End Outfit Set'
ON CONFLICT DO NOTHING;

INSERT INTO public.lookbook_products (lookbook_id, product_id, display_order)
SELECT l.id, p.id, 1
FROM public.lookbook l, public.products p
WHERE l.title = 'Beacon Hill Casual' AND p.name = 'Beacon Denim Jeans'
ON CONFLICT DO NOTHING;

INSERT INTO public.lookbook_products (lookbook_id, product_id, display_order)
SELECT l.id, p.id, 2
FROM public.lookbook l, public.products p
WHERE l.title = 'Beacon Hill Casual' AND p.name = 'Commonwealth Watch'
ON CONFLICT DO NOTHING;

INSERT INTO public.lookbook_products (lookbook_id, product_id, display_order)
SELECT l.id, p.id, 1
FROM public.lookbook l, public.products p
WHERE l.title = 'Seaport Weekend' AND p.name = 'Harbor Weekend Bag'
ON CONFLICT DO NOTHING;

INSERT INTO public.lookbook_products (lookbook_id, product_id, display_order)
SELECT l.id, p.id, 2
FROM public.lookbook l, public.products p
WHERE l.title = 'Seaport Weekend' AND p.name = 'Seaport Sunglasses'
ON CONFLICT DO NOTHING;

-- Seed Testimonials (Strictly is_approved = true)
INSERT INTO public.testimonials (customer_name, rating, comment, badge, is_approved, display_order)
VALUES
  ('John D.', 5, 'The budget slider made shopping so straightforward. I found Boston-inspired items within my price range quickly, and the whole site feels polished.', 'VERIFIED', true, 1),
  ('Andrew M.', 5, 'I love the Boston-inspired styling and the lookbook page. The clean outfit layout makes discovering new combinations effortless.', 'POPULAR', true, 2),
  ('Sarah K.', 4, 'The photography is sharp and premium. The accessories are gorgeous—the Commonwealth Watch has become my daily staple.', 'RECENT', true, 3),
  ('Rebecca T.', 5, 'The interactive experience was smooth and consistent on both my phone and laptop. Love the brownstone aesthetic and responsive design.', 'VERIFIED', true, 4)
ON CONFLICT DO NOTHING;
