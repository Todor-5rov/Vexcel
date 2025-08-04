import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'VExcel - AI-Powered Excel Revolution',
  description: 'Transform Excel manipulation through AI-powered natural language commands and voice input. Upload Excel files and interact with your data conversationally.',
  keywords: ['Excel', 'AI', 'spreadsheet', 'voice commands', 'data analysis', 'natural language', 'productivity'],
  authors: [{ name: 'VExcel Team' }],
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' fontSize='90'>📊</text></svg>"
        />
      </head>
      <body className={`${inter.className} font-medium`}>{children}</body>
    </html>
  )
}
