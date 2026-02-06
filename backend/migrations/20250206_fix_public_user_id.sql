-- Fix public_user_id column size
-- The current char(6) is too short for the generated ID (U + 6 random chars = 7 chars)

ALTER TABLE users ALTER COLUMN public_user_id TYPE VARCHAR(10);

-- Update the index if needed (should work with varchar as well)
-- No change needed for the index as varchar supports the same operations
