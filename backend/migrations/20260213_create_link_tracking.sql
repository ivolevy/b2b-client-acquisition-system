-- Tabla para trackear clicks en enlaces de WhatsApp/Email
CREATE TABLE IF NOT EXISTS link_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    lead_id TEXT, -- Opcional: ID de la empresa/lead
    conversation_id UUID REFERENCES email_conversations(id) ON DELETE SET NULL,
    clicks INTEGER DEFAULT 0,
    last_click_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexar para búsquedas rápidas por slug
CREATE INDEX IF NOT EXISTS idx_link_tracking_slug ON link_tracking(slug);

-- RLS
ALTER TABLE link_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tracking" 
ON link_tracking FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracking" 
ON link_tracking FOR INSERT 
WITH CHECK (auth.uid() = user_id);
