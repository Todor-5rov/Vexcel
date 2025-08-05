-- Run this query to verify your chat persistence setup is working
-- This will show you the structure and test data

-- 1. Check if all tables exist and their structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('user_files', 'chat_sessions', 'chat_messages')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Check foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('chat_sessions', 'chat_messages');

-- 3. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('user_files', 'chat_sessions', 'chat_messages');

-- 4. Test data counts (will be 0 initially)
SELECT 
    'user_files' as table_name, 
    COUNT(*) as row_count 
FROM user_files
UNION ALL
SELECT 
    'chat_sessions' as table_name, 
    COUNT(*) as row_count 
FROM chat_sessions
UNION ALL
SELECT 
    'chat_messages' as table_name, 
    COUNT(*) as row_count 
FROM chat_messages;
