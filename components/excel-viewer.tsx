"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Download, RefreshCw, AlertCircle } from "lucide-react"
import { ExcelParser } from "@/lib/excel-parser"

interface ExcelViewerProps {
  fileId: string
  onDataChange: (data: string[][]) => void
  refreshTrigger?: number
  mcpFilePath?: string // Use MCP file path instead of userId
}

export default function ExcelViewer({ fileId, onDataChange, refreshTrigger, mcpFilePath }: ExcelViewerProps) {
  const [data, setData] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")

  useEffect(() => {
    if (fileId) {
      loadDataFromMCP()
    }
  }, [fileId])

  // Add effect to handle refresh trigger
  useEffect(() => {
    if (fileId && refreshTrigger && refreshTrigger > 0) {
      loadDataFromMCP()
    }
  }, [refreshTrigger])

  const loadFile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get file info from database
      const { data: fileInfo, error: fileError } = await supabase
        .from("user_files")
        .select("file_name, file_path")
        .eq("id", fileId)
        .single()

      if (fileError) throw fileError

      setFileName(fileInfo.file_name)

      // Download file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("excel-files")
        .download(fileInfo.file_path)

      if (downloadError) throw downloadError

      // Parse the Excel file
      const file = new File([fileData], fileInfo.file_name, {
        type: getFileType(fileInfo.file_name),
      })
      const parsedData = await ExcelParser.parseFile(file)
      setData(parsedData.data)
      onDataChange(parsedData.data)
    } catch (error) {
      console.error("Error loading file:", error)
      setError(error instanceof Error ? error.message : "Failed to load file")
    } finally {
      setLoading(false)
    }
  }

  const loadDataFromMCP = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the file info from database
      const { data: fileInfo, error: fileError } = await supabase
        .from("user_files")
        .select("mcp_file_path, file_name")
        .eq("id", fileId)
        .single()

      if (fileError) throw fileError

      const filePath = mcpFilePath || fileInfo.mcp_file_path
      if (!filePath) {
        throw new Error("File not found on processing server")
      }

      setFileName(fileInfo.file_name)

      // Fetch data from MCP server using a read operation
      const response = await fetch("/api/ai/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: `Read and display the contents of the Excel file at path "${filePath}" as a table`,
          currentData: [],
          headers: [],
          mcpFilePath: filePath, // Use the full MCP file path
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to load file data from server")
      }

      const result = await response.json()

      // For now, we'll show a message that the file is ready for processing
      // The actual data viewing will be handled by the AI chat
      setData([["File loaded successfully"], [`MCP Path: ${filePath}`], ["Use the chat to view and manipulate data"]])
      onDataChange([
        ["File loaded successfully"],
        [`MCP Path: ${filePath}`],
        ["Use the chat to view and manipulate data"],
      ])
    } catch (error) {
      console.error("Error loading file from MCP:", error)
      setError(error instanceof Error ? error.message : "Failed to load file")
    } finally {
      setLoading(false)
    }
  }

  const getFileType = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "csv":
        return "text/csv"
      case "xls":
        return "application/vnd.ms-excel"
      case "xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      default:
        return "application/octet-stream"
    }
  }

  const downloadFile = async () => {
    try {
      const { data: fileInfo, error: fileError } = await supabase
        .from("user_files")
        .select("file_path, file_name")
        .eq("id", fileId)
        .single()

      if (fileError) throw fileError

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("excel-files")
        .download(fileInfo.file_path)

      if (downloadError) throw downloadError

      // Create download link
      const url = URL.createObjectURL(fileData)
      const a = document.createElement("a")
      a.href = url
      a.download = fileInfo.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading file:", error)
    }
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading file...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadFile} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {fileName}
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={loadDataFromMCP} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={downloadFile} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
        {data.length > 0 && (
          <p className="text-sm text-gray-600">
            {data.length - 1} rows × {data[0]?.length || 0} columns
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-auto border rounded-lg m-6">
          {data.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {data[0].map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-2 text-left font-medium text-gray-900 border-b border-r border-gray-200 min-w-[120px]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2 border-b border-r border-gray-200 text-gray-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No data to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
