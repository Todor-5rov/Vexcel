import * as XLSX from "xlsx"
import Papa from "papaparse"

export interface ParsedExcelData {
  data: string[][]
  headers: string[]
  rowCount: number
  columnCount: number
  fileName: string
  fileType: "xlsx" | "xls" | "csv"
}

export class ExcelParser {
  static async parseFile(file: File): Promise<ParsedExcelData> {
    const fileType = this.getFileType(file.name || "unknown.xlsx")

    if (fileType === "csv") {
      return this.parseCSV(file)
    } else {
      return this.parseExcel(file)
    }
  }

  private static getFileType(fileName: string): "xlsx" | "xls" | "csv" {
    if (!fileName || typeof fileName !== "string") {
      return "xlsx" // default fallback
    }

    const extension = fileName.split(".").pop()?.toLowerCase()
    if (extension === "csv") return "csv"
    if (extension === "xls") return "xls"
    return "xlsx"
  }

  private static async parseCSV(file: File): Promise<ParsedExcelData> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          const data = results.data as string[][]
          const headers = data[0] || []

          resolve({
            data,
            headers,
            rowCount: data.length,
            columnCount: headers.length,
            fileName: file.name || "unknown.csv",
            fileType: "csv",
          })
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`))
        },
        skipEmptyLines: true,
      })
    })
  }

  private static async parseExcel(file: File): Promise<ParsedExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array" })

          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]

          // Convert to array of arrays
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          }) as string[][]

          const headers = jsonData[0] || []

          resolve({
            data: jsonData,
            headers,
            rowCount: jsonData.length,
            columnCount: headers.length,
            fileName: file.name || "unknown.xlsx",
            fileType: file.name?.endsWith(".xls") ? "xls" : "xlsx",
          })
        } catch (error) {
          reject(new Error(`Excel parsing failed: ${error}`))
        }
      }

      reader.onerror = () => {
        reject(new Error("File reading failed"))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  // New method to convert data back to file blob
  static async dataToBlob(data: string[][], fileName: string): Promise<Blob> {
    const fileType = this.getFileType(fileName)

    if (fileType === "csv") {
      const csv = Papa.unparse(data)
      return new Blob([csv], { type: "text/csv;charset=utf-8;" })
    } else {
      // Create Excel file
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")

      const excelBuffer = XLSX.write(workbook, {
        bookType: fileType === "xls" ? "xls" : "xlsx",
        type: "array",
      })

      const mimeType =
        fileType === "xls"
          ? "application/vnd.ms-excel"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

      return new Blob([excelBuffer], { type: mimeType })
    }
  }

  static exportToExcel(data: string[][], fileName: string): void {
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
    XLSX.writeFile(workbook, fileName)
  }

  static exportToCSV(data: string[][], fileName: string): void {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", fileName)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
