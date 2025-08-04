-- Add MCP filename column to user_files table
ALTER TABLE user_files 
ADD COLUMN IF NOT EXISTS mcp_filename TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_files_mcp_filename ON user_files(mcp_filename);

-- Add comment to document the column
COMMENT ON COLUMN user_files.mcp_filename IS 'Filename as stored on the MCP server for processing operations';
