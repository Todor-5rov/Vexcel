-- Add user_id and file_id columns to chat_messages table
-- These will be populated from the existing chat_sessions relationships

-- 1. Add the new columns (nullable initially)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS file_id UUID;

-- 2. Populate the new columns from existing chat_sessions data
UPDATE chat_messages 
SET 
    user_id = cs.user_id,
    file_id = cs.file_id
FROM chat_sessions cs
WHERE chat_messages.session_id = cs.id
    AND (chat_messages.user_id IS NULL OR chat_messages.file_id IS NULL);

-- 3. Now make them NOT NULL and add foreign key constraints
ALTER TABLE chat_messages 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN file_id SET NOT NULL;

-- 4. Add foreign key constraints
ALTER TABLE chat_messages 
ADD CONSTRAINT fk_chat_messages_user_id 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_chat_messages_file_id 
    FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_file_id ON chat_messages(file_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_file ON chat_messages(user_id, file_id);

-- 6. Update RLS policy to use the direct user_id column
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON chat_messages;

-- Create a single comprehensive policy
CREATE POLICY "Users can manage their own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- 7. Add helpful comments
COMMENT ON COLUMN chat_messages.user_id IS 'Direct reference to user (duplicated from session for performance)';
COMMENT ON COLUMN chat_messages.file_id IS 'Direct reference to file (duplicated from session for performance)';

-- 8. Verify the migration worked
SELECT 
    COUNT(*) as total_messages,
    COUNT(user_id) as messages_with_user_id,
    COUNT(file_id) as messages_with_file_id,
    COUNT(session_id) as messages_with_session_id
FROM chat_messages;
