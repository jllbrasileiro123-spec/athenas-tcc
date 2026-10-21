import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { downloadCsv } from '../lib/adminReports'
import { PERCEPTION_ITEMS, type Perception } from '../lib/courseFeedback'
import { supabase } from '../lib/supabase'
import { GOLD, Ring, decFmt, pctFmt, type Slice } from './PrePostReport'
import { PowerBiConnect } from './PowerBiConnect'

type TFn = ReturnType<typeof useLanguage>['t']

type PerceptionItem = {
  id: string
  full_name: string | null
  rating: number
  would_recommend: boolean | null
  perception: Perception
  comment: string | null
  updated_at: string
  days_to_complete: number | null
  progress_pct: number | null
}

type PerceptionData = {
  enrolled: number
  completed: number
  median_days: number | null
  items: PerceptionItem[]
}

/* Concordância (escala de 1 a 5): discordam = 1–2, neutros = 3, concordam = 4–5 */
const AGREE = GOLD
const NEUTRAL = '#ddd6c4'
const DISAGREE = '#8f8f8f'

function agreement(items: PerceptionItem[], id: string) {
  const values = items.map((i) => Number(i.perception?.[id as keyof Perception])).filter((v) => v >= 1 && v <= 5)
  const n = values.length
  if (!n) return null
  const pct = (f: (v: number) => boolean) => (values.filter(f).length / n) * 100
  return {
    n,
    agree: pct((v) => v >= 4),
    neutral: pct((v) => v === 3),
    disagree: pct((v) => v <= 2),
    mean: values.reduce((s, v) => s + v, 0) / n,
  }
}

function isMissing(message: string) {
  return message.includes('admin_course_perception') || message.includes('schema cache')
}

/** Aba "Percepção dos alunos": avaliação do pop-up de fim de curso + tempo para concluir. Cabe numa tela. */
export function PerceptionReport({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const { t } = useLanguage()
  const [data, setData] = useState<PerceptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [powerBi, setPowerBi] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: raw, error: err } = await supabase.rpc('admin_course_perception', { p_course_id: courseId })
    setError(err ? (isMissing(err.message) ? t('perception.missingSql') : err.message) : null)
    setData((raw as PerceptionData | null) ?? null)
    setLoading(false)
  }, [courseId, t])

  useEffect(() => {
    void load()
  }, [load])

  const items = useMemo(() => data?.items ?? [], [data])
  const n = items.length
  const avgRating = n ? items.reduce((s, i) => s + i.rating, 0) / n : null
  const answeredRecommend = items.filter((i) => i.would_recommend !== null)
  const recommendPct = answeredRecommend.length
    ? (answeredRecommend.filter((i) => i.would_recommend).length / answeredRecommend.length) * 100
    : null
  const comments = items.filter((i) => i.comment?.trim())

  function exportCsv() {
    downloadCsv(`percepcao-${courseTitle.slice(0, 40) || 'curso'}.csv`, [
      [
        t('reports.colStudent'),
        t('perception.colRating'),
        t('perception.colRecommend'),
        ...PERCEPTION_ITEMS.map((p) => `${p.id}. ${t(p.key)}`),
        t('perception.colDays'),
        t('perception.colProgress'),
        t('reports.colComment'),
        t('reports.colDate'),
      ],
      ...items.map((i) => [
        i.full_name ?? '',
        i.rating,
        i.would_recommend === null ? '' : i.would_recommend ? t('feedback.yes') : t('feedback.no'),
        ...PERCEPTION_ITEMS.map((p) => i.perception?.[p.id] ?? ''),
        i.days_to_complete ?? '',
        i.progress_pct ?? '',
        i.comment ?? '',
        new Date(i.updated_at).toLocaleDateString('pt-BR'),
      ]),
    ])
  }

  if (loading) {
    return (
      <div className="mt-12 flex justify-center">
        <div className="spinner-athenas" />
      </div>
    )
  }

  const ghostBtn =
    'rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-bold text-white/90 transition-colors hover:border-brand-gold hover:text-brand-gold-light disabled:opacity-40'

  return (
    <div className="mt-5 space-y-4">
      {error && <p className="alert-error text-sm">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Satisfação */}
        <section className="flex flex-col justify-between gap-6 rounded-3xl bg-neutral-950 p-6 text-white lg:row-span-2">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-gold-light">
              {t('perception.heroKicker')}
            </p>
            <p className="mt-4 flex items-baseline gap-2 font-display text-6xl font-bold leading-none text-brand-gold-light">
              {avgRating === null ? '—' : decFmt(avgRating)}
              <span className="text-2xl text-brand-gold-light/70">/5</span>
            </p>
            <p className="mt-2 text-lg leading-none tracking-[0.2em] text-brand-gold" aria-hidden>
              {'★★★★★'.slice(0, Math.round(avgRating ?? 0))}
              <span className="text-white/20">{'★★★★★'.slice(Math.round(avgRating ?? 0))}</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">
              {n ? t('perception.heroBody', { n: String(n) }) : t('perception.empty')}
            </p>
          </div>

          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <dt className="text-[11px] font-semibold text-neutral-400">{t('perception.recommend')}</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">{recommendPct === null ? '—' : pctFmt(recommendPct)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold text-neutral-400">{t('perception.completed')}</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">
                  {data ? `${data.completed}/${data.enrolled}` : '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] font-semibold text-neutral-400">{t('perception.medianDays')}</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">
                  {data?.median_days == null ? '—' : t('perception.days', { n: decFmt(Number(data.median_days)) })}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportCsv} disabled={!n} className={ghostBtn}>
                {t('prepost.exportComparison')}
              </button>
              <button
                type="button"
                onClick={() => setPowerBi(true)}
                className="rounded-full bg-brand-gold px-3.5 py-1.5 text-xs font-extrabold text-neutral-950 transition hover:brightness-105"
              >
                {t('powerbi.cta')}
              </button>
            </div>
          </div>
        </section>

        {/* Uma rosca de concordância por afirmação */}
        {PERCEPTION_ITEMS.map((p) => {
          const a = agreement(items, p.id)
          const slices: Slice[] = a
            ? [
                { label: t('perception.agree'), pct: a.agree, color: AGREE },
                { label: t('perception.neutral'), pct: a.neutral, color: NEUTRAL },
                { label: t('perception.disagree'), pct: a.disagree, color: DISAGREE },
              ]
            : []
          return (
            <article key={p.id} className="flex flex-col rounded-3xl border border-brand-line bg-white p-5">
              <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-neutral-800">{t(p.key)}</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
                  <svg width={96} height={96} viewBox="0 0 96 96" className="-rotate-90" role="img" aria-label={t(p.key)}>
                    <Ring size={96} r={41} stroke={12} slices={slices} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span className="text-xl font-bold tabular-nums text-neutral-900">{a ? pctFmt(a.agree) : '—'}</span>
                    <span className="mt-1 text-[10px] font-semibold text-neutral-500">{t('perception.agreeShort')}</span>
                  </div>
                </div>
                <ul className="min-w-0 space-y-1 text-xs text-neutral-500">
                  {slices.map((s) => (
                    <li key={s.label} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                      {s.label}
                      <span className="font-bold tabular-nums text-neutral-800">{pctFmt(s.pct)}</span>
                    </li>
                  ))}
                  {a && (
                    <li className="pt-0.5 text-[11px]">
                      {t('prepost.mean')} <span className="font-bold text-neutral-800">{decFmt(a.mean)}</span>/5
                    </li>
                  )}
                </ul>
              </div>
            </article>
          )
        })}

        {/* Comentários */}
        <article className="flex flex-col justify-between rounded-3xl border border-brand-line bg-white p-5">
          <div>
            <p className="text-sm font-bold text-neutral-800">
              {t('perception.comments')} <span className="text-neutral-400">({comments.length})</span>
            </p>
            {comments[0] ? (
              <p className="mt-3 line-clamp-4 border-l-2 border-brand-gold pl-3 text-sm italic leading-relaxed text-neutral-600">
                “{comments[0].comment}”
              </p>
            ) : (
              <p className="mt-3 text-sm italic text-neutral-400">{t('prepost.noComments')}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawer(true)}
            disabled={!n}
            className="mt-4 self-start rounded-full bg-neutral-950 px-4 py-2 text-xs font-bold text-brand-gold-light hover:bg-black disabled:opacity-40"
          >
            {t('perception.seeAll')} →
          </button>
        </article>
      </div>

      {powerBi && <PowerBiConnect onClose={() => setPowerBi(false)} />}
      {drawer && <AnswersDrawer items={items} onClose={() => setDrawer(false)} t={t} />}
    </div>
  )
}

/** Janela lateral com a avaliação de cada aluno */
function AnswersDrawer({ items, onClose, t }: { items: PerceptionItem[]; onClose: () => void; t: TFn }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40" onClick={onClose} role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('perception.seeAll')}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col bg-brand-cream shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-brand-line bg-white px-6 py-4">
          <h2 className="font-display text-2xl font-bold text-neutral-900">{t('perception.seeAll')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('prepost.close')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-line text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
          >
            ✕
          </button>
        </header>
        <ul className="scroll-thin flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {items.map((i) => (
            <li key={i.id} className="rounded-2xl border border-brand-line bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-neutral-900">{i.full_name ?? t('perception.anonymous')}</p>
                <p className="text-sm tracking-[0.15em] text-brand-gold" aria-label={`${i.rating}/5`}>
                  {'★'.repeat(i.rating)}
                  <span className="text-neutral-200">{'★'.repeat(5 - i.rating)}</span>
                </p>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">
                {i.would_recommend === null ? '' : i.would_recommend ? t('perception.recommends') : t('perception.notRecommends')}
                {i.days_to_complete !== null && ` · ${t('perception.completedIn', { n: decFmt(Number(i.days_to_complete)) })}`}
                {i.days_to_complete === null && i.progress_pct !== null && ` · ${t('perception.progress', { n: String(i.progress_pct) })}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {PERCEPTION_ITEMS.map((p) => {
                  const v = i.perception?.[p.id]
                  return (
                    <span
                      key={p.id}
                      title={t(p.key)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                        v === undefined ? 'bg-neutral-100 text-neutral-400' : v >= 4 ? 'bg-brand-gold-soft text-neutral-900' : v === 3 ? 'bg-neutral-100 text-neutral-700' : 'bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      {p.id} · {v ?? '—'}
                    </span>
                  )
                })}
              </div>
              {i.comment && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{i.comment}</p>}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 border-t border-brand-line bg-white px-6 py-3 text-[11px] text-neutral-500">
          {t('perception.legend')}
        </div>
      </aside>
    </div>
  )
}
