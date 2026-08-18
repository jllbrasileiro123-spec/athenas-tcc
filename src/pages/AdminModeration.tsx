import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../contexts/LanguageContext'
import type { Course, InstructorApplication } from '../types/database'

type AppRow = InstructorApplication & {
  profiles?: { full_name: string | null; id: string } | null
}

type CourseRow = Course & {
  profiles?: { full_name: string | null } | null
}

export function AdminModeration() {
  const { t } = useLanguage()
  const [tab, setTab] = useState<'instructors' | 'courses'>('instructors')
  const [apps, setApps] = useState<AppRow[]>([])
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
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
    if (appsRes.error) setError(appsRes.error.message)
    else setApps((appsRes.data as AppRow[]) ?? [])
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
      note: notes[id]?.trim() || null,
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
      note: notes[id]?.trim() || null,
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

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/instrutor/novo-curso" className="btn-primary !py-2.5 !px-4">
            {t('admin.createCourse')}
          </Link>
          <Link to="/instrutor" className="btn-secondary !py-2.5 !px-4">
            {t('admin.myCourses')}
          </Link>
        </div>

        <div className="mt-6 flex gap-2">
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
              <EmptyState text={t('admin.noInstructorApps')} />
            ) : (
              apps.map((app) => (
                <article key={app.id} className="card-athenas p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-neutral-900">
                        {app.profiles?.full_name ?? t('admin.unnamed')}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {new Date(app.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
                      {t('instructorApply.badgePending')}
                    </span>
                  </div>
                  <Field label={t('instructorApply.expertise')} value={app.expertise} />
                  <Field label={t('instructorApply.bio')} value={app.bio} />
                  {app.portfolio_url && (
                    <p className="text-sm">
                      <span className="font-bold text-neutral-700">{t('instructorApply.portfolio')}: </span>
                      <a
                        href={app.portfolio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="link-athenas break-all"
                      >
                        {app.portfolio_url}
                      </a>
                    </p>
                  )}
                  <textarea
                    rows={2}
                    value={notes[app.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [app.id]: e.target.value }))}
                    placeholder={t('admin.notePh')}
                    className="input-athenas !rounded-xl text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
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
              <EmptyState text={t('admin.noCourseReviews')} />
            ) : (
              courses.map((c) => (
                <article key={c.id} className="card-athenas p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-neutral-900">{c.title}</p>
                      <p className="text-sm text-neutral-600 mt-0.5">
                        {t('course.by')} {c.profiles?.full_name ?? t('common.instructor')}
                      </p>
                    </div>
                    <a href={`/curso/${c.id}`} className="link-athenas text-sm">
                      {t('instructor.view')}
                    </a>
                  </div>
                  {c.description && (
                    <p className="text-sm text-neutral-600 line-clamp-3">{c.description}</p>
                  )}
                  <textarea
                    rows={2}
                    value={notes[c.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                    placeholder={t('admin.notePh')}
                    className="input-athenas !rounded-xl text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => void reviewCourse(c.id, 'approved')}
                      className="btn-primary !py-2 !px-4"
                    >
                      {t('admin.approveCourse')}
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
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
        active
          ? 'bg-neutral-950 text-brand-gold'
          : 'bg-white border border-brand-gold/30 text-neutral-700 hover:bg-brand-gold-soft'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm text-neutral-800 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-athenas bg-brand-cream/40 text-sm text-neutral-600">
      {text}
    </div>
  )
}
