-- Add RLS policy for admins to manage all creator subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.creator_subscriptions
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all subscriptions"
ON public.creator_subscriptions
FOR UPDATE
USING (is_admin(auth.uid()));