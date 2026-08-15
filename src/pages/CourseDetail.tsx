import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { InstructorBadge } from '../components/InstructorBadge'
import { TrilhaProgresso } from '../components/TrilhaProgresso'
import { deleteHostedVideo } from '../lib/videoStorage'
import { useGamification } from '../contexts/GamificationContext'
import type { Course, Lesson } from '../types/database'
import type { CourseTrail } from '../lib/gamification'

export function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { fetchTrail } = useGamification()

  const levelLabels: Record<string, string> = {
    iniciante: t('level.beginner'),
    intermediario: t('level.intermediate'),
    avancado: t('level.advanced'),
  }

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [manageError, setManageError] = useState<string | null>(null)
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null)
  const [trail, setTrail] = useState<CourseTrail | null>(null)

  useEffect(() => {
    if (!id) return
    const courseId: string = id
    async function load() {
      const { data: courseData } = await supabase
        .from('courses')
        .select(`*, profiles:instructor_id ( full_name, role )`)
        .eq('id', courseId)
        .single()

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order')

      if (courseData) setCourse(courseData as Course)
      if (lessonsData) setLessons(lessonsData as Lesson[])

      if (user) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle()
        setEnrolled(!!enr)
        const trailData = await fetchTrail(courseId)
        if (trailData) setTrail(trailData)
      }
      setLoading(false)
    }
    load()
  }, [id, user, fetchTrail])

  async function handleEnroll() {
    if (!user) {
      navigate('/', { state: { from: { pathname: `/curso/${id}` } } })
      return
    }
    if (!id) return
    setEnrollError(null)
    setEnrolling(true)
    const { error } = await supabase.from('enrollments').insert({
      user_id: user.id,
      course_id: id,
    })
    setEnrolling(false)
    if (error) {
      setEnrollError(error.message.includes('duplicate') ? t('course.alreadyEnrolled') : error.message)
      return
    }
    setEnrolled(true)
  }

  function startLearning() {
    const firstIncomplete = trail?.lessons.find((l) => !l.completed)
    const first = firstIncomplete ?? lessons.find((l) => l.is_preview) ?? lessons[0]
    if (first) navigate(`/assistir/${id}/${first.id}`)
  }

  async function removeLessonVideo(lessonId: string) {
    if (!confirm(t('myCourses.confirmRemoveVideo'))) return
    setManageError(null)
    setDeletingLessonId(lessonId)
    const lesson = lessons.find((l) => l.id === lessonId)
    await deleteHostedVideo(lesson?.video_url)
    const { error } = await supabase.from('lessons').update({ video_url: null }).eq('id', lessonId)
    setDeletingLessonId(null)
    if (error) setManageError(error.message)
    else {
      setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, video_url: null } : l)))
    }
  }

  async function deleteLessonById(lessonId: string) {
    if (!confirm(t('myCourses.confirmDeleteLesson'))) return
    setManageError(null)
    setDeletingLessonId(lessonId)
    const lesson = lessons.find((l) => l.id === lessonId)
    await deleteHostedVideo(lesson?.video_url)
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
    setDeletingLessonId(null)
    if (error) {
      setManageError(error.message)
      return
    }
    const next = lessons.filter((l) => l.id !== lessonId)
    setLessons(next)
    if (next.length === 0 && id) {
      navigate('/meus-cursos?view=teaching', { replace: true })
    }
  }

  async function deleteOwnCourse() {
    if (!id || !confirm(t('myCourses.confirmDeleteCourse'))) return
    setManageError(null)
    setDeletingLessonId('course')
    const { error } = await supabase.from('courses').delete().eq('id', id)
    setDeletingLessonId(null)
    if (error) setManageError(error.message)
    else navigate('/meus-cursos?view=teaching', { replace: true })
  }

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[40vh]">
        <div className="spinner-athenas" />
      </div>
    )
  }
  if (!course) return <p className="p-8 page-shell text-neutral-600">{t('course.notFound')}</p>

  const instructor = course.profiles?.full_name ?? t('common.instructor')
  const levelLabel = levelLabels[course.level] ?? course.level
  const isOwner = user?.id === course.instructor_id
  const canWatchLesson = (lesson: { is_preview: boolean }) =>
    isOwner || enrolled || lesson.is_preview

  return (
    <div className="page-shell">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="aspect-video bg-gradient-to-br from-neutral-700 to-neutral-950 rounded-2xl flex items-center justify-center text-brand-gold text-6xl font-bold overflow-hidden border border-brand-gold/20">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                course.title.charAt(0)
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <h1 className="text-3xl font-bold text-neutral-900">{course.title}</h1>
              {isOwner && (
                <span className="text-xs font-bold uppercase tracking-wider bg-neutral-950 text-brand-gold px-3 py-1 rounded-full">
                  {t('myCourses.teachingBadge')}
                </span>
              )}
            </div>
            <p className="text-neutral-600 mt-2">{course.description}</p>
            <p className="text-sm text-neutral-500 mt-4 flex flex-wrap items-center gap-2">
              <span>
                {t('course.by')} {instructor}
              </span>
              {(course.profiles?.role === 'instructor' || course.profiles?.role === 'admin') && (
                <InstructorBadge label={t('course.instructorAthenas')} />
              )}
              <span>
                · {lessons.length}{' '}
                {lessons.length !== 1 ? t('common.lessons') : t('common.lesson')} · {levelLabel}
              </span>
            </p>
          </div>

          <aside className="card-athenas p-6 h-fit sticky top-24">
            <p className="text-2xl font-bold text-neutral-900">
              {course.price > 0 ? `R$ ${Number(course.price).toFixed(2)}` : t('common.free')}
            </p>
            {isOwner ? (
              <>
                <p className="mt-3 text-sm text-neutral-600">{t('course.ownerHint')}</p>
                {lessons[0] && (
                  <button
                    type="button"
                    onClick={startLearning}
                    className="btn-primary w-full mt-4 !py-3"
                  >
                    {t('course.previewCourse')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={deletingLessonId === 'course'}
                  onClick={deleteOwnCourse}
                  className="w-full mt-2 py-2.5 text-sm font-semibold border border-red-200 text-red-700 rounded-full hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingLessonId === 'course' ? '...' : t('myCourses.deleteCourse')}
                </button>
              </>
            ) : (
              <>
                {enrollError && (
                  <p className="mt-3 alert-error" role="alert">
                    {enrollError}
                  </p>
                )}
                {enrolled ? (
                  <button
                    type="button"
                    onClick={startLearning}
                    className="btn-primary w-full mt-4 !py-3"
                  >
                    {t('course.continue')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="btn-primary w-full mt-4 !py-3"
                  >
                    {enrolling ? t('course.enrolling') : t('course.enroll')}
                  </button>
                )}
                {!user && (
                  <p className="text-xs text-neutral-500 mt-2 text-center">
                    <Link to="/" className="link-athenas">{t('course.signInToEnroll')}</Link>{' '}
                    {t('course.toEnroll')}
                  </p>
                )}
              </>
            )}
          </aside>
        </div>

        {manageError && (
          <p className="mt-6 alert-error" role="alert">
            {manageError}
          </p>
        )}

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4 text-neutral-900">{t('course.content')}</h2>
          {(enrolled || isOwner) && trail && trail.lessons.length > 0 && (
            <TrilhaProgresso
              courseId={id!}
              lessons={trail.lessons}
              completedCount={trail.completed_count}
              totalLessons={trail.total_lessons}
              canAccess={canWatchLesson}
            />
          )}
          {(isOwner || !enrolled || !trail || trail.lessons.length === 0) && (
            <ul className={`bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100 ${
              (enrolled || isOwner) && trail && trail.lessons.length > 0 ? 'mt-8' : ''
            }`}>
            {lessons.map((lesson, i) => (
              <li
                key={lesson.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
              >
                <div>
                  <span className="text-neutral-400 text-sm mr-2">{i + 1}.</span>
                  {lesson.title}
                  {lesson.is_preview && (
                    <span className="ml-2 text-xs bg-brand-gold-soft text-neutral-800 px-2 py-0.5 rounded">
                      {t('course.preview')}
                    </span>
                  )}
                  {isOwner && (
                    <p className="text-xs text-neutral-400 mt-0.5 ml-6">
                      {lesson.video_url ? t('myCourses.hasVideo') : t('myCourses.noVideo')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {isOwner && (
                    <>
                      {lesson.video_url && (
                        <button
                          type="button"
                          disabled={deletingLessonId === lesson.id}
                          onClick={() => removeLessonVideo(lesson.id)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full border border-neutral-300 hover:border-brand-gold hover:bg-brand-gold-soft/40 disabled:opacity-50"
                        >
                          {t('myCourses.removeVideo')}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={deletingLessonId === lesson.id}
                        onClick={() => deleteLessonById(lesson.id)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t('myCourses.deleteLesson')}
                      </button>
                    </>
                  )}
                  {canWatchLesson(lesson) ? (
                    <Link
                      to={`/assistir/${id}/${lesson.id}`}
                      className="text-sm link-athenas"
                    >
                      {t('course.watch')}
                    </Link>
                  ) : (
                    !isOwner && (
                      <span className="text-xs text-neutral-400">{t('course.enrollToWatch')}</span>
                    )
                  )}
                </div>
              </li>
            ))}
            {lessons.length === 0 && (
              <li className="px-4 py-8 text-center rounded-2xl border border-brand-gold/30 bg-brand-gold-soft/20 m-3 text-neutral-600 shadow-sm">
                {t('course.noLessons')}
              </li>
            )}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
