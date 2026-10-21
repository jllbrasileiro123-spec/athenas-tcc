import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'

const API_BASE = `${(import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '')}/rest/v1/rpc`
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

function endpoint(fn: string, key: string) {
  return `${API_BASE}/${fn}?p_key=${encodeURIComponent(key)}&apikey=${encodeURIComponent(ANON_KEY)}`
}

/** Janela com os links da API de resultados (pré × pós) para o Power BI. Só admin. */
export function PowerBiConnect({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage()
  const [key, setKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)

  useEffect(() => {
    void supabase.rpc('admin_report_api_key').then(({ data, error: err }) => {
      if (err) setError(err.message.includes('admin_report_api_key') || err.message.includes('schema cache') ? t('powerbi.missingSql') : err.message)
      else setKey((data as string | null) ?? null)
    })
  }, [t])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied(null)
    }
  }

  async function rotate() {
    setRotating(true)
    const { data, error: err } = await supabase.rpc('admin_rotate_report_api_key')
    setRotating(false)
    if (err) setError(err.message)
    else setKey(data as string)
  }

  const links = key
    ? [
        { id: 'comparativo', title: t('powerbi.comparativeTitle'), desc: t('powerbi.comparativeDesc'), url: endpoint('api_pre_pos_comparativo', key) },
        { id: 'respostas', title: t('powerbi.answersTitle'), desc: t('powerbi.answersDesc'), url: endpoint('api_pre_pos_respostas', key) },
      ]
    : []

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('powerbi.title')}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-neutral-950 px-6 py-5 text-white">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-gold-light">API</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{t('powerbi.title')}</h2>
            <p className="mt-1 text-sm text-neutral-300">{t('powerbi.desc')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('prepost.close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/80 hover:border-brand-gold hover:text-brand-gold-light"
          >
            ✕
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          {error && <p className="alert-error text-sm">{error}</p>}
          {!error && !key && (
            <div className="flex justify-center py-6">
              <div className="spinner-athenas" />
            </div>
          )}

          {links.map((l) => (
            <div key={l.id}>
              <p className="text-sm font-bold text-neutral-900">{l.title}</p>
              <p className="text-xs text-neutral-500">{l.desc}</p>
              <div className="mt-2 flex gap-2">
                <input
                  readOnly
                  value={l.url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-xl border border-brand-line bg-brand-cream px-3 py-2 font-mono text-xs text-neutral-700"
                />
                <button
                  type="button"
                  onClick={() => void copy(l.id, l.url)}
                  className="shrink-0 rounded-xl bg-neutral-950 px-4 text-xs font-bold text-brand-gold-light hover:bg-black"
                >
                  {copied === l.id ? t('powerbi.copied') : t('powerbi.copy')}
                </button>
              </div>
            </div>
          ))}

          {key && (
            <>
              <ol className="list-decimal space-y-1 rounded-2xl bg-brand-cream px-5 py-4 pl-9 text-sm text-neutral-700">
                <li>{t('powerbi.step1')}</li>
                <li>{t('powerbi.step2')}</li>
                <li>{t('powerbi.step3')}</li>
                <li>{t('powerbi.step4')}</li>
              </ol>
              <div className="flex flex-col gap-2 border-t border-brand-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-snug text-neutral-500">{t('powerbi.secret')}</p>
                <button
                  type="button"
                  disabled={rotating}
                  onClick={() => void rotate()}
                  className="shrink-0 text-xs font-bold text-red-700 underline underline-offset-2 hover:text-red-900 disabled:opacity-50"
                >
                  {rotating ? t('common.loading') : t('powerbi.rotate')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
