-- Fix the user_files table schema
ALTER TABLE user_files 
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have uploaded_at if they don't
UPDATE user_files 
SET uploaded_at = created_at 
WHERE uploaded_at IS NULL AND created_at IS NOT NULL;

-- If created_at doesn't exist either, use current timestamp
UPDATE user_files 
SET uploaded_at = NOW() 
WHERE uploaded_at IS NULL;

-- Also ensure we have all the columns we need
ALTER TABLE user_files 
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the chat_sessions table to ensure it has the right columns
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
