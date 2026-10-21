import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { EmptyState, FolderIcon } from './EmptyState'
import {
  downloadCsv,
  fetchPlacementReport,
  type PlacementReport as Report,
  type PlacementReportModule,
} from '../lib/adminReports'

/** Aba "Nivelamento" do relatório: resultado de cada aluno no teste diagnóstico */
export function PlacementReport({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const { t, language } = useLanguage()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const locale = language === 'pt' ? 'pt-BR' : 'en-US'
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchPlacementReport(courseId).then(({ report: r, error: err }) => {
      if (cancelled) return
      if (err) {
        setError(err.includes('admin_placement_report') || err.includes('schema cache') ? t('placementReport.missingSql') : err)
      }
      setReport(r)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [courseId, t])

  const students = report?.students ?? []
  const modules = report?.modules ?? []

  const stats = useMemo(() => {
    const n = students.length
    const avg = n
      ? Math.round(
          (students.reduce((s, x) => s + (x.total_count ? x.correct_count / x.total_count : 0), 0) / n) * 100
        )
      : null
    const dontKnow = n ? (students.reduce((s, x) => s + x.dont_know_count, 0) / n).toFixed(1) : null
    const skipped = modules.map((m) => ({
      title: m.title,
      count: students.filter((s) => s.modules.some((r) => r.module_id === m.id && r.skipped)).length,
    }))
    return { n, avg, dontKnow, skipped }
  }, [students, modules])

  function cellFor(studentModules: PlacementReportModule[], moduleId: string) {
    return studentModules.find((r) => r.module_id === moduleId)
  }

  function statusLabel(r: PlacementReportModule) {
    if (r.skipped && r.partial) return t('placementReport.partial')
    if (r.skipped) return t('placementReport.skipped')
    return t('placementReport.toDo')
  }

  function exportCsv() {
    const header = [
      t('reports.colStudent'),
      t('reports.colEmail'),
      t('reports.colDate'),
      t('placementReport.colTotal'),
      t('placementReport.colDontKnow'),
      ...modules.flatMap((m) => [
        `${m.title} — ${t('reports.csvHits')}`,
        m.title,
        `${m.title} — ${t('placementReport.csvTopics')}`,
      ]),
    ]
    const rows = students.map((s) => [
      s.full_name ?? '',
      s.email ?? '',
      fmtDate(s.taken_at),
      `${s.correct_count}/${s.total_count}`,
      s.dont_know_count,
      ...modules.flatMap((m) => {
        const r = cellFor(s.modules, m.id)
        return r ? [`${r.hits}/${r.total}`, statusLabel(r), r.review_topics.join('; ')] : ['', '', '']
      }),
    ])
    downloadCsv(`nivelamento-${courseTitle.slice(0, 40) || 'curso'}.csv`, [header, ...rows])
  }

  if (loading) {
    return (
      <div className="mt-12 flex justify-center">
        <div className="spinner-athenas" />
      </div>
    )
  }

  if (error) return <p className="mt-6 alert-error text-sm">{error}</p>

  if (students.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState icon={<FolderIcon />} title={t('placementReport.none')} />
      </div>
    )
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t('placementReport.statTaken')} value={String(stats.n)} />
        <Stat label={t('placementReport.statAvg')} value={stats.avg === null ? '—' : `${stats.avg}%`} />
        <Stat label={t('placementReport.statDontKnow')} value={stats.dontKnow ?? '—'} />
        {stats.skipped.length > 0 && (
          <div className="card-athenas p-4 text-xs space-y-0.5">
            {stats.skipped.map((m) => (
              <p key={m.title} className="flex justify-between gap-2 text-neutral-600">
                <span className="truncate">{t('placementReport.statSkipped', { module: m.title })}</span>
                <span className="font-bold text-neutral-900">{m.count}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={exportCsv} className="btn-secondary !px-4 !py-2 text-sm">
          {t('reports.exportCsv')}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-brand-gold/20 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-gold-soft/40 text-left text-[11px] uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-bold sticky left-0 bg-[#fbf3e3] z-10">{t('reports.colStudent')}</th>
              <th className="px-3 py-3 font-bold">{t('placementReport.colTotal')}</th>
              <th className="px-3 py-3 font-bold">{t('placementReport.colDontKnow')}</th>
              {modules.map((m, i) => (
                <th key={m.id} className="px-3 py-3 font-bold min-w-[120px]" title={m.title}>
                  <span className="block">{t('module.label', { n: String(i + 1) })}</span>
                  <span className="block normal-case tracking-normal font-medium text-neutral-500 line-clamp-2">
                    {m.title}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {students.map((s) => (
              <tr key={s.user_id} className="align-top hover:bg-brand-cream/60">
                <td className="px-4 py-3 sticky left-0 bg-white z-10">
                  <p className="font-semibold text-neutral-900">{s.full_name ?? t('admin.unnamed')}</p>
                  {s.email && <p className="text-xs text-neutral-500">{s.email}</p>}
                  <p className="text-[11px] text-neutral-400">{fmtDate(s.taken_at)}</p>
                </td>
                <td className="px-3 py-3 whitespace-nowrap font-semibold text-neutral-900">
                  {s.correct_count}/{s.total_count}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-neutral-700">{s.dont_know_count}</td>
                {modules.map((m) => {
                  const r = cellFor(s.modules, m.id)
                  return (
                    <td key={m.id} className="px-3 py-3 whitespace-nowrap" title={r?.review_topics.join('\n') || undefined}>
                      {r ? (
                        <>
                          <p className={`font-bold ${r.skipped ? 'text-emerald-700' : 'text-neutral-900'}`}>
                            {r.hits}/{r.total}
                          </p>
                          <p className="text-[11px] text-neutral-500">{statusLabel(r)}</p>
                        </>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500 leading-relaxed">{t('placementReport.legend')}</p>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-athenas p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  )
}
