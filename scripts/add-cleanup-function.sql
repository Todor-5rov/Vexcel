-- Add a stored procedure to clean up duplicate sessions
CREATE OR REPLACE FUNCTION cleanup_duplicate_sessions(target_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete duplicate sessions, keeping only the most recent one per user/file combination
  DELETE FROM chat_sessions 
  WHERE user_id = target_user_id
    AND id NOT IN (
      SELECT DISTINCT ON (user_id, file_id) id
      FROM chat_sessions 
      WHERE user_id = target_user_id
      ORDER BY user_id, file_id, created_at DESC
    );
    
  -- Update message counts for remaining sessions
  UPDATE chat_sessions 
  SET message_count = (
    SELECT COUNT(*) 
    FROM chat_messages 
    WHERE session_id = chat_sessions.id
  )
  WHERE user_id = target_user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_duplicate_sessions(UUID) TO authenticated;
