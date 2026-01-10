-- Create payment_configurations table for storing creator's payment gateway settings
CREATE TABLE public.payment_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gateway VARCHAR(50) NOT NULL, -- 'stripe', 'asaas', 'mercadopago', 'pushinpay'
  is_active BOOLEAN DEFAULT false,
  public_key TEXT,
  secret_key TEXT,
  webhook_secret TEXT,
  additional_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, gateway)
);

-- Enable RLS
ALTER TABLE public.payment_configurations ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see and manage their own configurations
CREATE POLICY "Users can view their own payment configurations"
ON public.payment_configurations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment configurations"
ON public.payment_configurations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment configurations"
ON public.payment_configurations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment configurations"
ON public.payment_configurations
FOR DELETE
USING (auth.uid() = user_id);

-- Create payments table to track all transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  gateway_payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'refunded'
  payment_method VARCHAR(50),
  payment_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update payment status"
ON public.payments
FOR UPDATE
USING (auth.uid() = seller_id);

-- Trigger for updated_at
CREATE TRIGGER update_payment_configurations_updated_at
BEFORE UPDATE ON public.payment_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();