-- Emergency fix for infinite loop in chat sessions
-- This will clean up duplicate/corrupted data and fix the query logic

-- Step 1: Backup existing data (optional - comment out if not needed)
-- CREATE TABLE chat_sessions_backup AS SELECT * FROM chat_sessions;
-- CREATE TABLE chat_messages_backup AS SELECT * FROM chat_messages;

-- Step 2: Clean up duplicate chat sessions
-- Delete duplicate sessions, keeping only the most recent one per user/file combination
DELETE FROM chat_sessions 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, file_id) id
  FROM chat_sessions 
  ORDER BY user_id, file_id, created_at DESC
);

-- Step 3: Clean up orphaned chat messages (messages without valid sessions)
DELETE FROM chat_messages 
WHERE session_id NOT IN (
  SELECT id FROM chat_sessions
);

-- Step 4: Reset message counts to match actual message counts
UPDATE chat_sessions 
SET message_count = (
  SELECT COUNT(*) 
  FROM chat_messages 
  WHERE session_id = chat_sessions.id
);

-- Step 5: Update last_message_at to match the actual last message
UPDATE chat_sessions 
SET last_message_at = COALESCE(
  (
    SELECT MAX(created_at) 
    FROM chat_messages 
    WHERE session_id = chat_sessions.id
  ),
  chat_sessions.created_at
);

-- Step 6: Add unique constraint to prevent future duplicates
ALTER TABLE chat_sessions 
DROP CONSTRAINT IF EXISTS unique_user_file_session;

ALTER TABLE chat_sessions 
ADD CONSTRAINT unique_user_file_session 
UNIQUE (user_id, file_id);

-- Step 7: Clean up any sessions without valid file references
DELETE FROM chat_sessions 
WHERE file_id NOT IN (
  SELECT id FROM user_files
);

-- Step 8: Verify data integrity
-- Count remaining sessions per user/file (should be 1 or 0)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, file_id, COUNT(*) as session_count
        FROM chat_sessions 
        GROUP BY user_id, file_id 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'WARNING: Still have % duplicate session groups after cleanup', duplicate_count;
    ELSE
        RAISE NOTICE 'SUCCESS: No duplicate sessions found. Database is clean.';
    END IF;
END $$;

-- Step 9: Update statistics
ANALYZE chat_sessions;
ANALYZE chat_messages;

-- Add helpful comments
COMMENT ON CONSTRAINT unique_user_file_session ON chat_sessions IS 'Ensures only one chat session per user per file';
