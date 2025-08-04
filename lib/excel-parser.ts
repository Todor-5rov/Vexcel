import * as XLSX from 'xlsx'

export interface ParsedExcelData {
  data: any[][]
  headers: string[]
  sheetNames: string[]
  fileName: string
}

export class ExcelParser {
  static async parseFile(file: File): Promise<ParsedExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Get the first sheet
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length === 0) {
            reject(new Error('No data found in the Excel file'))
            return
          }
          
          // Extract headers and data
          const headers = jsonData[0] as string[]
          const data = jsonData.slice(1) as any[][]
          
          resolve({
            data,
            headers: headers.map(h => String(h || '')),
            sheetNames: workbook.SheetNames,
            fileName: file.name
          })
        } catch (error) {
          reject(new Error('Failed to parse Excel file: ' + (error as Error).message))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsArrayBuffer(file)
    })
  }

  static exportToExcel(data: any[][], headers: string[], fileName: string): void {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, fileName)
  }
}
