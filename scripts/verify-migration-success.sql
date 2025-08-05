-- Verify that the migration was successful

-- 1. Check the new table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check foreign key constraints
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'chat_messages';

-- 3. Verify data integrity - all messages should have user_id and file_id
SELECT 
    'Data integrity check' as check_type,
    COUNT(*) as total_messages,
    COUNT(user_id) as with_user_id,
    COUNT(file_id) as with_file_id,
    COUNT(session_id) as with_session_id,
    CASE 
        WHEN COUNT(*) = COUNT(user_id) AND COUNT(*) = COUNT(file_id) 
        THEN '✅ All messages have required fields'
        ELSE '❌ Some messages missing required fields'
    END as status
FROM chat_messages;

-- 4. Test a sample query that the app will use
SELECT 
    cm.id,
    cm.role,
    cm.content,
    cm.user_id,
    cm.file_id,
    uf.file_name,
    cm.created_at
FROM chat_messages cm
JOIN user_files uf ON cm.file_id = uf.id
ORDER BY cm.created_at DESC
LIMIT 5;

-- 5. Check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'chat_messages';
