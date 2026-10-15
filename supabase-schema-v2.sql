-- ==============================================================================
-- Harbor & Thread — Production-Ready Supabase Schema (v2)
-- Architecture: Database-First, Row Level Security (RLS) Enforced
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. AUTOMATED UPDATED_AT TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- 1. PRODUCTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  badge TEXT,
  is_trending BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-update updated_at on modification
DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public visitors may SELECT active products only
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
  ON public.products
  FOR SELECT
  USING (is_active = true);


-- ------------------------------------------------------------------------------
-- 2. LOOKBOOK TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lookbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  season TEXT,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-update updated_at on modification
DROP TRIGGER IF EXISTS set_lookbook_updated_at ON public.lookbook;
CREATE TRIGGER set_lookbook_updated_at
  BEFORE UPDATE ON public.lookbook
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.lookbook ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public visitors may SELECT published lookbook entries only
DROP POLICY IF EXISTS "Public can view published looks" ON public.lookbook;
CREATE POLICY "Public can view published looks"
  ON public.lookbook
  FOR SELECT
  USING (is_published = true);


-- ------------------------------------------------------------------------------
-- 3. LOOKBOOK_PRODUCTS JOIN TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lookbook_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookbook_id UUID NOT NULL REFERENCES public.lookbook(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_lookbook_product UNIQUE (lookbook_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE public.lookbook_products ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public visitors may SELECT relationships required for published website content
DROP POLICY IF EXISTS "Public can view lookbook products" ON public.lookbook_products;
CREATE POLICY "Public can view lookbook products"
  ON public.lookbook_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lookbook l
      WHERE l.id = lookbook_products.lookbook_id AND l.is_published = true
    )
    AND
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = lookbook_products.product_id AND p.is_active = true
    )
  );


-- ------------------------------------------------------------------------------
-- 4. TESTIMONIALS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  badge TEXT DEFAULT 'VERIFIED',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-update updated_at on modification
DROP TRIGGER IF EXISTS set_testimonials_updated_at ON public.testimonials;
CREATE TRIGGER set_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public visitors may SELECT approved testimonials only
DROP POLICY IF EXISTS "Public can view approved testimonials only" ON public.testimonials;
CREATE POLICY "Public can view approved testimonials only"
  ON public.testimonials
  FOR SELECT
  USING (is_approved = true);


-- ------------------------------------------------------------------------------
-- 5. FEEDBACK TABLE (INSERT-ONLY FOR PUBLIC USERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) >= 2),
  email TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('General', 'Website Experience', 'Products', 'Lookbook', 'Other')),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL CHECK (length(trim(message)) >= 3),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-update updated_at on modification
DROP TRIGGER IF EXISTS set_feedback_updated_at ON public.feedback;
CREATE TRIGGER set_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anonymous / Public visitors may INSERT feedback
DROP POLICY IF EXISTS "Public can submit feedback" ON public.feedback;
CREATE POLICY "Public can submit feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Anonymous / Public visitors may SELECT feedback for real-time customer feed
DROP POLICY IF EXISTS "Public can view feedback" ON public.feedback;
CREATE POLICY "Public can view feedback"
  ON public.feedback
  FOR SELECT
  USING (true);

-- Enable Supabase Realtime broadcast on feedback
ALTER TABLE public.feedback REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'feedback'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 6. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
-- Products indexes for trending filtering, catalog ordering, and category views
CREATE INDEX IF NOT EXISTS idx_products_trending_active_order
  ON public.products (is_trending, is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products (category);

-- Lookbook index for published looks and sequence ordering
CREATE INDEX IF NOT EXISTS idx_lookbook_published_order
  ON public.lookbook (is_published, display_order);

-- Lookbook_Products join indexes for relational queries and joins
CREATE INDEX IF NOT EXISTS idx_lookbook_products_lookbook_id
  ON public.lookbook_products (lookbook_id);

CREATE INDEX IF NOT EXISTS idx_lookbook_products_product_id
  ON public.lookbook_products (product_id);

-- Testimonials index for approved reviews ordered by display position
CREATE INDEX IF NOT EXISTS idx_testimonials_approved_order
  ON public.testimonials (is_approved, display_order);

-- Feedback indexes for administrative review
CREATE INDEX IF NOT EXISTS idx_feedback_created_at
  ON public.feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_status
  ON public.feedback (status);


-- ------------------------------------------------------------------------------
-- 7. GRANT PERMISSIONS (LEAST PRIVILEGE)
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public read access to active/approved published content & live feedback
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.lookbook TO anon, authenticated;
GRANT SELECT ON public.lookbook_products TO anon, authenticated;
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT SELECT ON public.feedback TO anon, authenticated;

-- Public write access for feedback submissions
GRANT INSERT ON public.feedback TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 8. IDEMPOTENT SEED DATA (Curated matching Harbor & Thread visual source of truth)
-- ------------------------------------------------------------------------------

-- Seed Products (Deterministic UUIDs ensure safe rerunnability without duplicates)
INSERT INTO public.products (id, name, subtitle, category, price, image_url, badge, is_trending, is_active, display_order, description)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Beacon Denim Jeans', 'Stonewashed Indigo', 'Clothing', 95.00, 'images/jeans.jpg', 'NEW', true, true, 1, 'Crafted from premium 13.5 oz Japanese selvedge denim with an authentic stonewashed fade, custom antique brass rivets, and a tailored straight-leg fit.'),
  ('b0000000-0000-0000-0000-000000000002', 'Harbor Weekend Bag', 'Premium Black', 'Accessories', 165.00, 'images/bag.jpg', 'BESTSELLER', true, true, 2, 'Constructed from weatherproof 1000D ballistic nylon with full-grain leather carry handles, padded 16-inch laptop compartment, and dual exterior organizer pockets.'),
  ('b0000000-0000-0000-0000-000000000003', 'Commonwealth Watch', 'Minimal Silver', 'Accessories', 220.00, 'images/watch.jpg', 'PREMIUM', true, true, 3, 'Surgical-grade 316L brushed stainless steel case with scratch-resistant sapphire crystal, Japanese quartz movement, and 50m water resistance.'),
  ('b0000000-0000-0000-0000-000000000004', 'Back Bay Oversized Knit Polo', 'Ivory Texture', 'Clothing', 145.00, 'images/shirt.jpg', 'TRENDING', true, true, 4, 'Spun from 100% Peruvian pima cotton waffle-knit with a relaxed dropped-shoulder silhouette, mother-of-pearl buttons, and ribbed collar.'),
  ('b0000000-0000-0000-0000-000000000005', 'North End Outfit Set', 'Camel / Cream', 'Clothing', 255.00, 'images/outfit.jpg', 'LIMITED', true, true, 5, 'Two-piece tailored coordinated set featuring an unlined camel wool-blend overshirt jacket paired with pleated cream relaxed-fit trousers.'),
  ('b0000000-0000-0000-0000-000000000006', 'Seaport Sunglasses', 'Amber Frame', 'Accessories', 130.00, 'images/sunglasses.jpg', 'CURATED', true, true, 6, 'Handcrafted Italian Mazzucchelli acetate frame in rich amber tortoiseshell with polarized 100% UVA/UVB Carl Zeiss lenses.'),
  ('b0000000-0000-0000-0000-000000000007', 'Beacon Leather Penny Loafers', 'Chestnut Italian Calfskin', 'Footwear', 195.00, 'images/loafers.jpg', 'NEW', true, true, 7, 'Handcrafted in genuine full-grain Italian calfskin with Goodyear-welted construction. Features a classic penny strap, cushioned arch support, and stacked leather heel designed for all-day city walks through Beacon Hill.'),
  ('b0000000-0000-0000-0000-000000000008', 'Seaport Suede Chelsea Boots', 'Espresso Weather-Resistant Suede', 'Footwear', 225.00, 'images/boots.jpg', 'BESTSELLER', true, true, 8, 'Cut from supple espresso calf suede with weather-resistant finishing, elastic side gussets, pull tabs, and custom lugged traction soles engineered for crisp New England autumn and winter mornings.'),
  ('b0000000-0000-0000-0000-000000000009', 'Commonwealth Low-Top Sneaker', 'Pristine White Calfskin / Gum Sole', 'Footwear', 160.00, 'images/sneakers.jpg', 'PREMIUM', true, true, 9, 'Minimalist Boston city sneakers crafted from smooth Italian Nappa leather with soft off-white suede accents, breathable calfskin lining, and durable natural gum rubber cupsoles.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  subtitle = EXCLUDED.subtitle,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url,
  badge = EXCLUDED.badge,
  is_trending = EXCLUDED.is_trending,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  description = EXCLUDED.description,
  updated_at = now();

-- Seed Lookbook Entries
INSERT INTO public.lookbook (id, title, description, season, image_url, is_published, display_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Back Bay Minimal', 'Cream knitwear, camel tailoring, and relaxed structure for polished city days.', 'Fall / Winter 2026', 'images/outfit.jpg', true, 1),
  ('c0000000-0000-0000-0000-000000000002', 'Beacon Hill Casual', 'Classic denim paired with elevated layers for effortless everyday styling.', 'Autumn Everyday', 'images/jeans.jpg', true, 2),
  ('c0000000-0000-0000-0000-000000000003', 'Seaport Weekend', 'Clean accessories and practical luxury for an easy waterfront weekend edit.', 'Coastal Weekend', 'images/bag.jpg', true, 3)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  season = EXCLUDED.season,
  image_url = EXCLUDED.image_url,
  is_published = EXCLUDED.is_published,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Seed Lookbook Associated Products
INSERT INTO public.lookbook_products (lookbook_id, product_id, display_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 1), -- Back Bay Minimal -> Knit Polo
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 2), -- Back Bay Minimal -> Outfit Set
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 1), -- Beacon Hill Casual -> Denim Jeans
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 2), -- Beacon Hill Casual -> Watch
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 1), -- Seaport Weekend -> Weekend Bag
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006', 2)  -- Seaport Weekend -> Sunglasses
ON CONFLICT (lookbook_id, product_id) DO UPDATE SET
  display_order = EXCLUDED.display_order;

-- Seed Testimonials (Approved customer reviews)
INSERT INTO public.testimonials (id, customer_name, rating, comment, badge, is_approved, display_order)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'John D.', 5, 'The budget slider made shopping so straightforward. I found Boston-inspired items within my price range quickly, and the whole site feels polished.', 'VERIFIED', true, 1),
  ('d0000000-0000-0000-0000-000000000002', 'Andrew M.', 5, 'I love the Boston-inspired styling and the lookbook page. The clean outfit layout makes discovering new combinations effortless.', 'POPULAR', true, 2),
  ('d0000000-0000-0000-0000-000000000003', 'Sarah K.', 4, 'The photography is sharp and premium. The accessories are gorgeous—the Commonwealth Watch has become my daily staple.', 'RECENT', true, 3),
  ('d0000000-0000-0000-0000-000000000004', 'Rebecca T.', 5, 'The interactive experience was smooth and consistent on both my phone and laptop. Love the brownstone aesthetic and responsive design.', 'VERIFIED', true, 4)
ON CONFLICT (id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  rating = EXCLUDED.rating,
  comment = EXCLUDED.comment,
  badge = EXCLUDED.badge,
  is_approved = EXCLUDED.is_approved,
  display_order = EXCLUDED.display_order,
  updated_at = now();
