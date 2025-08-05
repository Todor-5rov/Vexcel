export interface ExcelFile {
  filename: string
  relative_path: string
  size_bytes: number
  modified?: number
}

export interface MCPResponse {
  output_text?: string
  output?: Array<{
    type: string
    text?: string
    name?: string
    result?: any
  }>
  response?: string
  fileModified?: boolean
}

export interface ExcelData {
  headers: string[]
  rows: string[][]
  totalRows: number
  totalColumns: number
  filename: string
}

export class ExcelMCPService {
  private static readonly BASE_URL = "https://vexcelmcp.onrender.com"
  private static readonly MCP_URL = `${this.BASE_URL}/mcp`

  // Log all MCP interactions for debugging
  private static logMCPInteraction(action: string, data: any) {
    console.log(`[MCP ${action}]`, {
      timestamp: new Date().toISOString(),
      action,
      data,
      server_url: this.BASE_URL,
    })
  }

  // Check server health before operations
  static async checkServerHealth(): Promise<boolean> {
    try {
      console.log("Checking Excel MCP server health...")
      const response = await fetch(`${this.BASE_URL}/health`)
      if (response.ok) {
        const health = await response.json()
        console.log("Server health:", health)
        return health.status === "healthy"
      } else {
        console.error("Server health check failed:", response.status)
        return false
      }
    } catch (error) {
      console.error("Health check error:", error)
      return false
    }
  }

  // Upload Excel file to the MCP server
  static async uploadFile(file: File, userId: string): Promise<ExcelFile> {
    try {
      this.logMCPInteraction("upload_start", { fileName: file.name, size: file.size, userId })

      // Check server health first
      if (!(await this.checkServerHealth())) {
        throw new Error("Excel MCP server is not available")
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append('allow_edit', 'true')
      const response = await fetch(`${this.BASE_URL}/upload/${userId}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      this.logMCPInteraction("upload_success", result)

      return {
        filename: result.filename,
        relative_path: result.file_path,
        size_bytes: result.size_bytes,
      }
    } catch (error) {
      this.logMCPInteraction("upload_error", { error: error instanceof Error ? error.message : "Unknown error" })
      throw error
    }
  }

  // List available files on the MCP server
  static async listFiles(userId: string): Promise<ExcelFile[]> {
    try {
      this.logMCPInteraction("list_files_start", { userId })

      const response = await fetch(`${this.BASE_URL}/files/${userId}`)
      if (!response.ok) {
        if (response.status === 404) {
          // User has no files yet
          return []
        }
        throw new Error(`Failed to list files: ${response.status}`)
      }

      const result = await response.json()
      this.logMCPInteraction("list_files_success", { count: result.files?.length || 0 })
      return result.files || []
    } catch (error) {
      this.logMCPInteraction("list_files_error", { error: error instanceof Error ? error.message : "Unknown error" })
      throw error
    }
  }

  // Download Excel file from the MCP server
  static async downloadFile(userId: string, filename: string): Promise<Blob> {
    try {
      this.logMCPInteraction("download_start", { userId, filename })

      const response = await fetch(`${this.BASE_URL}/download/${userId}/${filename}`, {
        method: "GET",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Download failed: ${response.status} - ${errorText}`)
      }

      const blob = await response.blob()
      this.logMCPInteraction("download_success", { size: blob.size })

      return blob
    } catch (error) {
      this.logMCPInteraction("download_error", { error: error instanceof Error ? error.message : "Unknown error" })
      throw error
    }
  }

  // Delete file from MCP server
  static async deleteFile(userId: string, filename: string): Promise<void> {
    try {
      this.logMCPInteraction("delete_start", { userId, filename })

      const response = await fetch(`${this.BASE_URL}/files/${userId}/${filename}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`)
      }

      const result = await response.json()
      this.logMCPInteraction("delete_success", result)
    } catch (error) {
      this.logMCPInteraction("delete_error", { error: error instanceof Error ? error.message : "Unknown error" })
      throw error
    }
  }

  // NEW: Get Excel data from MCP server
  static async getExcelData(userId: string, filename: string): Promise<ExcelData> {
    try {
      this.logMCPInteraction("get_excel_data_start", { userId, filename })

      const response = await fetch(`${this.BASE_URL}/excel-data/${userId}/${filename}`)

      if (!response.ok) {
        throw new Error(`Failed to get Excel data: ${response.status}`)
      }

      const result = await response.json()
      this.logMCPInteraction("get_excel_data_success", {
        rows: result.rows?.length || 0,
        columns: result.headers?.length || 0,
      })

      return {
        headers: result.headers || [],
        rows: result.rows || [],
        totalRows: result.total_rows || 0,
        totalColumns: result.total_columns || 0,
        filename: filename,
      }
    } catch (error) {
      this.logMCPInteraction("get_excel_data_error", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      throw error
    }
  }

  // Make MCP call through OpenAI with your server
  static async callMCP(input: string, mcpFilePath?: string): Promise<MCPResponse> {
    try {
      this.logMCPInteraction("mcp_call_start", { input, mcpFilePath })

      // Check server health first
      if (!(await this.checkServerHealth())) {
        throw new Error("Excel MCP server is not available")
      }

      const response = await fetch("/api/ai/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: input,
          currentData: [],
          headers: [],
          mcpFilePath: mcpFilePath || "",
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`MCP call failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      this.logMCPInteraction("mcp_call_success", {
        response: result.response,
        fileModified: result.fileModified,
      })

      return {
        response: result.response,
        fileModified: result.fileModified || false,
      }
    } catch (error) {
      this.logMCPInteraction("mcp_call_error", { error: error instanceof Error ? error.message : "Unknown error" })
      throw error
    }
  }
}
