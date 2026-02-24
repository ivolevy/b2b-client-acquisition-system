-- Migration: Atomic Transactions for Payments and Credits
-- Date: 2026-02-24

-- 1. Atomic Credit Deduction
-- Handles priority (monthly first, then extra) and returns success/new balance
CREATE OR REPLACE FUNCTION public.atomic_deduct_credits(
    p_user_id uuid,
    p_amount int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_monthly int;
    v_extra int;
    v_new_monthly int;
    v_new_extra int;
BEGIN
    -- Get current credits with lock to prevent race conditions
    SELECT credits, extra_credits INTO v_monthly, v_extra
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF (v_monthly + v_extra) < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_monthly + v_extra);
    END IF;

    -- Logic: deduct from monthly first
    IF v_monthly >= p_amount THEN
        v_new_monthly := v_monthly - p_amount;
        v_new_extra := v_extra;
    ELSE
        v_new_monthly := 0;
        v_new_extra := v_extra - (p_amount - v_monthly);
    END IF;

    -- Update database
    UPDATE public.users
    SET credits = v_new_monthly,
        extra_credits = v_new_extra,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN json_build_object('success', true, 'new_balance', v_new_monthly + v_new_extra);
END;
$$;

-- 2. Atomic Payment Processing
-- Handles user upsert and payment record insertion in one transaction
CREATE OR REPLACE FUNCTION public.process_successful_payment(
    p_user_id uuid,
    p_email text,
    p_name text,
    p_phone text,
    p_plan text,
    p_credits_to_set int, -- Monthly credits for plans
    p_extra_credits_to_add int, -- Extra credits for packs
    p_is_credit_pack boolean,
    p_payment_data jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_plan text;
    v_current_extra int;
    v_next_reset date;
BEGIN
    -- Idempotency check: External ID is unique in payments table
    IF EXISTS (SELECT 1 FROM public.payments WHERE external_id = p_payment_data->>'external_id') THEN
        RETURN json_build_object('success', true, 'status', 'already_processed');
    END IF;

    -- Get current state
    SELECT plan, extra_credits INTO v_current_plan, v_current_extra
    FROM public.users
    WHERE id = p_user_id;

    -- Calculate user updates
    v_next_reset := (CURRENT_DATE + interval '30 days')::date;

    INSERT INTO public.users (id, email, name, phone, plan, subscription_status, credits, extra_credits, next_credit_reset, updated_at)
    VALUES (
        p_user_id,
        p_email,
        p_name,
        p_phone,
        CASE WHEN p_is_credit_pack THEN COALESCE(v_current_plan, 'free') ELSE p_plan END,
        'active',
        CASE WHEN p_is_credit_pack THEN credits ELSE p_credits_to_set END, -- Use current credits if pack
        CASE WHEN p_is_credit_pack THEN COALESCE(v_current_extra, 0) + p_extra_credits_to_add ELSE COALESCE(v_current_extra, 0) END,
        v_next_reset,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name),
        phone = COALESCE(EXCLUDED.phone, public.users.phone),
        plan = EXCLUDED.plan,
        subscription_status = 'active',
        credits = EXCLUDED.credits,
        extra_credits = EXCLUDED.extra_credits,
        next_credit_reset = EXCLUDED.next_credit_reset,
        updated_at = NOW();

    -- Insert payment record
    INSERT INTO public.payments (
        user_id, user_email, amount, currency, platform, external_id, status, plan_id, 
        payment_method_id, payment_type_id, net_amount, fee_details, created_at
    )
    VALUES (
        p_user_id,
        p_email,
        (p_payment_data->>'amount')::decimal,
        p_payment_data->>'currency',
        p_payment_data->>'platform',
        p_payment_data->>'external_id',
        'approved',
        p_plan,
        p_payment_data->>'payment_method_id',
        p_payment_data->>'payment_type_id',
        (p_payment_data->>'net_amount')::decimal,
        p_payment_data->'fee_details',
        NOW()
    );

    RETURN json_build_object('success', true, 'status', 'completed');
END;
$$;
