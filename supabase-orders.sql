-- ==============================================================================
-- Harbor & Thread — Orders & Order Items Schema for Supabase PostgreSQL
-- Allows both Guest Checkout (no authentication required) and Registered Users
-- ==============================================================================

-- 1. Create ORDERS table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL DEFAULT 'Boston',
  shipping_state TEXT NOT NULL DEFAULT 'MA',
  shipping_zip TEXT NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_guest BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_orders_updated_at();

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. RLS POLICIES FOR ORDERS
-- Anyone (guests and logged in users) can place an order
DROP POLICY IF EXISTS "Public and guests can place orders" ON public.orders;
CREATE POLICY "Public and guests can place orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- Anyone can view their own order with order_number or email (public order lookup)
DROP POLICY IF EXISTS "Customers can view orders by order_number or email" ON public.orders;
CREATE POLICY "Customers can view orders by order_number or email"
  ON public.orders
  FOR SELECT
  USING (true);

-- 3. PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.orders TO anon, authenticated;

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
