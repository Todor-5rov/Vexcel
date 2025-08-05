-- Add file_id column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN file_id UUID REFERENCES user_files(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_file_id ON chat_messages(file_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_file ON chat_messages(user_id, file_id);

-- If you have existing chat_messages with session_id, we need to populate file_id
-- This will link existing messages to their files through the session
UPDATE chat_messages 
SET file_id = cs.file_id
FROM chat_sessions cs
WHERE chat_messages.session_id = cs.id
AND chat_messages.file_id IS NULL;

-- Now we can make file_id NOT NULL since all messages should have a file
ALTER TABLE chat_messages 
ALTER COLUMN file_id SET NOT NULL;

-- Update RLS policy for the new structure
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON chat_messages;
CREATE POLICY "Users can manage their own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON COLUMN chat_messages.file_id IS 'Direct reference to user_files table for file-based chat history';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;
