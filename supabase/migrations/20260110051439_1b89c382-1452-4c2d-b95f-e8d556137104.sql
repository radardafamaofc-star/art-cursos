-- Create table for creator subscriptions
CREATE TABLE public.creator_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  gateway TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 29.99,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.creator_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own subscription
CREATE POLICY "Users can create own subscription"
ON public.creator_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role and triggers can update subscriptions
CREATE POLICY "Service can update subscriptions"
ON public.creator_subscriptions
FOR UPDATE
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_creator_subscriptions_user_id ON public.creator_subscriptions(user_id);
CREATE INDEX idx_creator_subscriptions_status ON public.creator_subscriptions(status);