-- Production Migration: Add generated_by_admin_id column
-- Run this SQL directly on your production PostgreSQL database

-- Check if column exists (informational query)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'onboarding_token' 
AND column_name = 'generated_by_admin_id';

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'onboarding_token' 
        AND column_name = 'generated_by_admin_id'
    ) THEN
        ALTER TABLE onboarding_token 
        ADD COLUMN generated_by_admin_id INTEGER REFERENCES "user"(id);
        
        CREATE INDEX IF NOT EXISTS idx_onboarding_token_generated_by_admin_id 
        ON onboarding_token(generated_by_admin_id);
        
        RAISE NOTICE 'Column generated_by_admin_id added successfully';
    ELSE
        RAISE NOTICE 'Column generated_by_admin_id already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'onboarding_token' 
AND column_name = 'generated_by_admin_id';