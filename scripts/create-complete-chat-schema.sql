-- Create the complete chat schema from scratch
-- This will work regardless of what currently exists

-- 1. Create chat_messages table with all required columns
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES user_files(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'suggestion', 'error')),
  voice_input BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_file_id ON chat_messages(file_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_file ON chat_messages(user_id, file_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policy
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON chat_messages;
CREATE POLICY "Users can manage their own chat messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

-- 5. Add helpful comments
COMMENT ON TABLE chat_messages IS 'Chat messages directly linked to files for persistent chat history';
COMMENT ON COLUMN chat_messages.user_id IS 'User who sent the message';
COMMENT ON COLUMN chat_messages.file_id IS 'File this message relates to';
COMMENT ON COLUMN chat_messages.voice_input IS 'Whether this message was created via voice input';
COMMENT ON COLUMN chat_messages.message_type IS 'Type of message: normal, suggestion, or error';

-- 6. Verify the final structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
    AND table_schema = 'public'
ORDER BY ordinal_position;
