import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { LessonVideoPlayer } from '../components/LessonVideoPlayer'
import type { Course, Lesson } from '../types/database'

export function LessonPlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [current, setCurrent] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (!courseId || !lessonId) return
    const cId: string = courseId
    const lId: string = lessonId
    async function load() {
      setAccessDenied(false)
      const [{ data: c }, { data: ls }, { data: lesson }] = await Promise.all([
        supabase.from('courses').select('title').eq('id', cId).single(),
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
      }

      if (!canWatch) {
        setAccessDenied(true)
        setCurrent(null)
      } else {
        setCurrent(lessonData)
        if (user) {
          await supabase.from('lesson_progress').upsert(
            {
              user_id: user.id,
              lesson_id: lId,
              completed: true,
              completed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,lesson_id' }
          )
        }
      }
      setLoading(false)
    }
    load()
  }, [courseId, lessonId, user])

  const currentIndex = lessons.findIndex((l) => l.id === lessonId)
  const next = lessons[currentIndex + 1]

  if (loading) return <p className="p-8">{t('lesson.loading')}</p>

  if (accessDenied) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-600 mb-4">{t('lesson.accessDenied')}</p>
        <Link to={`/curso/${courseId}`} className="text-brand font-semibold hover:underline">
          ← {course?.title ?? t('course.backToCourse')}
        </Link>
      </div>
    )
  }

  if (!current) return <p className="p-8">{t('lesson.notFound')}</p>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to={`/curso/${courseId}`} className="text-sm text-brand hover:underline">
        ← {course?.title ?? t('course.backToCourse')}
      </Link>

      <div className="grid lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <LessonVideoPlayer
              videoUrl={current.video_url}
              title={current.title}
              noVideoLabel={t('lesson.noVideo')}
            />
          </div>
          <h1 className="text-xl font-bold mt-4">{current.title}</h1>
          {current.description && (
            <p className="text-slate-600 mt-2">{current.description}</p>
          )}
          {next && (
            <Link
              to={`/assistir/${courseId}/${next.id}`}
              className="inline-block mt-4 px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark"
            >
              {t('lesson.next')}
            </Link>
          )}
        </div>

        <aside className="bg-white border rounded-lg p-4 h-fit max-h-[70vh] overflow-y-auto">
          <h2 className="font-semibold mb-3">{t('lesson.list')}</h2>
          <ul className="space-y-1 text-sm">
            {lessons.map((l, i) => (
              <li key={l.id}>
                <Link
                  to={`/assistir/${courseId}/${l.id}`}
                  className={`block px-2 py-2 rounded hover:bg-slate-50 ${
                    l.id === lessonId ? 'bg-brand/10 text-brand font-medium' : ''
                  }`}
                >
                  {i + 1}. {l.title}
                  {l.is_preview && (
                    <span className="ml-1 text-[10px] text-neutral-500">({t('course.preview')})</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
