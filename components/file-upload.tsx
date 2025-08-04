'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react'
import { ExcelParser, type ParsedExcelData } from '@/lib/excel-parser'
import { formatFileSize } from '@/lib/utils'

interface FileUploadProps {
  onFileUploaded: (data: ParsedExcelData) => void
  maxFileSize?: number
}

export function FileUpload({ onFileUploaded, maxFileSize = 10 * 1024 * 1024 }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)
    setUploadedFile(file)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      const parsedData = await ExcelParser.parseFile(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setTimeout(() => {
        onFileUploaded(parsedData)
        setIsUploading(false)
      }, 500)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload file')
      setIsUploading(false)
      setUploadProgress(0)
      setUploadedFile(null)
    }
  }, [onFileUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    maxSize: maxFileSize,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${formatFileSize(maxFileSize)}`)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file.')
      } else {
        setError('Failed to upload file. Please try again.')
      }
    }
  })

  const clearFile = () => {
    setUploadedFile(null)
    setError(null)
    setUploadProgress(0)
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {isDragActive ? 'Drop your file here' : 'Upload Excel File'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop your Excel file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports .xlsx, .xls, and .csv files up to {formatFileSize(maxFileSize)}
                </p>
              </div>
              
              {!isDragActive && (
                <Button variant="outline" disabled={isUploading}>
                  Choose File
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
              {isUploading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-24">
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {uploadProgress}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
