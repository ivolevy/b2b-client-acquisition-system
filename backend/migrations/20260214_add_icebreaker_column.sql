-- Add icebreaker column to empresas table (leads)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS icebreaker TEXT;

-- Add comment
COMMENT ON COLUMN empresas.icebreaker IS 'AI-generated personalized opening line based on lead data';
