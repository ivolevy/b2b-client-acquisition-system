-- Migration: Add payments table and update users for credits/plans

-- Update users table
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS credits INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS mp_customer_id VARCHAR(255);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ARS',
    platform VARCHAR(50) NOT NULL, -- 'mercadopago', 'stripe', etc.
    external_id VARCHAR(255), -- ID de la pasarela
    status VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'rejected'
    plan_id VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON public.payments(external_id);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
