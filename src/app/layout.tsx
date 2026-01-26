// src/app/layout.tsx
import Link from 'next/link'
import './globals.css'

import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Card Collector',
  description: 'Track your card collection',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" style={{ colorScheme: 'light' }}>
      <body className="min-h-dvh bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-screen-sm px-4 pb-24">
          {/* Header */}
          <header className="sticky top-0 z-10 -mx-4 bg-slate-50/90 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold tracking-tight">
                My Card Collection
              </h1>
              <Link
                href="/add"
                className="rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                + Add
              </Link>
            </div>
          </header>

          {/* Page */}
          <main className="pt-3">{children}</main>
        </div>
      </body>
    </html>
  )
}