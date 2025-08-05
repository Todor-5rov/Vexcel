-- Update the chat_messages table to have file_id instead of session_id
-- This assumes your current schema has the columns we discussed

-- First, let's see what we're working with
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- If you need to add file_id column (uncomment if needed):
-- ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES user_files(id) ON DELETE CASCADE;

-- If you need to add the foreign key constraint (uncomment if needed):
-- ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_file_id 
-- FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_file_id ON chat_messages(file_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_file ON chat_messages(user_id, file_id);

-- Update RLS policy for the new structure
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON chat_messages;
CREATE POLICY "Users can manage their own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON COLUMN chat_messages.file_id IS 'Direct reference to user_files table for file-based chat history';
