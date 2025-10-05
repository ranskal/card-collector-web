'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** static suggestions to seed; we’ll merge with tags from DB */
  suggestions?: string[]
}

export default function TagInput({
  value,
  onChange,
  placeholder = 'Add a tag and press Enter',
  suggestions = [],
}: Props) {
  const [text, setText] = useState('')
  const [dbSuggestions, setDbSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Load all tag labels from DB once
  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase.from('tags').select('label')
      if (!active) return
      if (!error && data) {
        const labels = data.map(t => t.label).filter(Boolean) as string[]
        setDbSuggestions(labels)
      }
    })()
    return () => { active = false }
  }, [])

  const mergedSuggestions = useMemo(() => {
    const set = new Set<string>()
    ;[...suggestions, ...dbSuggestions].forEach(s => { if (s) set.add(s) })
    return Array.from(set).sort((a,b)=>a.localeCompare(b))
  }, [suggestions, dbSuggestions])

  function addTag(raw: string) {
    const t = raw.trim()
    if (!t) return
    if (!value.includes(t)) onChange([...value, t])
    setText('')
  }

  function removeTag(t: string) {
    onChange(value.filter(v => v !== t))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(text)
    } else if (e.key === 'Backspace' && !text && value.length) {
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="rounded-lg border border-slate-300 p-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((t) => (
          <span key={t} className="pill">
            {t}{' '}
            <button
              aria-label={`Remove ${t}`}
              className="ml-1 text-slate-500 hover:text-slate-800"
              onClick={() => removeTag(t)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="min-w-[140px] flex-1 outline-none"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      {mergedSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {mergedSuggestions.map((s) => {
            const active = value.includes(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => (active ? removeTag(s) : addTag(s))}
                className={[
                  'rounded-full border px-2 py-0.5 text-xs',
                  active
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                {s}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}