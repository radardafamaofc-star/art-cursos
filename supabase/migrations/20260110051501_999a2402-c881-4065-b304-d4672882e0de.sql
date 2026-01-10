-- Fix the UPDATE policy to only allow users to update their own subscriptions
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can update subscriptions" ON public.creator_subscriptions;

-- Create proper policy for updates - allow users to update their own pending subscriptions
CREATE POLICY "Users can update own subscriptions"
ON public.creator_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);