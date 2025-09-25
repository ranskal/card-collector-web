// src/app/layout.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Card Collector',
  description: 'Track your card collection',
  themeColor: '#ffffff',
  viewport:
    'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1',
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

        {/* Floating Add (mobile convenience) */}
        <Link
          href="/add"
          className="fixed bottom-6 right-6 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:hidden"
        >
          + Add
        </Link>
      </body>
    </html>
  )
}