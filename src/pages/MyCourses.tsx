import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { deleteHostedVideo } from '../lib/videoStorage'
import { EmptyState, FolderIcon } from '../components/EmptyState'
import type { TranslationKey } from '../i18n/translations'
import type { Course, Lesson } from '../types/database'

type Tab = 'learning' | 'teaching'
type TFn = (key: TranslationKey, vars?: Record<string, string>) => string

export function MyCourses() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const [learning, setLearning] = useState<Course[]>([])
  const [teaching, setTeaching] = useState<(Course & { lessons: Lesson[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)

  const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin'
  const viewParam = searchParams.get('view')
  const tab: Tab = viewParam === 'teaching' ? 'teaching' : 'learning'

  useEffect(() => {
    if (!viewParam) {
      setSearchParams({ view: 'learning' }, { replace: true })
    }
  }, [viewParam, setSearchParams])

  const load = useCallback(async (silent = false) => {
    if (!user?.id) return
    const uid = user.id
    if (!silent) setLoading(true)
    setActionError(null)

    const [{ data: enrollData }, { data: teachData }] = await Promise.all([
      supabase
        .from('enrollments')
        .select(`course_id, courses (*, lessons ( id ))`)
        .eq('user_id', uid),
      supabase
        .from('courses')
        .select(`*, lessons (*)`)
        .eq('instructor_id', uid)
        .order('created_at', { ascending: false }),
    ])

    const taught = (teachData ?? []) as (Course & { lessons: Lesson[] })[]
    const taughtIds = new Set(taught.map((c) => c.id))

    if (enrollData) {
      const list = enrollData
        .map((e) => {
          const raw = (e as { courses: Course | Course[] | null }).courses
          return Array.isArray(raw) ? raw[0] : raw
        })
        .filter((c): c is Course & { lessons?: { id: string }[] } => c != null && !taughtIds.has(c.id))
        .map((c) => ({
          ...c,
          lesson_count: Array.isArray(c.lessons) ? c.lessons.length : 0,
        }))
      setLearning(list)
    } else {
      setLearning([])
    }

    const sortedTeach = taught.map((c) => ({
      ...c,
      lessons: [...(c.lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    setTeaching(sortedTeach)
    if (!silent) setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  function setTab(next: Tab) {
    setSearchParams({ view: next })
  }

  async function removeVideo(lesson: Lesson) {
    if (!confirm(t('myCourses.confirmRemoveVideo'))) return
    setDeletingId(lesson.id)
    setActionError(null)
    await deleteHostedVideo(lesson.video_url)
    const { error } = await supabase
      .from('lessons')
      .update({ video_url: null })
      .eq('id', lesson.id)
    setDeletingId(null)
    if (error) {
      setActionError(error.message)
      return
    }
    setTeaching((prev) =>
      prev.map((c) => ({
        ...c,
        lessons: c.lessons.map((l) =>
          l.id === lesson.id ? { ...l, video_url: null } : l
        ),
      }))
    )
  }

  async function deleteLesson(lesson: Lesson, courseId: string) {
    if (!confirm(t('myCourses.confirmDeleteLesson'))) return
    setDeletingId(lesson.id)
    setActionError(null)
    await deleteHostedVideo(lesson.video_url)
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id)
    setDeletingId(null)
    if (error) {
      setActionError(error.message)
      return
    }
    setTeaching((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, lessons: c.lessons.filter((l) => l.id !== lesson.id) }
          : c
      )
    )
  }

  async function deleteCourse(courseId: string) {
    if (!confirm(t('myCourses.confirmDeleteCourse'))) return
    setDeletingCourseId(courseId)
    setActionError(null)
    const course = teaching.find((c) => c.id === courseId)
    if (course) {
      await Promise.all(course.lessons.map((l) => deleteHostedVideo(l.video_url)))
    }
    const { error } = await supabase.from('courses').delete().eq('id', courseId)
    setDeletingCourseId(null)
    if (error) {
      setActionError(error.message)
      return
    }
    setTeaching((prev) => prev.filter((c) => c.id !== courseId))
  }

  const pageTitle = tab === 'teaching' ? t('myCourses.teachingTitle') : t('myCourses.title')
  const pageSubtitle =
    tab === 'teaching' ? t('myCourses.teachingSubtitle') : t('myCourses.learningSubtitle')

  return (
    <div className="page-shell">
      <div className="max-w-4xl mx-auto px-4 py-10 lg:py-12">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{pageTitle}</h1>
            <p className="mt-2 text-sm text-neutral-600 max-w-lg">{pageSubtitle}</p>
          </div>
          {tab === 'teaching' && isInstructor && !loading && (
            <Link
              to="/instrutor/novo-curso"
              className="btn-secondary shrink-0 self-start"
            >
              {t('home.newCourse')}
            </Link>
          )}
        </header>

        {!loading && (
          <div className="flex flex-wrap gap-2 mb-8 p-1 bg-white border border-brand-gold/20 rounded-full w-full sm:w-fit shadow-sm">
            <button
              type="button"
              onClick={() => setTab('learning')}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                tab === 'learning'
                  ? 'bg-neutral-950 text-brand-gold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t('nav.myLearning')}
              {learning.length > 0 && (
                <span className="ml-1.5 opacity-80">({learning.length})</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('teaching')}
              className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                tab === 'teaching'
                  ? 'bg-neutral-950 text-brand-gold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t('nav.myLessons')}
              {teaching.length > 0 && (
                <span className="ml-1.5 opacity-80">({teaching.length})</span>
              )}
            </button>
          </div>
        )}

        {actionError && (
          <p className="mb-4 alert-error" role="alert">
            {actionError}
          </p>
        )}

        {loading ? (
          <PageSkeleton tab={tab} />
        ) : tab === 'teaching' ? (
          <TeachingSection
            courses={teaching}
            isInstructor={isInstructor}
            deletingId={deletingId}
            deletingCourseId={deletingCourseId}
            onRemoveVideo={removeVideo}
            onDeleteLesson={deleteLesson}
            onDeleteCourse={deleteCourse}
            t={t}
          />
        ) : (
          <LearningSection courses={learning} t={t} />
        )}
      </div>
    </div>
  )
}

function PageSkeleton({ tab }: { tab: Tab }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 bg-white border border-neutral-200 rounded-2xl" />
      {tab === 'teaching' && <div className="h-56 bg-white border border-neutral-200 rounded-2xl" />}
    </div>
  )
}

function LearningSection({
  courses,
  t,
}: {
  courses: Course[]
  t: TFn
}) {
  if (courses.length === 0) {
    return (
      <EmptyState
        icon={<BookIcon />}
        title={t('myCourses.learningEmptyTitle')}
        description={t('myCourses.empty')}
      >
        <Link to="/explorar" className="btn-primary">
          {t('myCourses.explore')}
        </Link>
      </EmptyState>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {courses.map((course) => (
        <div
          key={course.id}
          className="card-athenas overflow-hidden"
        >
          <div className="aspect-video bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center">
            <span className="text-4xl font-bold text-brand-gold/70">{course.title.charAt(0)}</span>
          </div>
          <div className="p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold">
              {t('myCourses.learningBadge')}
            </span>
            <h3 className="font-bold text-neutral-900 mt-1">{course.title}</h3>
            <p className="text-xs text-neutral-500 mt-1">
              {course.lesson_count ?? 0}{' '}
              {course.lesson_count === 1 ? t('common.lesson') : t('common.lessons')}
            </p>
            <Link
              to={`/curso/${course.id}`}
              className="inline-block mt-4 text-sm link-athenas"
            >
              {t('myCourses.continue')} →
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

function TeachingSection({
  courses,
  isInstructor,
  deletingId,
  deletingCourseId,
  onRemoveVideo,
  onDeleteLesson,
  onDeleteCourse,
  t,
}: {
  courses: (Course & { lessons: Lesson[] })[]
  isInstructor: boolean
  deletingId: string | null
  deletingCourseId: string | null
  onRemoveVideo: (lesson: Lesson) => void
  onDeleteLesson: (lesson: Lesson, courseId: string) => void
  onDeleteCourse: (courseId: string) => void
  t: TFn
}) {
  if (courses.length === 0) {
    const steps = [t('myCourses.teachingStep1'), t('myCourses.teachingStep2'), t('myCourses.teachingStep3')]

    return (
      <EmptyState
        icon={<FolderIcon />}
        title={t('myCourses.teachingEmptyTitle')}
        description={t('myCourses.teachingEmpty')}
      >
        {isInstructor ? (
          <>
            <ol className="text-left max-w-sm mx-auto space-y-3 mb-8">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-neutral-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-brand-gold text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <Link to="/instrutor/novo-curso" className="btn-primary">
              {t('home.newCourse')}
            </Link>
          </>
        ) : (
          <div className="space-y-4 max-w-sm mx-auto">
            <p className="text-sm text-neutral-600">{t('myCourses.instructorOnly')}</p>
            <Link to="/tornar-se-instrutor" className="btn-primary inline-flex">
              {t('menu.becomeInstructor')}
            </Link>
          </div>
        )}
        <p className="mt-8 pt-6 border-t border-brand-gold/20">
          <Link to="/explorar" className="text-sm link-athenas">
            {t('myCourses.explore')} →
          </Link>
        </p>
      </EmptyState>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600">{t('myCourses.teachingDesc')}</p>
      {courses.map((course) => (
        <article
          key={course.id}
          className="card-athenas overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-brand-gold/15 bg-brand-cream/60 flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-neutral-950 text-brand-gold px-2 py-0.5 rounded">
                {t('myCourses.teachingBadge')}
              </span>
              <h2 className="text-lg font-bold text-neutral-900 mt-2">{course.title}</h2>
              <p className="text-xs text-neutral-500 mt-1">
                {course.published ? t('instructor.published') : t('instructor.draft')}
                {' · '}
                {course.lessons.length}{' '}
                {course.lessons.length === 1 ? t('common.lesson') : t('common.lessons')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                to={`/curso/${course.id}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-neutral-300 hover:border-brand-gold hover:bg-brand-gold-soft/40"
              >
                {t('myCourses.continue')} →
              </Link>
              <button
                type="button"
                disabled={deletingCourseId === course.id}
                onClick={() => onDeleteCourse(course.id)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingCourseId === course.id ? '...' : t('myCourses.deleteCourse')}
              </button>
            </div>
          </div>

          {course.lessons.length === 0 ? (
            <p className="px-5 py-6 text-sm text-neutral-500 text-center border-t border-dashed border-brand-gold/30 bg-brand-gold-soft/20">
              {t('course.noLessons')}
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {course.lessons.map((lesson, i) => (
                <li
                  key={lesson.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      <span className="text-neutral-400 mr-2">{i + 1}.</span>
                      {lesson.title}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 truncate">
                      {lesson.video_url ? t('myCourses.hasVideo') : t('myCourses.noVideo')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {lesson.video_url && (
                      <button
                        type="button"
                        disabled={deletingId === lesson.id}
                        onClick={() => onRemoveVideo(lesson)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border border-neutral-300 hover:border-brand-gold hover:bg-brand-gold-soft/40 disabled:opacity-50"
                      >
                        {t('myCourses.removeVideo')}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={deletingId === lesson.id}
                      onClick={() => onDeleteLesson(lesson, course.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === lesson.id ? '...' : t('myCourses.deleteLesson')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  )
}

function BookIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  )
}
