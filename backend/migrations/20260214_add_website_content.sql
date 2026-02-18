-- Add website content columns to empresas table for Deep Enrichment
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS website_title TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS website_description TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS website_content TEXT;

-- Add comments
COMMENT ON COLUMN empresas.website_title IS 'Title tag from the company website';
COMMENT ON COLUMN empresas.website_description IS 'Meta description from the company website';
COMMENT ON COLUMN empresas.website_content IS 'Truncated body text from the company website for AI analysis';
