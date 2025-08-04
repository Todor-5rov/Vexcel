-- Add OneDrive integration columns to user_files table
ALTER TABLE user_files 
ADD COLUMN IF NOT EXISTS onedrive_file_id TEXT,
ADD COLUMN IF NOT EXISTS onedrive_web_url TEXT,
ADD COLUMN IF NOT EXISTS onedrive_embed_url TEXT,
ADD COLUMN IF NOT EXISTS onedrive_uploaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onedrive_folder_path TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_files_onedrive_file_id ON user_files(onedrive_file_id);
CREATE INDEX IF NOT EXISTS idx_user_files_onedrive_uploaded ON user_files(onedrive_uploaded_at);

-- Add comments to document the new columns
COMMENT ON COLUMN user_files.onedrive_file_id IS 'OneDrive file ID for accessing the file';
COMMENT ON COLUMN user_files.onedrive_web_url IS 'OneDrive web URL for direct access';
COMMENT ON COLUMN user_files.onedrive_embed_url IS 'OneDrive embed URL for iframe embedding';
COMMENT ON COLUMN user_files.onedrive_uploaded_at IS 'Timestamp when file was uploaded to OneDrive';
COMMENT ON COLUMN user_files.onedrive_folder_path IS 'OneDrive folder path where file is stored';

-- Update the database type definition (this is for reference, not executed)
-- You'll need to update the TypeScript types to match these new columns
