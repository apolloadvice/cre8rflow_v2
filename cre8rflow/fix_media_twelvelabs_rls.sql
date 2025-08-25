-- Fix RLS policy for media_twelvelabs table to work with service key and test user
-- This addresses the issue where the hardcoded test-user-123 can't access the table

-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage their own TwelveLabs data" ON media_twelvelabs;

-- Create a more permissive policy that works with service key authentication
-- This allows both authenticated users and service key operations
CREATE POLICY "Allow TwelveLabs operations" ON media_twelvelabs
FOR ALL 
USING (
  -- Allow if user is authenticated and owns the record
  (auth.uid()::text = user_id)
  OR
  -- Allow if using service key (bypasses auth.uid() requirement)
  (auth.role() = 'service_role')
  OR
  -- Allow for test user specifically (temporary for development)
  (user_id = 'test-user-123')
);

-- Alternative: Temporarily disable RLS for debugging
-- Uncomment the line below if the above policy still doesn't work
-- ALTER TABLE media_twelvelabs DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later (after confirming the fix works):
-- ALTER TABLE media_twelvelabs ENABLE ROW LEVEL SECURITY;