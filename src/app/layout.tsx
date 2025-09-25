import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Card Collector',
  description: 'My Card Collection',
  // iOS/Android browser UI color
  themeColor: '#ffffff',
  // Extra meta tags that keep Safari/iOS from auto-darkening
  other: {
    'color-scheme': 'light',
    'supported-color-schemes': 'light',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Card Collector',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-white" style={{ colorScheme: 'light' }}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="mx-auto max-w-3xl p-4 md:p-6">{children}</div>
      </body>
    </html>
  )
}