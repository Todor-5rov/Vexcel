-- OPTIONAL: Run this AFTER confirming the new structure works
-- This will clean up the old session-based structure

-- First, verify that all messages now have file_id
SELECT 
    COUNT(*) as total_messages,
    COUNT(file_id) as messages_with_file_id,
    COUNT(session_id) as messages_with_session_id
FROM chat_messages;

-- If all messages have file_id, you can optionally remove session_id column
-- UNCOMMENT THESE LINES ONLY AFTER TESTING:

-- ALTER TABLE chat_messages DROP COLUMN IF EXISTS session_id;
-- DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Verify final structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
    AND table_schema = 'public'
ORDER BY ordinal_position;
