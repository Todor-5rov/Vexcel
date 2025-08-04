import { OneDriveService } from "./onedrive-service"
import { supabase } from "./supabase"

export interface SyncResult {
  success: boolean
  message: string
  embedUrlUpdated?: boolean
  newEmbedUrl?: string
}

export class FileSyncService {
  // 🔄 Sync local file TO OneDrive after MCP operations
  static async syncAfterMCPOperation(userId: string, filename: string, fileId?: string): Promise<SyncResult> {
    try {
      console.log("🔄 Syncing local file to OneDrive after MCP operation:", { userId, filename, fileId })

      // Step 1: Upload local file to OneDrive (overwrite existing)
      const syncResult = await OneDriveService.syncLocalToOneDrive(userId, filename, "excel-files")

      if (!syncResult.success) {
        return {
          success: false,
          message: `Failed to sync to OneDrive: ${syncResult.message}`,
        }
      }

      // Step 2: Update database with new embed URL if we have a file ID
      let embedUrlUpdated = false
      if (fileId && syncResult.embed_url) {
        try {
          const { error: updateError } = await supabase
            .from("user_files")
            .update({
              onedrive_embed_url: syncResult.embed_url,
              last_accessed: new Date().toISOString(),
            })
            .eq("id", fileId)
            .eq("user_id", userId)

          if (!updateError) {
            embedUrlUpdated = true
            console.log("✅ Database updated with new embed URL")
          } else {
            console.warn("⚠️ Failed to update database with new embed URL:", updateError)
          }
        } catch (dbError) {
          console.warn("⚠️ Database update error:", dbError)
        }
      }

      return {
        success: true,
        message: "File synced to OneDrive successfully",
        embedUrlUpdated,
        newEmbedUrl: syncResult.embed_url,
      }
    } catch (error) {
      console.error("❌ Sync after MCP operation failed:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Sync failed",
      }
    }
  }

  // 🔄 Sync OneDrive file TO local before MCP operations (optional)
  static async syncBeforeMCPOperation(userId: string, filename: string, oneDriveFileId?: string): Promise<SyncResult> {
    try {
      console.log("🔄 Syncing OneDrive file to local before MCP operation:", { userId, filename, oneDriveFileId })

      if (!oneDriveFileId) {
        return {
          success: false,
          message: "No OneDrive file ID available for sync",
        }
      }

      // Download latest version from OneDrive to local storage
      const syncResult = await OneDriveService.syncOneDriveToLocal(userId, oneDriveFileId, filename)

      if (!syncResult.success) {
        return {
          success: false,
          message: `Failed to sync from OneDrive: ${syncResult.message}`,
        }
      }

      return {
        success: true,
        message: "File synced from OneDrive successfully",
      }
    } catch (error) {
      console.error("❌ Sync before MCP operation failed:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Sync failed",
      }
    }
  }

  // 🔄 Complete sync workflow: OneDrive → Local → MCP Operation → Local → OneDrive
  static async performSyncedMCPOperation(
    userId: string,
    filename: string,
    mcpOperation: () => Promise<any>,
    options: {
      fileId?: string
      oneDriveFileId?: string
      syncFromOneDriveFirst?: boolean
    } = {},
  ): Promise<{ mcpResult: any; syncResult: SyncResult }> {
    try {
      console.log("🔄 Starting complete synced MCP operation:", { userId, filename, options })

      // Step 1: Optionally sync FROM OneDrive first (if user might have edited)
      if (options.syncFromOneDriveFirst && options.oneDriveFileId) {
        console.log("📥 Syncing from OneDrive first...")
        const preSyncResult = await this.syncBeforeMCPOperation(userId, filename, options.oneDriveFileId)
        if (!preSyncResult.success) {
          console.warn("⚠️ Pre-sync failed, continuing with local version:", preSyncResult.message)
        }
      }

      // Step 2: Perform MCP operation on local file
      console.log("🤖 Performing MCP operation...")
      const mcpResult = await mcpOperation()

      // Step 3: Sync changes back TO OneDrive
      console.log("📤 Syncing changes to OneDrive...")
      const postSyncResult = await this.syncAfterMCPOperation(userId, filename, options.fileId)

      return {
        mcpResult,
        syncResult: postSyncResult,
      }
    } catch (error) {
      console.error("❌ Complete synced MCP operation failed:", error)
      return {
        mcpResult: null,
        syncResult: {
          success: false,
          message: error instanceof Error ? error.message : "Synced operation failed",
        },
      }
    }
  }
}
