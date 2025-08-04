import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "VExcel - AI-Powered Excel Revolution",
  description:
    "Transform Excel manipulation through natural language AI commands and voice input. Upload files, speak commands, and watch your data transform instantly.",
  generator: "VExcel",
  keywords: ["Excel", "AI", "Voice Commands", "Spreadsheet", "Data Analysis", "Natural Language"],
  authors: [{ name: "VExcel Team" }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
