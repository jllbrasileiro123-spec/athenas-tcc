import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandSelect } from '../components/BrandSelect'
import { EmptyState, FolderIcon } from '../components/EmptyState'
import {
  downloadCsv,
  fetchCourseReport,
  fetchFeedbackReport,
  fetchReportCourses,
  isMissingReports,
  type CourseReport,
  type FeedbackReport,
  type ReportCourse,
  type StudentQuizResult,
} from '../lib/adminReports'

type Tab = 'desempenho' | 'feedback'

function scoreClass(pct: number | null | undefined) {
  if (pct === null || pct === undefined) return 'text-neutral-400'
  if (pct >= 70) return 'text-emerald-700'
  if (pct >= 50) return 'text-amber-700'
  return 'text-red-700'
}

function shortQuizTitle(title: string) {
  return title.replace(/^Quiz\s*[—-]\s*/i, '').replace(/^M\d+ · /, '')
}

export function AdminReports() {
  const { t, language } = useLanguage()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('aba') === 'feedback' ? 'feedback' : 'desempenho'

  const [courses, setCourses] = useState<ReportCourse[]>([])
  const [courseId, setCourseId] = useState('')
  const [report, setReport] = useState<CourseReport | null>(null)
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const locale = language === 'pt' ? 'pt-BR' : 'en-US'
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  useEffect(() => {
    void fetchReportCourses().then(({ courses: list, error: err }) => {
      if (err) {
        setError(isMissingReports(err) ? t('reports.missingSql') : err)
        setLoading(false)
        return
      }
      setCourses(list)
      const fromUrl = params.get('curso')
      const initial =
        list.find((c) => c.id === fromUrl) ?? [...list].sort((a, b) => b.students - a.students)[0]
      if (initial) setCourseId(initial.id)
      else setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void Promise.all([fetchCourseReport(courseId), fetchFeedbackReport(courseId)]).then(
      ([perf, fb]) => {
        if (cancelled) return
        const err = perf.error ?? fb.error
        if (err) setError(isMissingReports(err) ? t('reports.missingSql') : err)
        setReport(perf.report)
        setFeedback(fb.report)
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [courseId, t])

  function setTab(next: Tab) {
    const p = new URLSearchParams(params)
    if (next === 'feedback') p.set('aba', 'feedback')
    else p.delete('aba')
    setParams(p, { replace: true })
  }

  function selectCourse(id: string) {
    setCourseId(id)
    const p = new URLSearchParams(params)
    p.set('curso', id)
    setParams(p, { replace: true })
  }

  const students = useMemo(() => {
    const list = report?.students ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (s) => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
    )
  }, [report, query])

  const stats = useMemo(() => {
    const list = report?.students ?? []
    const finished = list.filter((s) => s.total_lessons > 0 && s.completed_count >= s.total_lessons)
    const scored = list.filter((s) => s.final_score !== null && s.total_questions > 0)
    const avg = scored.length
      ? Math.round(scored.reduce((sum, s) => sum + (s.final_score ?? 0), 0) / scored.length)
      : null
    return { enrolled: list.length, finished: finished.length, avg }
  }, [report])

  const quizAverages = useMemo(() => {
    const out: Record<string, number | null> = {}
    for (const quiz of report?.quizzes ?? []) {
      const values = (report?.students ?? [])
        .map((s) => s.quizzes[quiz.id]?.percent)
        .filter((v): v is number => typeof v === 'number')
      out[quiz.id] = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null
    }
    return out
  }, [report])

  const courseTitle = courses.find((c) => c.id === courseId)?.title ?? ''

  function exportPerformance() {
    if (!report) return
    const quizzes = report.quizzes
    const header = [
      t('reports.colStudent'),
      t('reports.colEmail'),
      t('reports.colEnrolled'),
      t('reports.colProgress'),
      ...quizzes.flatMap((q) => [
        `${shortQuizTitle(q.title)} — ${t('reports.csvHits')}`,
        `${shortQuizTitle(q.title)} — %`,
        `${shortQuizTitle(q.title)} — ${t('reports.csvAttempts')}`,
      ]),
      t('reports.colTotalHits'),
      t('reports.colFinal'),
      t('reports.colCertificate'),
      t('reports.colRating'),
    ]
    const rows = report.students.map((s) => [
      s.full_name ?? '',
      s.email ?? '',
      fmtDate(s.enrolled_at),
      `${s.progress_pct}%`,
      ...quizzes.flatMap((q) => {
        const r = s.quizzes[q.id]
        if (!r || r.percent === null) return [r?.legacy_completed ? t('reports.legacyShort') : '', '', r?.attempts ?? 0]
        return [`${r.correct}/${r.total}`, r.percent, r.attempts]
      }),
      s.total_questions ? `${s.total_correct}/${s.total_questions}` : '',
      s.final_score ?? '',
      s.certificate_code ?? '',
      s.feedback_rating ?? '',
    ])
    downloadCsv(`relatorio-desempenho-${courseTitle.slice(0, 40) || 'curso'}.csv`, [header, ...rows])
  }

  function exportFeedback() {
    if (!feedback) return
    downloadCsv(`feedback-${courseTitle.slice(0, 40) || 'curso'}.csv`, [
      [t('reports.colStudent'), t('reports.colRating'), t('feedback.recommendQ'), t('reports.colComment'), t('reports.colDate')],
      ...feedback.items.map((f) => [
        f.full_name ?? '',
        f.rating,
        f.would_recommend === null ? '' : f.would_recommend ? t('feedback.yes') : t('feedback.no'),
        f.comment ?? '',
        fmtDate(f.updated_at),
      ]),
    ])
  }

  return (
    <div className="page-shell">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">{t('reports.kicker')}</p>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold text-neutral-900">{t('reports.title')}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t('reports.desc')}</p>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          {courses.length > 0 && (
            <div className="sm:w-96">
              <BrandSelect
                aria-label={t('reports.course')}
                value={courseId}
                onChange={selectCourse}
                options={courses.map((c) => ({
                  value: c.id,
                  label: `${c.title} (${c.students})`,
                }))}
              />
            </div>
          )}
          <div className="flex gap-2 p-1 bg-white border border-brand-gold/20 rounded-full w-full sm:w-fit shadow-sm">
            <TabBtn active={tab === 'desempenho'} onClick={() => setTab('desempenho')}>
              {t('reports.tabPerformance')}
            </TabBtn>
            <TabBtn active={tab === 'feedback'} onClick={() => setTab('feedback')}>
              {t('reports.tabFeedback')} ({feedback?.summary.count ?? 0})
            </TabBtn>
          </div>
        </div>

        {error && <p className="mt-4 alert-error text-sm">{error}</p>}

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="spinner-athenas" />
          </div>
        ) : !courseId ? (
          !error && (
            <div className="mt-6">
              <EmptyState icon={<FolderIcon />} title={t('reports.noCourses')} />
            </div>
          )
        ) : tab === 'desempenho' ? (
          report && (
            <>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label={t('reports.statEnrolled')} value={String(stats.enrolled)} />
                <Stat label={t('reports.statFinished')} value={String(stats.finished)} />
                <Stat
                  label={t('reports.statAvgFinal')}
                  value={stats.avg === null ? '—' : `${stats.avg}%`}
                  tone={scoreClass(stats.avg)}
                />
                <Stat label={t('reports.statQuizzes')} value={String(report.quizzes.length)} />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('reports.searchPh')}
                  aria-label={t('reports.searchPh')}
                  className="input-athenas !py-2 !text-sm sm:max-w-xs"
                />
                <button
                  type="button"
                  onClick={exportPerformance}
                  disabled={report.students.length === 0}
                  className="btn-secondary !px-4 !py-2 text-sm"
                >
                  {t('reports.exportCsv')}
                </button>
              </div>

              {report.students.length === 0 ? (
                <div className="mt-6">
                  <EmptyState icon={<FolderIcon />} title={t('reports.noStudents')} />
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-brand-gold/20 bg-white shadow-sm">
                  <table className="min-w-full text-sm">
                    <thead className="bg-brand-gold-soft/40 text-left text-[11px] uppercase tracking-wide text-neutral-600">
                      <tr>
                        <th className="px-4 py-3 font-bold sticky left-0 bg-[#fbf3e3] z-10">{t('reports.colStudent')}</th>
                        <th className="px-3 py-3 font-bold">{t('reports.colProgress')}</th>
                        {report.quizzes.map((q, i) => (
                          <th key={q.id} className="px-3 py-3 font-bold min-w-[120px]" title={q.title}>
                            <span className="block">{t('reports.quizN', { n: String(i + 1) })}</span>
                            <span className="block normal-case tracking-normal font-medium text-neutral-500 line-clamp-2">
                              {shortQuizTitle(q.title)}
                            </span>
                          </th>
                        ))}
                        <th className="px-3 py-3 font-bold">{t('reports.colTotalHits')}</th>
                        <th className="px-3 py-3 font-bold">{t('reports.colFinal')}</th>
                        <th className="px-3 py-3 font-bold">{t('reports.colCertificate')}</th>
                        <th className="px-3 py-3 font-bold">{t('reports.colRating')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {students.map((s) => (
                        <tr key={s.user_id} className="align-top hover:bg-brand-cream/60">
                          <td className="px-4 py-3 sticky left-0 bg-white z-10">
                            <p className="font-semibold text-neutral-900">{s.full_name ?? t('admin.unnamed')}</p>
                            {s.email && <p className="text-xs text-neutral-500">{s.email}</p>}
                            <p className="text-[11px] text-neutral-400">
                              {t('reports.since', { date: fmtDate(s.enrolled_at) })}
                            </p>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <p className="font-semibold text-neutral-900">{s.progress_pct}%</p>
                            <p className="text-xs text-neutral-500">
                              {s.completed_count}/{s.total_lessons}
                            </p>
                            <div className="mt-1 h-1.5 w-20 rounded-full bg-brand-gold-soft overflow-hidden">
                              <div className="h-full bg-brand-gold" style={{ width: `${s.progress_pct}%` }} />
                            </div>
                          </td>
                          {report.quizzes.map((q) => (
                            <td key={q.id} className="px-3 py-3 whitespace-nowrap">
                              <QuizCell result={s.quizzes[q.id]} t={t} />
                            </td>
                          ))}
                          <td className="px-3 py-3 whitespace-nowrap font-semibold text-neutral-900">
                            {s.total_questions ? `${s.total_correct}/${s.total_questions}` : '—'}
                          </td>
                          <td className={`px-3 py-3 whitespace-nowrap text-base font-bold ${scoreClass(s.total_questions ? s.final_score : null)}`}>
                            {s.total_questions && s.final_score !== null ? `${s.final_score}%` : '—'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {s.certificate_code ? (
                              <>
                                <p className="font-mono text-xs font-bold text-neutral-900">{s.certificate_code}</p>
                                <p className="text-[11px] text-neutral-500">{fmtDate(s.certificate_issued_at)}</p>
                              </>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-brand-gold">
                            {s.feedback_rating ? '★'.repeat(s.feedback_rating) : <span className="text-neutral-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {report.quizzes.length > 0 && (
                      <tfoot className="bg-neutral-50 text-xs">
                        <tr>
                          <td className="px-4 py-3 font-bold text-neutral-700 sticky left-0 bg-neutral-50 z-10">
                            {t('reports.classAvg')}
                          </td>
                          <td />
                          {report.quizzes.map((q) => (
                            <td key={q.id} className={`px-3 py-3 font-bold ${scoreClass(quizAverages[q.id])}`}>
                              {quizAverages[q.id] === null ? '—' : `${quizAverages[q.id]}%`}
                            </td>
                          ))}
                          <td />
                          <td className={`px-3 py-3 font-bold ${scoreClass(stats.avg)}`}>
                            {stats.avg === null ? '—' : `${stats.avg}%`}
                          </td>
                          <td />
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-neutral-500 leading-relaxed">{t('reports.legend')}</p>
            </>
          )
        ) : (
          feedback && (
            <>
              <div className="mt-6 grid md:grid-cols-3 gap-3">
                <div className="card-athenas p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{t('reports.avgRating')}</p>
                  <p className="mt-1 text-3xl font-bold text-neutral-900">
                    {feedback.summary.avg_rating ?? '—'}
                    <span className="ml-1 text-brand-gold text-2xl">★</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {t('reports.feedbackCount', { n: String(feedback.summary.count) })}
                  </p>
                </div>
                <div className="card-athenas p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{t('reports.recommend')}</p>
                  <p className="mt-1 text-3xl font-bold text-neutral-900">
                    {feedback.summary.recommend_yes + feedback.summary.recommend_no > 0
                      ? `${Math.round(
                          (feedback.summary.recommend_yes * 100) /
                            (feedback.summary.recommend_yes + feedback.summary.recommend_no)
                        )}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {t('reports.recommendSplit', {
                      yes: String(feedback.summary.recommend_yes),
                      no: String(feedback.summary.recommend_no),
                    })}
                  </p>
                </div>
                <div className="card-athenas p-5 space-y-1">
                  {(['5', '4', '3', '2', '1'] as const).map((n) => {
                    const count = feedback.summary.by_rating[n] ?? 0
                    const pct = feedback.summary.count ? (count * 100) / feedback.summary.count : 0
                    return (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-neutral-600">{n}★</span>
                        <div className="flex-1 h-2 rounded-full bg-brand-gold-soft overflow-hidden">
                          <div className="h-full bg-brand-gold" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-neutral-600">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={exportFeedback}
                  disabled={feedback.items.length === 0}
                  className="btn-secondary !px-4 !py-2 text-sm"
                >
                  {t('reports.exportCsv')}
                </button>
              </div>

              {feedback.items.length === 0 ? (
                <div className="mt-4">
                  <EmptyState icon={<FolderIcon />} title={t('reports.noFeedback')} />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {feedback.items.map((f) => (
                    <article key={f.id} className="card-athenas p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-neutral-900">{f.full_name ?? t('admin.unnamed')}</p>
                          <p className="text-brand-gold text-lg leading-none mt-1" aria-label={`${f.rating}/5`}>
                            {'★'.repeat(f.rating)}
                            <span className="text-neutral-300">{'★'.repeat(5 - f.rating)}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-neutral-500">{fmtDate(f.updated_at)}</p>
                          {f.would_recommend !== null && (
                            <span
                              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                f.would_recommend
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {f.would_recommend ? t('reports.recommends') : t('reports.notRecommends')}
                            </span>
                          )}
                        </div>
                      </div>
                      {f.comment ? (
                        <p className="mt-3 text-sm text-neutral-700 whitespace-pre-line leading-relaxed">{f.comment}</p>
                      ) : (
                        <p className="mt-3 text-sm text-neutral-400 italic">{t('reports.noComment')}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  )
}

type TFn = ReturnType<typeof useLanguage>['t']

function QuizCell({ result, t }: { result: StudentQuizResult | undefined; t: TFn }) {
  if (!result || (result.percent === null && !result.legacy_completed)) {
    return <span className="text-neutral-400">{t('reports.notTaken')}</span>
  }
  if (result.percent === null) {
    return (
      <span className="text-emerald-700 text-xs font-semibold" title={t('reports.legacyHint')}>
        {t('reports.legacyShort')}
      </span>
    )
  }
  return (
    <div>
      <p className={`font-bold ${scoreClass(result.percent)}`}>
        {result.correct}/{result.total} · {result.percent}%
      </p>
      <p className="text-[11px] text-neutral-500">
        {result.attempts === 1
          ? t('reports.oneAttempt')
          : t('reports.attempts', { n: String(result.attempts) })}
        {result.attempts > 1 && result.first_percent !== null
          ? ` · ${t('reports.firstTry', { n: String(result.first_percent) })}`
          : ''}
      </p>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card-athenas p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone ?? 'text-neutral-900'}`}>{value}</p>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-bold transition-colors ${
        active ? 'bg-neutral-950 text-brand-gold' : 'bg-transparent text-neutral-700 hover:bg-brand-gold-soft/40'
      }`}
    >
      {children}
    </button>
  )
}
