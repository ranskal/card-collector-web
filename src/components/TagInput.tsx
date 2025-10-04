'use client'

import { useMemo, useState } from 'react'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  suggestions?: string[]
  className?: string
}

export default function TagInput({
  value,
  onChange,
  placeholder = 'Add a tag and press Enter',
  suggestions = [],
  className = '',
}: Props) {
  const [text, setText] = useState('')

  function cleanify(input: string): string[] {
    return input
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  function commit(input = text) {
    const parts = cleanify(input)
    if (!parts.length) return
    const set = new Set(value)
    for (const p of parts) set.add(p)
    onChange(Array.from(set))
    setText('')
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !text && value.length) {
      // quick delete last tag
      onChange(value.slice(0, -1))
    }
  }

  function onBlur() {
    // If they typed something and tap Save immediately (mobile), commit it.
    if (text.trim()) commit(text)
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const data = e.clipboardData.getData('text')
    const parts = cleanify(data)
    if (parts.length > 1) {
      e.preventDefault()
      const set = new Set(value)
      parts.forEach((p) => set.add(p))
      onChange(Array.from(set))
    }
  }

  const suggested = useMemo(() => {
    const have = new Set(value.map((v) => v.toLowerCase()))
    return suggestions.filter((s) => !have.has(s.toLowerCase()))
  }, [suggestions, value])

  return (
    <div className={['rounded border p-2', className].join(' ')}>
      <div className="flex flex-wrap gap-2">
        {value.map((t) => (
          <span key={t} className="pill flex items-center gap-1">
            {t}
            <button
              type="button"
              className="ml-1 rounded px-1 text-xs hover:bg-black/5"
              onClick={() => remove(t)}
              aria-label={`Remove ${t}`}
              title="Remove"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onPaste={onPaste}
          placeholder={placeholder}
          className="min-w-[10ch] flex-1 outline-none"
        />
      </div>

      {suggested.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {suggested.map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-full border px-2 py-0.5 hover:bg-slate-50"
              onClick={() => onChange(Array.from(new Set([...value, s])))}
              title={`Add "${s}"`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}