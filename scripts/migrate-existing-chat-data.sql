-- OPTIONAL: If you have existing chat data in a different structure, run this
-- This script will safely migrate data from the old structure to the new one

-- First, let's see if we have any existing data to migrate
SELECT 
    'chat_sessions' as table_name, 
    COUNT(*) as row_count 
FROM chat_sessions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions')
UNION ALL
SELECT 
    'chat_messages' as table_name, 
    COUNT(*) as row_count 
FROM chat_messages
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages');

-- If you have existing messages with session_id but no user_id/file_id, 
-- this will populate them from the session data:
-- UNCOMMENT AND RUN ONLY IF YOU HAVE EXISTING DATA TO MIGRATE:

/*
UPDATE chat_messages 
SET 
    user_id = cs.user_id,
    file_id = cs.file_id
FROM chat_sessions cs
WHERE chat_messages.session_id = cs.id
    AND (chat_messages.user_id IS NULL OR chat_messages.file_id IS NULL);
*/

-- Clean up any messages that couldn't be linked to files
-- DELETE FROM chat_messages WHERE user_id IS NULL OR file_id IS NULL;
