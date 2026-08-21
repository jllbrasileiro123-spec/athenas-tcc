import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../contexts/LanguageContext'
import { EmptyState, FolderIcon } from '../components/EmptyState'
import type { TranslationKey } from '../i18n/translations'
import type { Course, InstructorApplication } from '../types/database'

type AppRow = InstructorApplication & {
  profiles?: { full_name: string | null; id: string } | null
}

type CourseRow = Course & {
  profiles?: { full_name: string | null } | null
}

type TFn = (key: TranslationKey, vars?: Record<string, string>) => string

function formatAgo(iso: string, t: TFn) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return t('admin.justNow')
  if (min < 60) return t('admin.minutesAgo', { n: String(min) })
  const hours = Math.floor(min / 60)
  if (hours < 24) return t('admin.hoursAgo', { n: String(hours) })
  return t('admin.daysAgo', { n: String(Math.floor(hours / 24)) })
}

export function AdminModeration() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<'instructors' | 'courses'>('instructors')
  const [apps, setApps] = useState<AppRow[]>([])
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [appsRes, coursesRes] = await Promise.all([
      supabase
        .from('instructor_applications')
        .select('*, profiles:user_id ( id, full_name )')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('courses')
        .select('*, profiles:instructor_id ( full_name )')
        .eq('review_status', 'pending_review')
        .order('updated_at', { ascending: true }),
    ])
    const missingTable =
      appsRes.error?.message?.includes('instructor_applications') ||
      appsRes.error?.message?.includes('schema cache')
    if (missingTable) {
      setError(t('admin.missingTable'))
    } else if (appsRes.error) {
      setError(appsRes.error.message)
    } else {
      setApps((appsRes.data as AppRow[]) ?? [])
    }
    if (coursesRes.error) setError((prev) => prev ?? coursesRes.error!.message)
    else setCourses((coursesRes.data as CourseRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function reviewApp(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    setError(null)
    const { error: err } = await supabase.rpc('review_instructor_application', {
      application_id: id,
      new_status: status,
      note: null,
    })
    setBusyId(null)
    if (err) {
      setError(err.message)
      return
    }
    await load()
  }

  async function reviewCourse(id: string, status: 'approved' | 'rejected') {
    setBusyId(id)
    setError(null)
    const { error: err } = await supabase.rpc('review_course', {
      course_id: id,
      new_status: status,
      note: null,
    })
    setBusyId(null)
    if (err) {
      setError(err.message)
      return
    }
    await load()
  }

  return (
    <div className="page-shell">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{t('admin.title')}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t('admin.desc')}</p>

        <div className="mt-6 flex flex-wrap gap-2 p-1 bg-white border border-brand-gold/20 rounded-full w-full sm:w-fit shadow-sm">
          <TabBtn active={tab === 'instructors'} onClick={() => setTab('instructors')}>
            {t('admin.tabInstructors')} ({apps.length})
          </TabBtn>
          <TabBtn active={tab === 'courses'} onClick={() => setTab('courses')}>
            {t('admin.tabCourses')} ({courses.length})
          </TabBtn>
        </div>

        {error && <p className="mt-4 alert-error">{error}</p>}

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="spinner-athenas" />
          </div>
        ) : tab === 'instructors' ? (
          <div className="mt-6 space-y-4">
            {apps.length === 0 ? (
              <EmptyState icon={<FolderIcon />} title={t('admin.noInstructorApps')} />
            ) : (
              apps.map((app) => (
                <article key={app.id} className="card-athenas p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-lg text-neutral-900">
                        {app.profiles?.full_name ?? t('admin.unnamed')}
                      </p>
                      <p className="mt-1 text-sm text-neutral-700">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                          {t('admin.expertise')} ·{' '}
                        </span>
                        {app.expertise}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-brand-gold">
                      {formatAgo(app.created_at, t)}
                    </span>
                  </div>
                  {app.bio ? (
                    <p className="mt-3 text-sm text-neutral-600 line-clamp-2">{app.bio}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === app.id}
                      onClick={() => void reviewApp(app.id, 'approved')}
                      className="btn-primary !py-2 !px-4"
                    >
                      {t('admin.approve')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === app.id}
                      onClick={() => void reviewApp(app.id, 'rejected')}
                      className="btn-secondary !py-2 !px-4 border-red-300 text-red-800 hover:bg-red-50"
                    >
                      {t('admin.reject')}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {courses.length === 0 ? (
              <EmptyState icon={<FolderIcon />} title={t('admin.noCourseReviews')} />
            ) : (
              courses.map((c) => (
                <article key={c.id} className="card-athenas p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-lg text-neutral-900">{c.title}</p>
                      <p className="mt-1 text-sm text-neutral-700">
                        {c.profiles?.full_name ?? t('admin.unnamed')}
                        {c.level ? ` · ${c.level}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-brand-gold">
                      {formatAgo(c.updated_at, t)}
                    </span>
                  </div>
                  {c.description ? (
                    <p className="mt-3 text-sm text-neutral-600 line-clamp-2">{c.description}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => void reviewCourse(c.id, 'approved')}
                      className="btn-primary !py-2 !px-4"
                    >
                      {t('admin.approve')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => void reviewCourse(c.id, 'rejected')}
                      className="btn-secondary !py-2 !px-4 border-red-300 text-red-800 hover:bg-red-50"
                    >
                      {t('admin.reject')}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-bold transition-colors ${
        active
          ? 'bg-neutral-950 text-brand-gold'
          : 'bg-transparent text-neutral-700 hover:bg-brand-gold-soft/40'
      }`}
    >
      {children}
    </button>
  )
}
