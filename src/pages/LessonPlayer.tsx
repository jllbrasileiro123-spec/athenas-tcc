import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useGamification } from '../contexts/GamificationContext'
import { LessonVideoPlayer } from '../components/LessonVideoPlayer'
import { LessonAudioPlayer } from '../components/LessonAudioPlayer'
import { CelebrationModal } from '../components/CelebrationModal'
import { QuizTaker } from '../components/QuizTaker'
import { LessonDoubts } from '../components/LessonDoubts'
import { MaterialLink } from '../components/MaterialLink'
import {
  fetchCourseModules,
  moduleShortTitle,
  moduleTopics,
  type CourseModule,
  type ModuleMaterial,
} from '../lib/courseModules'
import type { Course, Lesson } from '../types/database'
import type { CompleteLessonResult, TrailLesson } from '../lib/gamification'
import { isLessonSequentiallyUnlocked } from '../lib/gamification'

export function LessonPlayer() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()
  const { completeLesson, fetchTrail } = useGamification()

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [trailLessons, setTrailLessons] = useState<TrailLesson[]>([])
  const [current, setCurrent] = useState<Lesson | null>(null)
  const [moduleMaterials, setModuleMaterials] = useState<ModuleMaterial[]>([])
  const [sidebarModules, setSidebarModules] = useState<CourseModule[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [celebration, setCelebration] = useState<CompleteLessonResult | null>(null)
  const completingRef = useRef(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'about' | 'material' | 'doubts'>('about')

  useEffect(() => {
    if (!courseId || !lessonId) return
    const cId: string = courseId
    const lId: string = lessonId
    async function load() {
      setAccessDenied(false)
      setTab('about')
      setCelebration(null)
      setModuleMaterials([])
      setSidebarModules([])
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
      let isOwner = false

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
          isOwner = !!owned
        } else {
          isOwner = (c as { instructor_id?: string } | null)?.instructor_id === user.id
        }
      }

      if (!canWatch) {
        setAccessDenied(true)
        setCurrent(null)
        setCompleted(false)
      } else {
        const [trail, modsResult] = await Promise.all([
          fetchTrail(cId),
          fetchCourseModules(cId),
        ])
        setSidebarModules(modsResult.modules)
        if (lessonData.module_id) {
          const mod = modsResult.modules.find((m) => m.id === lessonData.module_id)
          setModuleMaterials(mod?.materials ?? [])
        }
        if (trail) {
          setTrailLessons(trail.lessons)
          const unlocked = isLessonSequentiallyUnlocked(trail.lessons, lId, { isOwner })
          if (!unlocked && !lessonData.is_preview) {
            setAccessDenied(true)
            setCurrent(null)
            setCompleted(false)
          } else {
            setCurrent(lessonData)
            setCompleted(trail.lessons.some((l) => l.id === lId && l.completed))
          }
        } else {
          setTrailLessons([])
          setCurrent(lessonData)
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
  const isOwner = !!user && course?.instructor_id === user.id
  const nextUnlocked =
    !!next &&
    (trailLessons.length === 0 ||
      isLessonSequentiallyUnlocked(
        trailLessons.map((l) =>
          l.id === current?.id && completed ? { ...l, completed: true } : l
        ),
        next.id,
        { isOwner }
      ))
  const isQuiz = current?.content_type === 'quiz' || current?.content_type === 'simulado'
  const isPodcast = trailLessons.find((l) => l.id === lessonId)?.item_kind === 'podcast'

  // A lateral abre já rolada até o módulo da aula atual
  const currentModuleId = current?.module_id ?? null
  useEffect(() => {
    const box = sidebarRef.current
    const el = box?.querySelector<HTMLElement>('[data-current-module="true"]')
    if (box && el) box.scrollTop = el.offsetTop - box.offsetTop - 8
  }, [currentModuleId, sidebarModules])

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
          <p className="text-neutral-600 mb-4">
            {trailLessons.length > 0 ? t('lesson.lockedSequential') : t('lesson.accessDenied')}
          </p>
          <Link to={`/curso/${courseId}`} className="link-athenas">
            ← {course?.title ?? t('course.backToCourse')}
          </Link>
        </div>
      </div>
    )
  }

  if (!current) return <p className="p-8 page-shell text-neutral-600">{t('lesson.notFound')}</p>

  const moduleIndex = current.module_id
    ? sidebarModules.findIndex((m) => m.id === current.module_id)
    : -1
  const currentModule = moduleIndex >= 0 ? sidebarModules[moduleIndex] : null
  const topics = moduleTopics(currentModule?.description)
  const kindLabel = isQuiz
    ? t('module.kindShortQuiz')
    : isPodcast
      ? t('module.kindShortPodcast')
      : t('module.kindShortLesson')
  const doneCount = trailLessons.filter((l) =>
    l.id === current.id ? completed : l.completed
  ).length
  const totalCount = trailLessons.length || lessons.length
  const donePct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const tabClass = (active: boolean) =>
    `-mb-px border-b-2 px-3.5 py-2.5 text-sm transition-colors ${
      active
        ? 'border-brand-gold font-extrabold text-neutral-900'
        : 'border-transparent font-bold text-neutral-500 hover:text-neutral-900'
    }`

  return (
    <div className="page-shell">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Link
            to={`/curso/${courseId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 hover:text-neutral-900"
          >
            <svg className="h-4 w-4 text-brand-gold-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
            {t('lesson.backToTrail')}
          </Link>

          <div className="mt-4">
            {isPodcast ? (
              <LessonAudioPlayer
                audioUrl={current.audio_url ?? current.video_url}
                title={current.title}
                noAudioLabel={t('module.noAudio')}
                onNearComplete={completed ? undefined : () => void markComplete()}
              />
            ) : isQuiz ? null : (
              <div className="aspect-video overflow-hidden rounded-[20px] bg-neutral-900">
                <LessonVideoPlayer
                  videoUrl={current.video_url}
                  title={current.title}
                  noVideoLabel={t('lesson.noVideo')}
                  onNearComplete={completed ? undefined : () => void markComplete()}
                />
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-gold-ink">
                {moduleIndex >= 0
                  ? `${t('module.label', { n: String(moduleIndex + 1) })} · ${kindLabel}`
                  : kindLabel}
              </p>
              <h1 className="font-display text-3xl font-bold leading-[1.1] text-neutral-900 sm:text-4xl">
                {current.title}
              </h1>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {completed && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                  {t('lesson.completed')}
                </span>
              )}
              {!isQuiz && !completed && (
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => void markComplete()}
                  className="h-[46px] rounded-[14px] border border-[#d9cfb8] bg-white px-4 text-sm font-bold text-neutral-900 hover:border-neutral-900 disabled:opacity-60"
                >
                  {completing ? t('common.loading') : t('lesson.complete')}
                </button>
              )}
              {next && nextUnlocked && (
                <Link
                  to={`/assistir/${courseId}/${next.id}`}
                  className="inline-flex h-[46px] items-center gap-2 rounded-[14px] bg-neutral-950 px-4 text-sm font-extrabold text-brand-gold-soft hover:bg-black"
                >
                  {t('lesson.nextNamed', {
                    title:
                      next.content_type === 'quiz' || next.content_type === 'simulado'
                        ? t('module.kindShortQuiz')
                        : next.title.replace(/\s*—.*$/, ''),
                  })}
                  <svg className="h-4 w-4 text-brand-gold-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              )}
              {next && !nextUnlocked && completed && (
                <span className="text-xs text-neutral-500">{t('trail.locked')}</span>
              )}
            </div>
          </div>

          {isQuiz && (
            <div className="mt-6">
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
            </div>
          )}

          <nav aria-label={t('course.content')} className="mt-6 flex gap-2 border-b border-brand-line">
            <button type="button" onClick={() => setTab('about')} className={tabClass(tab === 'about')}>
              {t('lesson.tabAbout')}
            </button>
            {moduleMaterials.length > 0 && (
              <button type="button" onClick={() => setTab('material')} className={tabClass(tab === 'material')}>
                {t('module.materials')}
              </button>
            )}
            <button type="button" onClick={() => setTab('doubts')} className={tabClass(tab === 'doubts')}>
              {t('lesson.tabDoubts')}
            </button>
          </nav>

          <div className="mt-4">
            {tab === 'about' && (
              <div className="flex flex-col gap-4">
                {current.description && (
                  <p className="leading-relaxed text-neutral-600">{current.description}</p>
                )}
                {topics.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <li
                        key={topic}
                        className="rounded-[10px] border border-brand-line bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-700"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {tab === 'material' && (
              <ul className="space-y-2 rounded-2xl border border-brand-line bg-white p-4 text-sm">
                {moduleMaterials.map((material) => (
                  <li key={material.id}>
                    <MaterialLink material={material} />
                  </li>
                ))}
              </ul>
            )}
            {tab === 'doubts' && courseId && (
              <LessonDoubts
                courseId={courseId}
                lessonId={current.id}
                isOwner={!!user && course?.instructor_id === user.id}
              />
            )}
          </div>
        </main>

        <aside className="flex w-full flex-col border-t border-brand-line bg-white lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-[380px] lg:shrink-0 lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-2.5 px-6 pb-3 pt-5">
            <h2 className="font-display text-2xl font-bold text-neutral-900">{t('course.content')}</h2>
            <div className="h-2 overflow-hidden rounded-full bg-brand-line">
              <div className="h-full rounded-full bg-brand-gold transition-all duration-500" style={{ width: `${donePct}%` }} />
            </div>
            <p className="text-xs font-bold text-neutral-500">
              {t('lesson.itemsDone', { done: String(doneCount), total: String(totalCount) })}
            </p>
          </div>

          <div ref={sidebarRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-24 pt-1">
            {sidebarModules.length > 0
              ? sidebarModules.map((mod, mi) => {
                  const modState = mod.completed ? 'done' : isOwner || mod.unlocked ? 'current' : 'locked'
                  return (
                    <section
                      key={mod.id}
                      data-current-module={mod.id === current.module_id ? 'true' : undefined}
                      className={`flex flex-col gap-1.5 rounded-2xl px-3.5 py-3 ${
                        mod.id === current.module_id
                          ? 'border-2 border-brand-gold bg-white'
                          : modState === 'locked'
                            ? 'border border-brand-line bg-neutral-50'
                            : 'border border-brand-line bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-[11px] font-extrabold uppercase tracking-[0.14em] ${
                            modState === 'done'
                              ? 'text-emerald-800'
                              : modState === 'current'
                                ? 'text-brand-gold-ink'
                                : 'text-neutral-400'
                          }`}
                        >
                          {t('module.label', { n: String(mi + 1) })}
                        </p>
                        <span
                          className={`text-[11px] font-extrabold ${
                            modState === 'done'
                              ? 'text-emerald-800'
                              : modState === 'current'
                                ? 'text-brand-gold-ink'
                                : 'text-neutral-400'
                          }`}
                        >
                          {modState === 'done'
                            ? t('module.completed')
                            : modState === 'current'
                              ? t('module.inProgress')
                              : t('module.locked')}
                        </span>
                      </div>
                      <p
                        className={`text-sm font-extrabold leading-snug ${
                          modState === 'locked' ? 'text-neutral-400' : 'text-neutral-900'
                        }`}
                      >
                        {moduleShortTitle(mod.title)}
                      </p>
                      {mod.id === current.module_id && (
                      <ul className="flex flex-col gap-0.5">
                        {mod.items.map((item) => {
                          const done = item.completed || (item.id === current.id && completed)
                          const unlocked =
                            isOwner ||
                            mod.unlocked ||
                            trailLessons.length === 0 ||
                            isLessonSequentiallyUnlocked(trailLessons, item.id, { isOwner })
                          const active = item.id === lessonId
                          const inner = (
                            <>
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                  done ? 'bg-emerald-700' : active ? 'bg-brand-gold' : 'bg-neutral-300'
                                }`}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-bold">
                                  {item.title.replace(/^M\d+ · /, '')}
                                </span>
                                {!unlocked && (
                                  <span className="block text-[10px] font-semibold text-neutral-400">
                                    {t('trail.locked')}
                                  </span>
                                )}
                              </span>
                            </>
                          )
                          return (
                            <li key={item.id}>
                              {unlocked ? (
                                <Link
                                  to={`/assistir/${courseId}/${item.id}`}
                                  className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${
                                    active
                                      ? 'bg-brand-gold-soft text-neutral-900'
                                      : 'text-neutral-900 hover:bg-brand-cream'
                                  }`}
                                >
                                  {inner}
                                </Link>
                              ) : (
                                <span className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-neutral-400">
                                  {inner}
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      )}
                    </section>
                  )
                })
              : (
                <ul className="flex flex-col gap-0.5 text-sm">
                  {lessons.map((l, i) => {
                    const trailNode = trailLessons.find((n) => n.id === l.id)
                    const done = !!trailNode?.completed
                    const unlocked =
                      isOwner ||
                      l.is_preview ||
                      trailLessons.length === 0 ||
                      isLessonSequentiallyUnlocked(trailLessons, l.id, { isOwner })
                    const label = (
                      <>
                        {done ? '✓ ' : `${i + 1}. `}
                        {l.title}
                        {!unlocked ? (
                          <span className="block text-[10px] text-neutral-400">
                            {t('trail.locked')}
                          </span>
                        ) : null}
                      </>
                    )
                    return (
                      <li key={l.id}>
                        {unlocked ? (
                          <Link
                            to={`/assistir/${courseId}/${l.id}`}
                            className={`block rounded-[10px] px-2.5 py-2 hover:bg-brand-cream ${
                              l.id === lessonId ? 'bg-brand-gold-soft font-bold' : 'text-neutral-800'
                            }`}
                          >
                            {label}
                          </Link>
                        ) : (
                          <span className="block rounded-[10px] px-2.5 py-2 text-neutral-400">
                            {label}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
          </div>

        </aside>
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
