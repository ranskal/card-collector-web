// src/app/layout.tsx
import './globals.css'
import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Card Collector',
  description: 'My Card Collection',
  manifest: '/manifest.webmanifest',
  themeColor: '#ffffff',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Card Collector' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-white" style={{ colorScheme: 'light' }}>
      <body className={`${inter.className} min-h-[100svh] bg-white text-slate-900 antialiased`}>
        {/* Centered page container with padding; leave space for FAB */}
        <div className="mx-auto max-w-screen-md px-4 pb-28">
          {/* Sticky light header */}
          <header className="sticky top-0 z-10 -mx-4 mb-4 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-screen-md px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  My Card Collection
                </h1>
                <Link
                  href="/add"
                  className="hidden md:inline-block rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Add Card
                </Link>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="space-y-4">{children}</main>

          {/* Floating Add for mobile */}
          <Link
            href="/add"
            className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-700/20 hover:shadow-xl"
          >
            + Add
          </Link>
        </div>
      </body>
    </html>
  )
}