-- AI Triggers Engine Migration
-- Created at 2026-02-20

CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL,
    condition_type VARCHAR(100) NOT NULL,
    condition_value JSONB NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_payload JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_user ON public.automation_rules(user_id);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own automation rules') THEN
        CREATE POLICY "Users can view own automation rules" ON public.automation_rules FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own automation rules') THEN
        CREATE POLICY "Users can insert own automation rules" ON public.automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own automation rules') THEN
        CREATE POLICY "Users can update own automation rules" ON public.automation_rules FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own automation rules') THEN
        CREATE POLICY "Users can delete own automation rules" ON public.automation_rules FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_payload JSONB,
    execution_status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_user ON public.automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON public.automation_logs(rule_id);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own automation logs') THEN
        CREATE POLICY "Users can view own automation logs" ON public.automation_logs FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;
