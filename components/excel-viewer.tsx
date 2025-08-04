'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Download, Filter, SortAsc, SortDesc } from 'lucide-react'
import { ExcelParser } from '@/lib/excel-parser'

interface ExcelViewerProps {
  data: any[][]
  headers: string[]
  fileName: string
}

export function ExcelViewer({ data, headers, fileName }: ExcelViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 50

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter(row =>
        row.some(cell =>
          String(cell || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply sorting
    if (sortColumn !== null) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn] || ''
        const bVal = b[sortColumn] || ''
        
        // Try to parse as numbers
        const aNum = parseFloat(aVal)
        const bNum = parseFloat(bVal)
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
        }
        
        // String comparison
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr)
        } else {
          return bStr.localeCompare(aStr)
        }
      })
    }

    return filtered
  }, [data, searchTerm, sortColumn, sortDirection])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    return processedData.slice(startIndex, startIndex + rowsPerPage)
  }, [processedData, currentPage])

  const totalPages = Math.ceil(processedData.length / rowsPerPage)

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnIndex)
      setSortDirection('asc')
    }
  }

  const handleExport = () => {
    ExcelParser.exportToExcel(processedData, headers, fileName)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{fileName}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                {processedData.length} rows
              </Badge>
              <Badge variant="secondary">
                {headers.length} columns
              </Badge>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        
        <div className="flex items-center space-x-2 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead
                    key={index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort(index)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{header}</span>
                      {sortColumn === index && (
                        sortDirection === 'asc' ? (
                          <SortAsc className="h-4 w-4" />
                        ) : (
                          <SortDesc className="h-4 w-4" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="max-w-xs truncate">
                      {String(cell || '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, processedData.length)} of {processedData.length} rows
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
