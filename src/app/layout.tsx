import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Card Collector',
  description: 'My Card Collection',
  themeColor: '#ffffff',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Card Collector' },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-white" style={{ colorScheme: 'light' }}>
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  )
}