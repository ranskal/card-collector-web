// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Card Collector',
    template: '%s · Card Collector',
  },
  description: 'Track your trading cards with Next.js + Supabase.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  themeColor: '#111827',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen bg-gray-50 text-gray-900`}>
        <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              Card Collector
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
              >
                My Cards
              </Link>
              <Link
                href="/add"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Add Card
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}