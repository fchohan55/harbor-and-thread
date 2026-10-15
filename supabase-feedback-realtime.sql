-- ==============================================================================
-- Harbor & Thread — Real-Time Customer Feedback Migration
-- Enables Public Read Access & Realtime Broadcast on public.feedback
-- ==============================================================================

-- 1. Grant SELECT privilege to anonymous and authenticated users
GRANT SELECT ON public.feedback TO anon, authenticated;

-- 2. Enable Row Level Security (RLS) policies for viewing feedback
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow public visitors to read customer feedback (safe public fields)
DROP POLICY IF EXISTS "Public can view feedback" ON public.feedback;
CREATE POLICY "Public can view feedback"
  ON public.feedback
  FOR SELECT
  USING (true);

-- Ensure public visitors can insert new feedback
DROP POLICY IF EXISTS "Public can submit feedback" ON public.feedback;
CREATE POLICY "Public can submit feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);

-- 3. Enable Supabase Realtime Replication for the feedback table
-- This broadcasts INSERT events directly to browser clients in real time
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

-- 4. Create index on created_at for fast real-time feed queries
CREATE INDEX IF NOT EXISTS idx_feedback_created_at_desc
  ON public.feedback (created_at DESC);

-- 5. Seed initial authentic customer feedback if table is empty
INSERT INTO public.feedback (name, feedback_type, rating, message, status, created_at)
SELECT * FROM (VALUES
  ('Elena Rostova', 'Products', 5, 'The Beacon Hill Merino Polo exceeded expectations. The knit drape is tailored yet relaxed, perfect for New England autumn.', 'reviewed', now() - interval '2 hours'),
  ('Marcus Vance', 'Lookbook', 5, 'Outfit combinations in the Lookbook make shopping so intuitive. Picked up the Wool Overcoat and Oxford based on Look 01.', 'reviewed', now() - interval '6 hours'),
  ('Chloe Davenport', 'Website Experience', 5, 'Loving the real-time feedback and smooth budget slider! The Boston aesthetic is captured with remarkable class.', 'reviewed', now() - interval '18 hours'),
  ('Julian Hayes', 'General', 4, 'Very pleased with the quality of the Newbury Chinos. Customer service at the Boston boutique was very helpful.', 'reviewed', now() - interval '1 day'),
  ('Sophia Lin', 'Products', 5, 'The Seaport Amber Sunglasses feel substantial and stylish. Packaged beautifully with fast delivery to Cambridge.', 'reviewed', now() - interval '2 days')
) AS v(name, feedback_type, rating, message, status, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.feedback LIMIT 1);
