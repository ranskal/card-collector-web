// src/components/Pill.tsx
export default function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'primary'
}) {
  const styles =
    tone === 'primary'
      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {children}
    </span>
  )
}