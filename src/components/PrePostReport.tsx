import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { downloadCsv } from '../lib/adminReports'
import {
  SURVEY_QUESTIONS,
  comparisonCsvRows,
  fetchPrePostData,
  importPreTestCsv,
  isMissingPrePost,
  questionStats,
  replacePreTest,
  type PreImport,
  type QuestionStats,
  type SurveyAnswers,
  type SurveyQuestion,
} from '../lib/prePostSurvey'

const q = (id: string) => SURVEY_QUESTIONS.find((x) => x.id === id)!

function fmtDiff(diff: number | null, unit: string) {
  if (diff === null) return '—'
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±'
  return `${sign}${Math.abs(Math.round(diff * 10) / 10)}${unit}`
}

function diffTone(diff: number | null) {
  if (diff === null || diff === 0) return 'text-neutral-500'
  return diff > 0 ? 'text-emerald-700' : 'text-red-700'
}

/** Aba "Antes × depois" dos relatórios: pré-teste (Google Forms) × pós-teste (app). */
export function PrePostReport({ courseId, courseTitle, userId }: { courseId: string; courseTitle: string; userId: string }) {
  const { t } = useLanguage()
  const [pre, setPre] = useState<SurveyAnswers[]>([])
  const [post, setPost] = useState<SurveyAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreImport | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetchPrePostData(courseId)
    setError(res.error ? (isMissingPrePost(res.error) ? t('prepost.missingSql') : res.error) : null)
    setPre(res.pre)
    setPost(res.post)
    setLoading(false)
  }, [courseId, t])

  useEffect(() => {
    void load()
  }, [load])

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportMsg(null)
    setPreview(importPreTestCsv(await file.text()))
  }

  async function confirmImport() {
    if (!preview) return
    setImporting(true)
    const { error: err } = await replacePreTest(preview.rows, userId)
    setImporting(false)
    if (err) {
      setImportMsg(isMissingPrePost(err) ? t('prepost.missingSql') : err)
      return
    }
    setImportMsg(t('prepost.imported', { n: String(preview.rows.length) }))
    setPreview(null)
    void load()
  }

  const stats = useMemo(() => {
    const out: Record<string, { pre: QuestionStats | null; post: QuestionStats }> = {}
    for (const question of SURVEY_QUESTIONS) {
      out[question.id] = {
        pre: question.block === 'C' ? null : questionStats(question, pre),
        post: questionStats(question, post),
      }
    }
    return out
  }, [pre, post])

  const kpis = [
    { id: 'B1', label: t('prepost.kpiKnowledge'), kind: 'mean' as const },
    { id: 'B2', label: t('prepost.kpiLegalKnowledge'), kind: 'mean' as const },
    { id: 'B8', label: t('prepost.kpiHallucination'), kind: 'pct' as const },
    { id: 'B10', label: t('prepost.kpiVerify'), kind: 'pct' as const },
    { id: 'B6', label: t('prepost.kpiOab'), kind: 'pct' as const },
    { id: 'B7', label: t('prepost.kpiCnj'), kind: 'pct' as const },
    { id: 'B3', label: t('prepost.kpiFrequency'), kind: 'mean' as const },
    { id: 'B11', label: t('prepost.kpiProductivity'), kind: 'mean' as const },
  ]

  function exportComparison() {
    downloadCsv(`antes-depois-${courseTitle.slice(0, 40) || 'curso'}.csv`, comparisonCsvRows(pre, post))
  }

  function exportPostRaw() {
    const cols = SURVEY_QUESTIONS
    downloadCsv(`pos-teste-respostas-${courseTitle.slice(0, 40) || 'curso'}.csv`, [
      cols.map((c) => `${c.id}. ${c.text}`),
      ...post.map((a) => cols.map((c) => {
        const v = a[c.id]
        return Array.isArray(v) ? v.join(' | ') : (v ?? null)
      })),
    ])
  }

  if (loading) {
    return (
      <div className="mt-12 flex justify-center">
        <div className="spinner-athenas" />
      </div>
    )
  }

  const comments = stats.C7.post.comments

  return (
    <div className="mt-6 space-y-8">
      {error && <p className="alert-error text-sm">{error}</p>}

      {/* Importação do pré-teste */}
      <section className="card-athenas p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-bold text-neutral-900">{t('prepost.importTitle')}</p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{t('prepost.importHint')}</p>
          </div>
          <label className="btn-secondary shrink-0 cursor-pointer !px-4 !py-2 text-sm">
            {t('prepost.importBtn')}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e)} />
          </label>
        </div>
        {preview && (
          <div className="mt-4 rounded-xl border border-brand-gold/40 bg-brand-gold-soft/25 p-4 text-sm">
            <p className="font-bold text-neutral-900">
              {t('prepost.previewRows', { n: String(preview.rows.length) })}
            </p>
            <p className="mt-1 text-neutral-700">
              {t('prepost.previewMatched', { n: String(preview.matched.length), total: String(preview.matched.length + preview.missing.length) })}
              {preview.missing.length > 0 && ` ${t('prepost.previewMissing', { ids: preview.missing.join(', ') })}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={importing || preview.rows.length === 0}
                onClick={() => void confirmImport()}
                className="btn-primary !px-4 !py-2 text-sm disabled:opacity-50"
              >
                {importing ? t('common.loading') : t('prepost.confirmImport')}
              </button>
              <button type="button" onClick={() => setPreview(null)} className="btn-secondary !px-4 !py-2 text-sm">
                {t('prepost.cancel')}
              </button>
            </div>
          </div>
        )}
        {importMsg && <p className="alert-brand mt-4 text-sm">{importMsg}</p>}
      </section>

      {/* Indicadores */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-neutral-900">{t('prepost.overview')}</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {t('prepost.sample', { pre: String(pre.length), post: String(post.length) })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportComparison}
              disabled={pre.length === 0 && post.length === 0}
              className="btn-secondary !px-4 !py-2 text-sm disabled:opacity-50"
            >
              {t('prepost.exportComparison')}
            </button>
            <button
              type="button"
              onClick={exportPostRaw}
              disabled={post.length === 0}
              className="btn-secondary !px-4 !py-2 text-sm disabled:opacity-50"
            >
              {t('prepost.exportPost')}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">{t('prepost.anonNote')}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k) => {
            const s = stats[k.id]
            const before = k.kind === 'mean' ? s.pre?.mean ?? null : s.pre && s.pre.n ? s.pre.keyPct : null
            const after = k.kind === 'mean' ? s.post.mean : s.post.n ? s.post.keyPct : null
            const unit = k.kind === 'pct' ? '%' : ''
            const diff = before !== null && after !== null ? after - before : null
            return (
              <div key={k.id} className="card-athenas p-4">
                <p className="text-[11px] font-bold uppercase leading-snug tracking-wide text-neutral-500">{k.label}</p>
                <p className="mt-2 flex items-baseline gap-1.5 text-neutral-900">
                  <span className="text-base font-semibold text-neutral-500">{before === null ? '—' : `${before}${unit}`}</span>
                  <span className="text-neutral-400">→</span>
                  <span className="text-2xl font-bold">{after === null ? '—' : `${after}${unit}`}</span>
                </p>
                <p className={`mt-1 text-xs font-bold ${diffTone(diff)}`}>
                  {fmtDiff(diff, k.kind === 'pct' ? ' p.p.' : '')}
                  {k.kind === 'mean' && <span className="font-semibold text-neutral-400"> · {t('prepost.scale15')}</span>}
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PostOnlyStat label={t('prepost.kpiSafety')} value={stats.C1.post.mean} suffix=" / 5" />
          <PostOnlyStat label={t('prepost.kpiExpectations')} value={stats.C5.post.mean} suffix=" / 5" />
          <PostOnlyStat label={t('prepost.kpiNps')} value={stats.C6.post.nps} suffix="" />
          <PostOnlyStat
            label={t('prepost.kpiSafetyUp')}
            value={
              stats.C2.post.n
                ? Math.round(
                    stats.C2.post.options
                      .filter((o) => o.option.startsWith('Aumentou'))
                      .reduce((s, o) => s + o.pct, 0)
                  )
                : null
            }
            suffix="%"
          />
        </div>
      </section>

      <QuestionBlock title={t('prepost.blockB')} ids={SURVEY_QUESTIONS.filter((x) => x.block === 'B').map((x) => x.id)} stats={stats} t={t} />
      <QuestionBlock title={t('prepost.blockC')} ids={['C1', 'C2', 'C3', 'C4', 'C5', 'C6']} stats={stats} t={t} />
      <QuestionBlock title={t('prepost.blockA')} ids={['A1', 'A2', 'A3']} stats={stats} t={t} />

      <section>
        <h2 className="font-display text-2xl font-bold text-neutral-900">{t('prepost.comments')}</h2>
        {comments.length === 0 ? (
          <p className="mt-2 text-sm italic text-neutral-400">{t('prepost.noComments')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {comments.map((c, i) => (
              <li key={i} className="card-athenas whitespace-pre-line p-4 text-sm leading-relaxed text-neutral-700">
                {c}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

type TFn = ReturnType<typeof useLanguage>['t']

function PostOnlyStat({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  return (
    <div className="card-athenas p-4">
      <p className="text-[11px] font-bold uppercase leading-snug tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-neutral-900">
        {value === null ? '—' : `${value}${suffix}`}
      </p>
    </div>
  )
}

function QuestionBlock({
  title,
  ids,
  stats,
  t,
}: {
  title: string
  ids: string[]
  stats: Record<string, { pre: QuestionStats | null; post: QuestionStats }>
  t: TFn
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-neutral-900">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-full bg-neutral-300" /> {t('prepost.before')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-full bg-brand-gold" /> {t('prepost.after')}
        </span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {ids.map((id) => (
          <QuestionCard key={id} question={q(id)} pre={stats[id].pre} post={stats[id].post} t={t} />
        ))}
      </div>
    </section>
  )
}

function QuestionCard({
  question,
  pre,
  post,
  t,
}: {
  question: SurveyQuestion
  pre: QuestionStats | null
  post: QuestionStats
  t: TFn
}) {
  const key = question.correct ?? question.target
  const meanDiff = pre?.mean != null && post.mean !== null ? post.mean - pre.mean : null
  return (
    <article className="card-athenas p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-gold-ink">{question.id}</p>
      <h3 className="mt-1 text-sm font-bold leading-snug text-neutral-900">{question.text}</h3>
      <p className="mt-1 text-xs text-neutral-500">
        {pre ? `${t('prepost.before')}: n=${pre.n} · ` : ''}
        {t('prepost.after')}: n={post.n}
        {post.mean !== null && (
          <>
            {' · '}
            {t('prepost.mean')}: {pre?.mean ?? '—'} → <strong className="text-neutral-800">{post.mean}</strong>
            {meanDiff !== null && <span className={`font-bold ${diffTone(meanDiff)}`}> ({fmtDiff(meanDiff, '')})</span>}
          </>
        )}
        {post.nps !== null && ` · NPS ${post.nps}`}
      </p>

      <ul className="mt-4 space-y-2.5">
        {post.options.map((o) => {
          const before = pre?.options.find((x) => x.option === o.option)
          const diff = before ? o.pct - before.pct : null
          const isKey = key === o.option
          return (
            <li key={o.option}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className={`min-w-0 ${isKey ? 'font-extrabold text-neutral-900' : 'font-semibold text-neutral-700'}`}>
                  {o.option}
                  {isKey && question.correct && <span className="ml-1 text-emerald-700">✓</span>}
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  {before ? `${before.pct}% → ` : ''}
                  <strong className="text-neutral-900">{o.pct}%</strong>
                  {diff !== null && <span className={`ml-1 font-bold ${diffTone(diff)}`}>{fmtDiff(diff, '')}</span>}
                </span>
              </div>
              {pre && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-neutral-300" style={{ width: `${before?.pct ?? 0}%` }} />
                </div>
              )}
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-brand-gold" style={{ width: `${o.pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </article>
  )
}
