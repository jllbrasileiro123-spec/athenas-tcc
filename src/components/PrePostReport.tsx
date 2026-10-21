import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { downloadCsv } from '../lib/adminReports'
import { PowerBiConnect } from './PowerBiConnect'
import {
  OTHER,
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

type TFn = ReturnType<typeof useLanguage>['t']
type Pair = { pre: QuestionStats | null; post: QuestionStats }
type Slice = { label: string; pct: number; color: string }

const question = (id: string) => SURVEY_QUESTIONS.find((x) => x.id === id)!
const pctFmt = (v: number) => `${Math.round(v)}%`
const decFmt = (v: number) => v.toFixed(1).replace('.', ',')

/* Escalas ordenadas: tons de dourado (claro → escuro). Categorias sem ordem:
   paleta categórica validada para daltonismo, sempre na mesma ordem. */
const GOLD = '#c9a227'
const GRAY = '#a3a3a3'
const TRACK = '#efe9da'
const GOLD_RAMP = ['#f4e7bf', '#e8cf7a', '#c9a227', '#93740f', '#5c4808']
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']

function rampFor(n: number) {
  if (n <= 2) return [GOLD_RAMP[1], GOLD_RAMP[3]]
  if (n === 3) return [GOLD_RAMP[0], GOLD_RAMP[2], GOLD_RAMP[4]]
  if (n === 4) return [GOLD_RAMP[0], GOLD_RAMP[1], GOLD_RAMP[3], GOLD_RAMP[4]]
  return GOLD_RAMP
}

function slicesFor(q: SurveyQuestion, s: QuestionStats): Slice[] {
  const ordered = q.kind === 'scale' || q.ordinal
  const named = s.options.filter((o) => o.option !== OTHER)
  const colors = ordered ? rampFor(named.length) : CATEGORICAL
  const out = named.map((o, i) => ({ label: o.option, pct: o.pct, color: colors[i % colors.length] }))
  const other = s.options.find((o) => o.option === OTHER)
  if (other) out.push({ label: other.option, pct: other.pct, color: GRAY })
  return out
}

/** % que marcou alguma das alternativas indicadas */
function share(s: QuestionStats | null | undefined, options: string[]) {
  if (!s || !s.n) return null
  return s.options.filter((o) => options.includes(o.option)).reduce((sum, o) => sum + o.pct, 0)
}

/* ---------------- Gráficos (SVG) ---------------- */

/** Anel de pizza: fatias desenhadas como arcos de um círculo */
function Ring({ slices, size, r, stroke }: { slices: Slice[]; size: number; r: number; stroke: number }) {
  const c = 2 * Math.PI * r
  const visible = slices.filter((s) => s.pct > 0)
  const gap = visible.length > 1 ? 1.5 : 0
  let offset = 0
  return (
    <>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TRACK} strokeWidth={stroke} />
      {visible.map((s) => {
        const len = (Math.min(s.pct, 100) / 100) * c
        const dash = Math.max(len - gap, 0.01)
        const el = (
          <circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeLinecap={visible.length === 1 ? 'round' : 'butt'}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
          >
            <title>{`${s.label}: ${pctFmt(s.pct)}`}</title>
          </circle>
        )
        offset += len
        return el
      })}
    </>
  )
}

/** Pizza dupla: anel de fora = depois (dourado), anel de dentro = antes (cinza) */
function BeforeAfterRing({ before, after, size = 104, label }: { before: number | null; after: number | null; size?: number; label: string }) {
  const outer = Math.round(size * 0.1)
  const inner = Math.round(size * 0.07)
  const rOuter = size / 2 - outer / 2
  const rInner = rOuter - outer / 2 - 4 - inner / 2
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label}>
        <Ring size={size} r={rOuter} stroke={outer} slices={after === null ? [] : [{ label: 'Depois', pct: after, color: GOLD }]} />
        <Ring size={size} r={rInner} stroke={inner} slices={before === null ? [] : [{ label: 'Antes', pct: before, color: GRAY }]} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold tabular-nums tracking-tight text-neutral-900">
          {after === null ? '—' : pctFmt(after)}
        </span>
      </div>
    </div>
  )
}

function Pie({ slices, size }: { slices: Slice[]; size: number }) {
  const stroke = Math.round(size * 0.18)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <Ring size={size} r={(size - stroke) / 2} stroke={stroke} slices={slices} />
    </svg>
  )
}

function Delta({ before, after }: { before: number | null; after: number | null }) {
  if (before === null || after === null) return null
  const diff = Math.round(after - before)
  const tone = diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-700' : 'text-neutral-500'
  return (
    <span className={`whitespace-nowrap text-sm font-bold tabular-nums ${tone}`}>
      {diff > 0 ? '▲ +' : diff < 0 ? '▼ −' : ''}
      {Math.abs(diff)} p.p.
    </span>
  )
}

/* ---------------- Painel ---------------- */

/** Aba "Antes × depois": pré-teste (Google Forms, anônimo) × pós-teste (app). Cabe numa tela. */
export function PrePostReport({ courseId, courseTitle, userId }: { courseId: string; courseTitle: string; userId: string }) {
  const { t } = useLanguage()
  const [pre, setPre] = useState<SurveyAnswers[]>([])
  const [post, setPost] = useState<SurveyAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreImport | null>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [powerBiOpen, setPowerBiOpen] = useState(false)

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
    const out: Record<string, Pair> = {}
    for (const q of SURVEY_QUESTIONS) {
      out[q.id] = { pre: q.block === 'C' ? null : questionStats(q, pre), post: questionStats(q, post) }
    }
    return out
  }, [pre, post])

  const fileSlug = courseTitle.slice(0, 40) || 'curso'
  const hasPre = pre.length > 0
  const hasPost = post.length > 0
  const b = (v: number | null | undefined) => (hasPre ? v ?? null : null)
  const a = (v: number | null | undefined) => (hasPost ? v ?? null : null)
  const high = ['4', '5']

  const indicators = [
    { label: t('prepost.kpiHallucination'), before: b(stats.B8.pre?.keyPct), after: a(stats.B8.post.keyPct) },
    { label: t('prepost.kpiVerify'), before: b(stats.B10.pre?.keyPct), after: a(stats.B10.post.keyPct) },
    { label: t('prepost.kpiOab'), before: b(stats.B6.pre?.keyPct), after: a(stats.B6.post.keyPct) },
    { label: t('prepost.kpiCnj'), before: b(stats.B7.pre?.keyPct), after: a(stats.B7.post.keyPct) },
    { label: t('prepost.kpiKnowledgeHigh'), before: b(share(stats.B1.pre, high)), after: a(share(stats.B1.post, high)) },
    {
      label: t('prepost.kpiProductivityHigh'),
      before: b(share(stats.B11.pre, ['Acredito bastante', 'Tenho certeza que sim'])),
      after: a(share(stats.B11.post, ['Acredito bastante', 'Tenho certeza que sim'])),
    },
  ]

  const deltas = indicators
    .filter((k) => k.before !== null && k.after !== null)
    .map((k) => (k.after as number) - (k.before as number))
  const avgGain = deltas.length ? Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length) : null

  const safetyUp = share(stats.C2.post, ['Aumentou um pouco', 'Aumentou muito'])
  const postStats = [
    { label: t('prepost.kpiSafetyUpShort'), value: safetyUp === null ? '—' : pctFmt(safetyUp), ring: safetyUp },
    {
      label: t('prepost.kpiSafety'),
      value: stats.C1.post.mean === null ? '—' : `${decFmt(stats.C1.post.mean)}/5`,
      ring: stats.C1.post.mean === null ? null : (stats.C1.post.mean / 5) * 100,
    },
    {
      label: t('prepost.kpiExpectations'),
      value: stats.C5.post.mean === null ? '—' : `${decFmt(stats.C5.post.mean)}/5`,
      ring: stats.C5.post.mean === null ? null : (stats.C5.post.mean / 5) * 100,
    },
    {
      label: t('prepost.kpiNps'),
      value: stats.C6.post.nps === null ? '—' : String(stats.C6.post.nps),
      ring: stats.C6.post.nps === null ? null : (stats.C6.post.nps + 100) / 2,
    },
  ]

  if (loading) {
    return (
      <div className="mt-12 flex justify-center">
        <div className="spinner-athenas" />
      </div>
    )
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <label className="cursor-pointer rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-bold text-white/90 transition-colors hover:border-brand-gold hover:text-brand-gold-light">
        {t('prepost.importBtn')}
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e)} />
      </label>
      <button
        type="button"
        onClick={() => downloadCsv(`antes-depois-${fileSlug}.csv`, comparisonCsvRows(pre, post))}
        disabled={!hasPre && !hasPost}
        className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-bold text-white/90 transition-colors hover:border-brand-gold hover:text-brand-gold-light disabled:opacity-40"
      >
        {t('prepost.exportComparison')}
      </button>
      <button
        type="button"
        onClick={() => setPowerBiOpen(true)}
        className="rounded-full bg-brand-gold px-3.5 py-1.5 text-xs font-extrabold text-neutral-950 transition hover:brightness-105"
      >
        {t('powerbi.cta')}
      </button>
    </div>
  )

  return (
    <div className="mt-5 space-y-4">
      {error && <p className="alert-error text-sm">{error}</p>}

      {preview && (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-gold/40 bg-brand-gold-soft/30 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-neutral-800">
            <strong>{t('prepost.previewRows', { n: String(preview.rows.length) })}</strong>{' '}
            {t('prepost.previewMatched', {
              n: String(preview.matched.length),
              total: String(preview.matched.length + preview.missing.length),
            })}
            {preview.missing.length > 0 && ` ${t('prepost.previewMissing', { ids: preview.missing.join(', ') })}`}
          </p>
          <div className="flex shrink-0 gap-2">
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
      {importMsg && <p className="alert-brand text-sm">{importMsg}</p>}

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Cartão principal */}
        <section className="flex flex-col justify-between gap-6 rounded-3xl bg-neutral-950 p-6 text-white lg:row-span-2">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-gold-light">
              {t('prepost.heroKicker')}
            </p>
            <p className="mt-4 font-display text-6xl font-bold leading-none text-brand-gold-light">
              {avgGain === null ? '—' : `${avgGain > 0 ? '+' : ''}${avgGain}`}
              <span className="ml-1 text-2xl text-brand-gold-light/70">p.p.</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">
              {hasPre || hasPost ? t('prepost.heroBody') : t('prepost.importHint')}
            </p>
          </div>

          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <div>
                <dt className="text-[11px] font-semibold text-neutral-400">{t('prepost.preTest')}</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">{pre.length}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold text-neutral-400">{t('prepost.postTest')}</dt>
                <dd className="mt-0.5 text-2xl font-bold tabular-nums">{post.length}</dd>
              </div>
            </dl>
            <p className="text-[11px] leading-snug text-neutral-500">{t('prepost.anonNote')}</p>
            {actions}
          </div>
        </section>

        {/* Indicadores: anel de fora = depois, de dentro = antes */}
        {indicators.map((k) => (
          <article key={k.label} className="flex flex-col rounded-3xl border border-brand-line bg-white p-5">
            <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-neutral-800">{k.label}</p>
            <div className="mt-3 flex items-center gap-4">
              <BeforeAfterRing before={k.before} after={k.after} label={k.label} />
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs text-neutral-500">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-neutral-400 align-middle" />
                  {t('prepost.before')}{' '}
                  <span className="font-bold tabular-nums text-neutral-700">{k.before === null ? '—' : pctFmt(k.before)}</span>
                </p>
                <p className="text-xs text-neutral-500">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-brand-gold align-middle" />
                  {t('prepost.after')}{' '}
                  <span className="font-bold tabular-nums text-neutral-900">{k.after === null ? '—' : pctFmt(k.after)}</span>
                </p>
                <Delta before={k.before} after={k.after} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Faixa do pós-teste */}
      <section className="flex flex-col gap-4 rounded-3xl border border-brand-line bg-white p-5 lg:flex-row lg:items-center">
        <p className="shrink-0 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-gold-ink lg:pr-2">
          {t('prepost.postOnly')}
        </p>
        <dl className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
          {postStats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <Pie size={38} slices={s.ring === null ? [] : [{ label: s.label, pct: s.ring, color: GOLD }]} />
              <div className="min-w-0">
                <dd className="text-lg font-bold leading-none tabular-nums text-neutral-900">{s.value}</dd>
                <dt className="mt-1 text-xs leading-snug text-neutral-500">{s.label}</dt>
              </div>
            </div>
          ))}
        </dl>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="shrink-0 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-bold text-brand-gold-light hover:bg-black"
        >
          {t('prepost.allQuestions')} →
        </button>
      </section>

      {powerBiOpen && <PowerBiConnect onClose={() => setPowerBiOpen(false)} />}

      {detailsOpen && (
        <DetailsDrawer
          stats={stats}
          post={post}
          fileSlug={fileSlug}
          onClose={() => setDetailsOpen(false)}
          t={t}
        />
      )}
    </div>
  )
}

/* ---------------- Todas as perguntas (janela) ---------------- */

function DetailsDrawer({
  stats,
  post,
  fileSlug,
  onClose,
  t,
}: {
  stats: Record<string, Pair>
  post: SurveyAnswers[]
  fileSlug: string
  onClose: () => void
  t: TFn
}) {
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

  const groups: { title: string; ids: string[] }[] = [
    { title: t('prepost.groupCompared'), ids: SURVEY_QUESTIONS.filter((q) => q.block === 'B').map((q) => q.id) },
    { title: t('prepost.postOnly'), ids: ['C1', 'C2', 'C3', 'C4', 'C5'] },
    { title: t('prepost.blockA'), ids: ['A1', 'A2', 'A3'] },
  ]
  const comments = stats.C7.post.comments

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40" onClick={onClose} role="presentation">
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('prepost.allQuestions')}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-2xl flex-col bg-brand-cream shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-brand-line bg-white px-6 py-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-neutral-900">{t('prepost.allQuestions')}</h2>
            <p className="text-xs text-neutral-500">{t('prepost.detailsHint')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('prepost.close')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-line text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
          >
            ✕
          </button>
        </header>
        <div className="scroll-thin flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {groups.map((g) => (
            <section key={g.title}>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">{g.title}</p>
              <div className="divide-y divide-brand-line overflow-hidden rounded-2xl border border-brand-line bg-white">
                {g.ids.map((id) => (
                  <QuestionRow key={id} q={question(id)} pair={stats[id]} t={t} />
                ))}
              </div>
            </section>
          ))}
          <section>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">
              {t('prepost.comments')} ({comments.length})
            </p>
            {comments.length === 0 ? (
              <p className="text-sm italic text-neutral-400">{t('prepost.noComments')}</p>
            ) : (
              <ul className="space-y-2">
                {comments.map((c, i) => (
                  <li key={i} className="whitespace-pre-line rounded-2xl border border-brand-line bg-white px-4 py-3 text-sm text-neutral-700">
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {post.length > 0 && (
            <button
              type="button"
              onClick={() =>
                downloadCsv(`pos-teste-respostas-${fileSlug}.csv`, [
                  SURVEY_QUESTIONS.map((c) => `${c.id}. ${c.text}`),
                  ...post.map((ans) =>
                    SURVEY_QUESTIONS.map((c) => {
                      const v = ans[c.id]
                      return Array.isArray(v) ? v.join(' | ') : (v ?? null)
                    })
                  ),
                ])
              }
              className="text-sm font-semibold text-brand-gold-ink underline underline-offset-2 hover:text-neutral-900"
            >
              {t('prepost.exportPost')}
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

function QuestionRow({ q, pair, t }: { q: SurveyQuestion; pair: Pair; t: TFn }) {
  const [open, setOpen] = useState(false)
  const { pre, post } = pair
  const key = q.correct ?? q.target
  const p = (v: number | null | undefined) => (v === null || v === undefined ? '—' : pctFmt(v))
  const m = (v: number | null | undefined) => (v === null || v === undefined ? '—' : decFmt(v))
  const summary =
    key && post.keyPct !== null
      ? `${pre ? `${p(pre.keyPct)} → ` : ''}${p(post.keyPct)}`
      : post.mean !== null
        ? `${t('prepost.mean')} ${pre ? `${m(pre.mean)} → ` : ''}${m(post.mean)}`
        : `n = ${pre ? `${pre.n} → ` : ''}${post.n}`

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-brand-cream/60"
      >
        <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-800">{q.text}</span>
        <span className="shrink-0 text-xs font-bold tabular-nums text-neutral-500">{summary}</span>
        <span className={`shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          ⌄
        </span>
      </button>
      {open && (
        <div className="px-4 pb-5">
          {q.kind === 'multi' ? <MultiBars pre={pre} post={post} t={t} /> : <PieCompare q={q} pre={pre} post={post} t={t} />}
        </div>
      )}
    </div>
  )
}

function PieCompare({ q, pre, post, t }: { q: SurveyQuestion; pre: QuestionStats | null; post: QuestionStats; t: TFn }) {
  const postSlices = slicesFor(q, post)
  const preSlices = pre ? slicesFor(q, pre) : null
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex shrink-0 items-end justify-center gap-4">
        {preSlices && (
          <figure className="flex flex-col items-center gap-1">
            <Pie size={84} slices={preSlices} />
            <figcaption className="text-[11px] font-semibold text-neutral-500">{t('prepost.before')}</figcaption>
          </figure>
        )}
        <figure className="flex flex-col items-center gap-1">
          <Pie size={104} slices={postSlices} />
          <figcaption className="text-[11px] font-semibold text-neutral-500">{t('prepost.after')}</figcaption>
        </figure>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {postSlices.map((s) => {
          const before = preSlices?.find((x) => x.label === s.label)
          return (
            <li key={s.label} className="flex items-start gap-2">
              <span className="mt-0.5 h-3 w-3 shrink-0 rounded-[3px]" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 leading-snug text-neutral-700">{s.label}</span>
              <span className="shrink-0 tabular-nums text-neutral-500">
                {preSlices ? `${pctFmt(before?.pct ?? 0)} → ` : ''}
                <strong className="text-neutral-900">{pctFmt(s.pct)}</strong>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function MultiBars({ pre, post, t }: { pre: QuestionStats | null; post: QuestionStats; t: TFn }): ReactNode {
  return (
    <>
      <p className="mb-3 text-xs text-neutral-500">{t('prepost.multiNote')}</p>
      <ul className="space-y-2">
        {post.options.map((o) => {
          const before = pre?.options.find((x) => x.option === o.option)
          return (
            <li key={o.option} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_96px] items-center gap-3">
              <span className="text-xs leading-snug text-neutral-700">{o.option}</span>
              <span className="flex flex-col gap-0.5">
                {pre && (
                  <span className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <span className="block h-full rounded-full bg-neutral-400" style={{ width: `${before?.pct ?? 0}%` }} />
                  </span>
                )}
                <span className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <span className="block h-full rounded-full bg-brand-gold" style={{ width: `${o.pct}%` }} />
                </span>
              </span>
              <span className="text-right text-xs tabular-nums text-neutral-500">
                {pre ? `${pctFmt(before?.pct ?? 0)} → ` : ''}
                <strong className="text-neutral-900">{pctFmt(o.pct)}</strong>
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}
