'use client'

import { useState } from 'react'
import { FileUpload } from './file-upload'
import { ExcelViewer } from './excel-viewer'
import { ChatInterface } from './chat-interface'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileSpreadsheet, MessageSquare, BarChart3 } from 'lucide-react'
import { type ParsedExcelData } from '@/lib/excel-parser'

interface DashboardProps {
  userId?: string
}

export function Dashboard({ userId }: DashboardProps) {
  const [excelData, setExcelData] = useState<ParsedExcelData | null>(null)

  const handleFileUploaded = (data: ParsedExcelData) => {
    setExcelData(data)
  }

  if (!excelData) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">VExcel - AI-Powered Excel Assistant</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Upload your Excel file and start analyzing your data with AI
          </p>
        </div>
        
        <FileUpload onFileUploaded={handleFileUploaded} />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Smart Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Upload your Excel files and get instant insights powered by AI
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Natural Language
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Ask questions about your data in plain English and get intelligent responses
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Data Visualization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Generate charts and visualizations to better understand your data
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">VExcel Dashboard</h1>
        <p className="text-muted-foreground">
          Analyzing: {excelData.fileName} ({excelData.data.length} rows, {excelData.headers.length} columns)
        </p>
      </div>

      <Tabs defaultValue="data" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="data" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Data View
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 mt-4">
          <TabsContent value="data" className="h-full">
            <ExcelViewer
              data={excelData.data}
              headers={excelData.headers}
              fileName={excelData.fileName}
            />
          </TabsContent>

          <TabsContent value="chat" className="h-full">
            <ChatInterface
              currentData={excelData.data}
              headers={excelData.headers}
              fileName={excelData.fileName}
              userId={userId || 'anonymous'}
            />
          </TabsContent>

          <TabsContent value="insights" className="h-full">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Data Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced insights and visualizations coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
