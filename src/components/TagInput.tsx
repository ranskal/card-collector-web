'use client'
import { useMemo, useState } from 'react'

function normalizeTag(raw: string) {
  const t = raw.trim().replace(/\s+/g, ' ')
  // keep short “flag” tags uppercased; otherwise Title Case
  if (t.length <= 5) return t.toUpperCase()
  return t.replace(/\b\w/g, c => c.toUpperCase())
}

export default function TagInput({
  value,
  onChange,
  suggestions = ['RC', 'Auto', 'Patch', 'Relic', 'Refractor', 'Numbered'],
  placeholder = 'Add a tag and press Enter…',
}: {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const canSuggest = useMemo(
    () => suggestions.filter(s => !value.includes(s)),
    [suggestions, value]
  )

  function addTag(raw: string) {
    const t = normalizeTag(raw)
    if (!t) return
    if (value.includes(t)) return
    onChange([...value, t])
    setText('')
  }
  function removeTag(t: string) {
    onChange(value.filter(v => v !== t))
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(text)
    } else if (e.key === 'Backspace' && !text && value.length) {
      // quick delete last
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map(t => (
          <span key={t} className="pill inline-flex items-center gap-1">
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="ml-1 rounded-full px-1 text-slate-600 hover:bg-slate-100"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="min-w-[10rem] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      {canSuggest.length > 0 && (
        <div className="flex flex-wrap gap-1 text-xs">
          <span className="text-slate-500">Suggestions:</span>
          {canSuggest.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="rounded-full border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}