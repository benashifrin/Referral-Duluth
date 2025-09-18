-- Migration: Add generated_by_admin_id column to onboarding_token table
-- Date: 2025-09-18

-- Add the generated_by_admin_id column to track which admin generated each QR code
ALTER TABLE onboarding_token 
ADD COLUMN generated_by_admin_id INTEGER REFERENCES "user"(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_onboarding_token_generated_by_admin_id 
ON onboarding_token(generated_by_admin_id);

-- Optional: Add comment for documentation
COMMENT ON COLUMN onboarding_token.generated_by_admin_id 
IS 'ID of the admin user who generated this QR code token';