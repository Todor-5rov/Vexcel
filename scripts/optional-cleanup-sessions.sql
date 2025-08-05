-- OPTIONAL: Run this ONLY after confirming everything works
-- This will clean up the old session-based structure

-- First, let's see what we have
SELECT 
    'chat_sessions' as table_name, 
    COUNT(*) as row_count 
FROM chat_sessions
UNION ALL
SELECT 
    'chat_messages' as table_name, 
    COUNT(*) as row_count 
FROM chat_messages;

-- Show the relationship between sessions and messages
SELECT 
    cs.id as session_id,
    cs.user_id,
    cs.file_id,
    uf.file_name,
    COUNT(cm.id) as message_count
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
LEFT JOIN user_files uf ON cs.file_id = uf.id
GROUP BY cs.id, cs.user_id, cs.file_id, uf.file_name
ORDER BY cs.created_at DESC;

-- UNCOMMENT THESE LINES ONLY AFTER TESTING THE NEW STRUCTURE:
-- Remove the session_id column from chat_messages (no longer needed)
-- ALTER TABLE chat_messages DROP COLUMN session_id;

-- Optionally remove the chat_sessions table entirely
-- DROP TABLE chat_sessions CASCADE;

-- Verify final structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'chat_messages' ORDER BY ordinal_position;
