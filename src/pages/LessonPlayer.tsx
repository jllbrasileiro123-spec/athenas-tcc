import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useGamification } from '../contexts/GamificationContext'
import { LessonVideoPlayer } from '../components/LessonVideoPlayer'
import { CelebrationModal } from '../components/CelebrationModal'
import { QuizTaker } from '../components/QuizTaker'
import { LessonDoubts } from '../components/LessonDoubts'
import type { Course, Lesson } from '../types/database'
import type { CompleteLessonResult, TrailLesson } from '../lib/gamification'

export function LessonPlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()
  const { completeLesson, fetchTrail } = useGamification()

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [trailLessons, setTrailLessons] = useState<TrailLesson[]>([])
  const [current, setCurrent] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [celebration, setCelebration] = useState<CompleteLessonResult | null>(null)
  const completingRef = useRef(false)

  useEffect(() => {
    if (!courseId || !lessonId) return
    const cId: string = courseId
    const lId: string = lessonId
    async function load() {
      setAccessDenied(false)
      setCelebration(null)
      completingRef.current = false
      const [{ data: c }, { data: ls }, { data: lesson }] = await Promise.all([
        supabase.from('courses').select('title, instructor_id').eq('id', cId).single(),
        supabase.from('lessons').select('*').eq('course_id', cId).order('sort_order'),
        supabase.from('lessons').select('*').eq('id', lId).single(),
      ])

      if (c) setCourse(c as Course)
      if (ls) setLessons(ls as Lesson[])

      if (!lesson) {
        setLoading(false)
        return
      }

      const lessonData = lesson as Lesson
      let canWatch = lessonData.is_preview

      if (!canWatch && user) {
        const { data: enr } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', cId)
          .maybeSingle()
        canWatch = !!enr
        if (!canWatch) {
          const { data: owned } = await supabase
            .from('courses')
            .select('id')
            .eq('id', cId)
            .eq('instructor_id', user.id)
            .maybeSingle()
          canWatch = !!owned
        }
      }

      if (!canWatch) {
        setAccessDenied(true)
        setCurrent(null)
        setCompleted(false)
      } else {
        setCurrent(lessonData)
        const trail = await fetchTrail(cId)
        if (trail) {
          setTrailLessons(trail.lessons)
          setCompleted(trail.lessons.some((l) => l.id === lId && l.completed))
        } else {
          setTrailLessons([])
          setCompleted(false)
        }
      }
      setLoading(false)
    }
    void load()
  }, [courseId, lessonId, user, fetchTrail])

  const markComplete = useCallback(async () => {
    if (!lessonId || completingRef.current || completed) return
    completingRef.current = true
    setCompleting(true)
    const result = await completeLesson(lessonId)
    setCompleting(false)
    if (!result) {
      completingRef.current = false
      return
    }
    setCompleted(true)
    setTrailLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, completed: true } : l))
    )
    if (!result.already_completed) setCelebration(result)
  }, [lessonId, completed, completeLesson])

  const currentIndex = lessons.findIndex((l) => l.id === lessonId)
  const next = lessons[currentIndex + 1]
  const isQuiz = current?.content_type === 'quiz' || current?.content_type === 'simulado'

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[40vh]">
        <div className="spinner-athenas" />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="page-shell">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-neutral-600 mb-4">{t('lesson.accessDenied')}</p>
          <Link to={`/curso/${courseId}`} className="link-athenas">
            ← {course?.title ?? t('course.backToCourse')}
          </Link>
        </div>
      </div>
    )
  }

  if (!current) return <p className="p-8 page-shell text-neutral-600">{t('lesson.notFound')}</p>

  return (
    <div className="page-shell">
      <div className="max-w-6xl mx-auto px-4 py-5 md:py-8">
        <Link to={`/curso/${courseId}`} className="text-sm link-athenas">
          ← {course?.title ?? t('course.backToCourse')}
        </Link>

        <div className="grid lg:grid-cols-3 gap-6 mt-4">
          <div className="lg:col-span-2">
            {isQuiz ? (
              <QuizTaker
                lessonId={current.id}
                completed={completed}
                onPassed={(result) => {
                  setCompleted(true)
                  setTrailLessons((prev) =>
                    prev.map((l) => (l.id === current.id ? { ...l, completed: true } : l))
                  )
                  setCelebration(result)
                }}
              />
            ) : (
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-brand-gold/20">
                <LessonVideoPlayer
                  videoUrl={current.video_url}
                  title={current.title}
                  noVideoLabel={t('lesson.noVideo')}
                  onNearComplete={completed ? undefined : () => void markComplete()}
                />
              </div>
            )}
            <h1 className="text-xl font-bold mt-4 text-neutral-900">{current.title}</h1>
            {current.description && (
              <p className="text-neutral-600 mt-2">{current.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {completed && (
                <span className="text-sm font-bold text-brand-gold">{t('lesson.completed')}</span>
              )}
              {!isQuiz && !completed && (
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => void markComplete()}
                  className="btn-primary"
                >
                  {completing ? t('common.loading') : t('lesson.complete')}
                </button>
              )}
              {next && (
                <Link to={`/assistir/${courseId}/${next.id}`} className="btn-secondary">
                  {t('lesson.next')}
                </Link>
              )}
            </div>

            {courseId && (
              <LessonDoubts
                courseId={courseId}
                lessonId={current.id}
                isOwner={!!user && course?.instructor_id === user.id}
              />
            )}
          </div>

          <aside className="card-athenas p-4 h-fit max-h-[70vh] overflow-y-auto">
            <h2 className="font-semibold mb-3 text-neutral-900">{t('lesson.list')}</h2>
            <ul className="space-y-1 text-sm">
              {lessons.map((l, i) => {
                const done = trailLessons.some((n) => n.id === l.id && n.completed)
                return (
                  <li key={l.id}>
                    <Link
                      to={`/assistir/${courseId}/${l.id}`}
                      className={`block px-2 py-2 rounded-lg hover:bg-brand-gold-soft/50 transition-colors ${
                        l.id === lessonId ? 'bg-brand-gold-soft text-brand-gold font-medium' : 'text-neutral-800'
                      }`}
                    >
                      {done ? '✓ ' : `${i + 1}. `}
                      {l.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </aside>
        </div>
      </div>
      {celebration && courseId && (
        <CelebrationModal
          result={celebration}
          courseId={courseId}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  )
}
