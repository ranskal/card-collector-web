// src/app/layout.tsx
import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Card Collector',
  description: 'My Card Collection',
  manifest: '/manifest.webmanifest',
  themeColor: '#ffffff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Card Collector',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-white" style={{ colorScheme: 'light' }}>
      <body className="min-h-[100svh] bg-white text-slate-900 antialiased">
        {/* Keep your existing pages/components exactly as-is */}
        <div className="min-h-[100svh] bg-white">{children}</div>
      </body>
    </html>
  )
}