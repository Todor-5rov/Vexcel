-- Update the user_files table to store the full MCP file path
ALTER TABLE user_files 
ADD COLUMN IF NOT EXISTS mcp_file_path TEXT;

-- Update existing records to have the proper file path format
UPDATE user_files 
SET mcp_file_path = user_id || '/' || mcp_filename 
WHERE mcp_filename IS NOT NULL AND mcp_file_path IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_files_mcp_file_path ON user_files(mcp_file_path);

-- Add comment to document the column
COMMENT ON COLUMN user_files.mcp_file_path IS 'Full file path on MCP server in format: user_id/filename.xlsx';
