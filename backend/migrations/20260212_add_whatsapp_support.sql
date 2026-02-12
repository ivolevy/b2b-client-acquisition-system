-- Migración para soportar WhatsApp y estados dinámicos
ALTER TABLE public.email_conversations ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'email';
ALTER TABLE public.email_conversations ADD COLUMN IF NOT EXISTS lead_phone TEXT;
ALTER TABLE public.email_conversations ALTER COLUMN lead_email DROP NOT NULL;

-- Actualizar constraint de status para permitir nuevos estados del Pipeline
ALTER TABLE public.email_conversations DROP CONSTRAINT IF EXISTS email_conversations_status_check;
ALTER TABLE public.email_conversations ADD CONSTRAINT email_conversations_status_check 
    CHECK (status IN ('open', 'closed', 'archived', 'waiting_reply', 'replied', 'interested', 'no_reply'));

-- Soporte para mensajes de WhatsApp en email_messages
ALTER TABLE public.email_messages ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'email';
ALTER TABLE public.email_messages ALTER COLUMN sender_email DROP NOT NULL;
ALTER TABLE public.email_messages ALTER COLUMN recipient_email DROP NOT NULL;
ALTER TABLE public.email_messages ADD COLUMN IF NOT EXISTS sender_phone TEXT;
ALTER TABLE public.email_messages ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
