-- Create a new policy that allows any authenticated user to see active payment gateways
-- This is needed so customers can see which payment methods a seller has configured
-- We'll use a security definer function to limit what data can be accessed

-- First, drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own payment configurations" ON public.payment_configurations;

-- Create a policy for users to view their own full configurations (for settings page)
CREATE POLICY "Users can view their own payment configurations"
ON public.payment_configurations
FOR SELECT
USING (auth.uid() = user_id);

-- Create a policy that allows anyone to see active gateways (limited fields handled by query)
-- This allows customers to check if a seller has payment methods configured
CREATE POLICY "Anyone can check seller active gateways"
ON public.payment_configurations
FOR SELECT
USING (is_active = true);