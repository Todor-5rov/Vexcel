-- Update chat_sessions table to store individual messages properly
ALTER TABLE chat_sessions 
DROP COLUMN IF EXISTS messages;

-- Add new columns for better chat management
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Create individual messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'suggestion', 'error')),
  voice_input BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_file_id ON chat_sessions(file_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at);

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own chat messages" ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own chat messages" ON chat_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    )
  );

-- Function to update chat session stats
CREATE OR REPLACE FUNCTION update_chat_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chat_sessions 
    SET 
      message_count = message_count + 1,
      last_message_at = NEW.created_at,
      updated_at = NEW.created_at,
      title = CASE 
        WHEN title IS NULL AND NEW.role = 'user' THEN 
          LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
        ELSE title 
      END
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chat_sessions 
    SET 
      message_count = GREATEST(message_count - 1, 0),
      updated_at = NOW()
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update chat session stats
DROP TRIGGER IF EXISTS trigger_update_chat_session_stats ON chat_messages;
CREATE TRIGGER trigger_update_chat_session_stats
  AFTER INSERT OR DELETE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_session_stats();

-- Add comment to document the new structure
COMMENT ON TABLE chat_messages IS 'Individual chat messages with voice input support';
COMMENT ON COLUMN chat_messages.voice_input IS 'Whether this message was created via voice input';
COMMENT ON COLUMN chat_sessions.title IS 'Auto-generated title from first user message';
COMMENT ON COLUMN chat_sessions.message_count IS 'Cached count of messages in this session';
