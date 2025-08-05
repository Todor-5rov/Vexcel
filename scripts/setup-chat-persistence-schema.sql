-- First, let's ensure we have the correct schema for all three tables

-- 1. USER_FILES table (should already exist, but let's verify structure)
CREATE TABLE IF NOT EXISTS user_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mcp_filename TEXT,
  mcp_file_path TEXT,
  onedrive_file_id TEXT,
  onedrive_web_url TEXT,
  onedrive_embed_url TEXT,
  onedrive_uploaded_at TIMESTAMP WITH TIME ZONE,
  onedrive_folder_path TEXT
);

-- 2. CHAT_SESSIONS table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_id UUID REFERENCES user_files(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CHAT_MESSAGES table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'normal' CHECK (message_type IN ('normal', 'suggestion', 'error')),
  voice_input BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_mcp_file_path ON user_files(mcp_file_path);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_file_id ON chat_sessions(file_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_files
DROP POLICY IF EXISTS "Users can manage their own files" ON user_files;
CREATE POLICY "Users can manage their own files" ON user_files
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for chat_sessions
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can manage their own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON chat_messages;
CREATE POLICY "Users can manage their own chat messages" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    )
  );

-- Function to update chat session stats when messages are added/removed
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

-- Add helpful comments
COMMENT ON TABLE chat_sessions IS 'Chat sessions linking users to files with metadata';
COMMENT ON TABLE chat_messages IS 'Individual chat messages with voice input support';
COMMENT ON COLUMN chat_messages.voice_input IS 'Whether this message was created via voice input';
COMMENT ON COLUMN chat_sessions.title IS 'Auto-generated title from first user message';
COMMENT ON COLUMN chat_sessions.message_count IS 'Cached count of messages in this session';
