import { useEffect, useRef, useState } from 'react'

export type BrandSelectOption<T extends string> = {
  value: T
  label: string
}

export function BrandSelect<T extends string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: {
  value: T
  onChange: (value: T) => void
  options: BrandSelectOption<T>[]
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="input-athenas !rounded-xl flex items-center justify-between gap-3 text-left"
      >
        <span className="truncate font-medium">{current?.label ?? value}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-brand-gold transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.2 7.5a.75.75 0 011.06.04L10 11.06l3.74-3.52a.75.75 0 011.02 1.1l-4.25 4a.75.75 0 01-1.02 0l-4.25-4a.75.75 0 01.04-1.14z" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-2xl border border-brand-gold/30 bg-white shadow-xl"
        >
          {options.map((opt) => {
            const selected = opt.value === value
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium ${
                    selected
                      ? 'bg-neutral-950 text-brand-gold'
                      : 'text-neutral-800 hover:bg-brand-gold-soft'
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
