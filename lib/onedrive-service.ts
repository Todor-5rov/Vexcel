export interface OneDriveFile {
  filename: string
  file_id: string
  web_url: string
  embed_url?: string
  size_bytes: number
  created_datetime: string
  last_modified_datetime?: string
  folder_path?: string
}

export interface OneDriveUploadResponse {
  message: string
  filename: string
  user_id: string
  onedrive_file_id: string
  onedrive_web_url: string
  embed_url: string // Read-only embed URL
  folder_path: string
  size_bytes: number
  created_datetime: string
  last_modified_datetime?: string
}

export interface OneDriveStatus {
  enabled: boolean
  account_type: string
  folder_name: string
  message: string
}

export interface SyncResponse {
  success: boolean
  message: string
  embed_url?: string
  file_id?: string
  size_bytes?: number
  last_modified?: string
}

export class OneDriveService {
  private static readonly BASE_URL = "https://vexcelmcp.onrender.com"

  // Log all OneDrive interactions for debugging
  private static logOneDriveInteraction(action: string, data: any) {
    console.log(`[OneDrive ${action}]`, {
      timestamp: new Date().toISOString(),
      action,
      data,
      server_url: this.BASE_URL,
    })
  }

  // Check OneDrive integration status
  static async checkStatus(): Promise<{ enabled: boolean }> {
    try {
      const response = await fetch(`${this.BASE_URL}/onedrive/status`)
      if (!response.ok) {
        throw new Error(`OneDrive status check failed: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error("OneDrive status check failed:", error)
      return { enabled: false }
    }
  }

  // Upload Excel file to OneDrive with read-only embed permissions
  static async uploadFile(
    file: File,
    userId: string,
    folderPath?: string,
    allowEdit = false, // Default to read-only
  ): Promise<OneDriveUploadResponse> {
    try {
      this.logOneDriveInteraction("upload_start", {
        fileName: file.name,
        size: file.size,
        userId,
        folderPath,
        allowEdit,
      })

      const formData = new FormData()
      formData.append("file", file)
      if (folderPath) {
        formData.append("folder_path", folderPath)
      }
      formData.append("allow_edit", allowEdit.toString())

      const response = await fetch(`${this.BASE_URL}/onedrive/upload/${userId}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OneDrive upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // CRITICAL: Ensure embed_url is not HTML-encoded
      if (result.embed_url) {
        result.embed_url = result.embed_url.replace(/&amp;/g, "&")
        console.log("OneDrive embed URL (cleaned):", result.embed_url)
      }

      this.logOneDriveInteraction("upload_success", result)
      return result
    } catch (error) {
      this.logOneDriveInteraction("upload_error", { error: error instanceof Error ? error.message : "Unknown error" })
      throw error
    }
  }

  // List user files on OneDrive
  static async listFiles(userId: string, folderPath?: string): Promise<OneDriveFile[]> {
    try {
      this.logOneDriveInteraction("list_files_start", { userId, folderPath })

      const url = new URL(`${this.BASE_URL}/onedrive/files/${userId}`)
      if (folderPath) {
        url.searchParams.set("folder_path", folderPath)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        if (response.status === 404) {
          // User has no files yet
          return []
        }
        throw new Error(`Failed to list OneDrive files: ${response.status}`)
      }

      const result = await response.json()

      // CRITICAL: Clean embed URLs in file list
      if (result.files && Array.isArray(result.files)) {
        result.files = result.files.map((file: OneDriveFile) => ({
          ...file,
          embed_url: file.embed_url ? file.embed_url.replace(/&amp;/g, "&") : file.embed_url,
        }))
      }

      this.logOneDriveInteraction("list_files_success", { count: result.files?.length || 0 })
      return result.files || []
    } catch (error) {
      this.logOneDriveInteraction("list_files_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      throw error
    }
  }

  // Get embed URL for existing file with read-only permissions
  static async getEmbedUrl(fileId: string, allowEdit = false): Promise<{ embed_url: string }> {
    try {
      this.logOneDriveInteraction("get_embed_url_start", { fileId, allowEdit })

      const response = await fetch(`${this.BASE_URL}/onedrive/embed/${fileId}?allow_edit=${allowEdit}`)
      if (!response.ok) {
        throw new Error(`Failed to get embed URL: ${response.status}`)
      }

      const result = await response.json()

      // CRITICAL: Ensure embed_url is not HTML-encoded
      if (result.embed_url) {
        result.embed_url = result.embed_url.replace(/&amp;/g, "&")
        console.log("OneDrive embed URL (cleaned):", result.embed_url)
      }

      this.logOneDriveInteraction("get_embed_url_success", result)
      return result
    } catch (error) {
      this.logOneDriveInteraction("get_embed_url_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      throw error
    }
  }

  // 🔄 NEW: Sync local file TO OneDrive (after MCP operations)
  static async syncLocalToOneDrive(userId: string, filename: string, folderPath?: string): Promise<SyncResponse> {
    try {
      this.logOneDriveInteraction("sync_local_to_onedrive_start", { userId, filename, folderPath })

      const formData = new FormData()
      if (folderPath) {
        formData.append("folder_path", folderPath)
      }

      const response = await fetch(`${this.BASE_URL}/onedrive/upload-local/${userId}/${filename}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Sync to OneDrive failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // Clean embed URL
      if (result.embed_url) {
        result.embed_url = result.embed_url.replace(/&amp;/g, "&")
      }

      this.logOneDriveInteraction("sync_local_to_onedrive_success", result)
      return {
        success: true,
        message: result.message || "File synced to OneDrive successfully",
        embed_url: result.embed_url,
        file_id: result.onedrive_file_id,
        size_bytes: result.size_bytes,
        last_modified: result.last_modified_datetime,
      }
    } catch (error) {
      this.logOneDriveInteraction("sync_local_to_onedrive_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return {
        success: false,
        message: error instanceof Error ? error.message : "Sync to OneDrive failed",
      }
    }
  }

  // 🔄 NEW: Sync OneDrive file TO local (before MCP operations)
  static async syncOneDriveToLocal(userId: string, fileId: string, filename: string): Promise<SyncResponse> {
    try {
      this.logOneDriveInteraction("sync_onedrive_to_local_start", { userId, fileId, filename })

      const formData = new FormData()
      formData.append("filename", filename)

      const response = await fetch(`${this.BASE_URL}/onedrive/download-to-local/${userId}/${fileId}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Sync from OneDrive failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      this.logOneDriveInteraction("sync_onedrive_to_local_success", result)
      return {
        success: true,
        message: result.message || "File synced from OneDrive successfully",
        size_bytes: result.size_bytes,
        last_modified: result.last_modified,
      }
    } catch (error) {
      this.logOneDriveInteraction("sync_onedrive_to_local_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      return {
        success: false,
        message: error instanceof Error ? error.message : "Sync from OneDrive failed",
      }
    }
  }

  // Upload local file from MCP server to OneDrive (legacy method - use syncLocalToOneDrive instead)
  static async uploadLocalFile(userId: string, filename: string, folderPath?: string): Promise<OneDriveUploadResponse> {
    try {
      this.logOneDriveInteraction("upload_local_start", { userId, filename, folderPath })

      const formData = new FormData()
      if (folderPath) {
        formData.append("folder_path", folderPath)
      }

      const response = await fetch(`${this.BASE_URL}/onedrive/upload-local/${userId}/${filename}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OneDrive local upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      // CRITICAL: Ensure embed_url is not HTML-encoded
      if (result.embed_url) {
        result.embed_url = result.embed_url.replace(/&amp;/g, "&")
        console.log("OneDrive embed URL (cleaned):", result.embed_url)
      }

      this.logOneDriveInteraction("upload_local_success", result)
      return result
    } catch (error) {
      this.logOneDriveInteraction("upload_local_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      throw error
    }
  }
}
