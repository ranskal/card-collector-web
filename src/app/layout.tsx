// src/app/layout.tsx
import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'My Card Collection',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-slate-50">
        <div className="mx-auto max-w-screen-md px-4 pb-28">{/* leave room for FAB */}
          {/* top bar */}
          <header className="sticky top-0 z-10 -mx-4 mb-4 bg-slate-50/80 backdrop-blur">
            <div className="mx-auto max-w-screen-md px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  My Card Collection
                </h1>
                <Link
                  href="/add"
                  className="hidden rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 md:inline-block"
                >
                  Add Card
                </Link>
              </div>
            </div>
          </header>

          <main>{children}</main>

          {/* Floating Add (mobile style) */}
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