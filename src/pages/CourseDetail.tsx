import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { TrilhaProgresso } from '../components/TrilhaProgresso'
import { deleteHostedVideo } from '../lib/videoStorage'
import { fetchPlacementTest } from '../lib/placementTest'
import { fetchCourseModules, nextOpenItem, type CourseModule } from '../lib/courseModules'
import { ModuleList } from '../components/ModuleList'
import { AssistantCard } from '../components/AssistantCard'
import { PlacementPopup } from '../components/PlacementPopup'
import { AddModuleForm } from '../components/AddModuleForm'
import { CourseFeedbackModal } from '../components/CourseFeedbackModal'
import { useGamification } from '../contexts/GamificationContext'
import type { Course, Lesson } from '../types/database'
import type { CourseTrail } from '../lib/gamification'
import { isLessonSequentiallyUnlocked } from '../lib/gamification'

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
  const [hasPlacement, setHasPlacement] = useState(false)
  const [placementTaken, setPlacementTaken] = useState(false)
  const [justEnrolled, setJustEnrolled] = useState(false)
  const [modules, setModules] = useState<CourseModule[]>([])
  /** Só some depois do teste OU se o aluno escolher começar do Módulo 1 */
  const [choseStartFromZero, setChoseStartFromZero] = useState(false)
  const [gateBusy, setGateBusy] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    const courseId: string = id
    setChoseStartFromZero(
      sessionStorage.getItem(`athenas.placementStartZero.${courseId}`) === '1'
    )
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

      const { modules: mods } = await fetchCourseModules(courseId)
      setModules(mods)

      const { test } = await fetchPlacementTest(courseId)
      setHasPlacement((test?.questions.length ?? 0) > 0)
      setPlacementTaken(Boolean(test?.already_taken))

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
      } else {
        setEnrolled(false)
        setTrail(null)
      }
      setLoading(false)
    }
    load()
  }, [id, user, fetchTrail])

  /** Garante matrícula antes do teste / trilha (cursos gratuitos e pagos no fluxo demo). */
  async function ensureEnrolled(): Promise<boolean> {
    if (!user || !id) {
      navigate('/login', { state: { from: { pathname: `/curso/${id}` } } })
      return false
    }
    if (enrolled) return true
    setEnrollError(null)
    const { error } = await supabase.from('enrollments').insert({
      user_id: user.id,
      course_id: id,
    })
    if (error && !error.message.includes('duplicate')) {
      setEnrollError(error.message)
      return false
    }
    setEnrolled(true)
    setJustEnrolled(true)
    const trailData = await fetchTrail(id)
    if (trailData) setTrail(trailData)
    return true
  }

  async function handleEnroll() {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/curso/${id}` } } })
      return
    }
    setEnrolling(true)
    const ok = await ensureEnrolled()
    setEnrolling(false)
    if (!ok) return
    // Depois de "comprar grátis", o nivelamento abre na hora
    setChoseStartFromZero(false)
    if (id) sessionStorage.removeItem(`athenas.placementStartZero.${id}`)
  }

  async function handleTakePlacement() {
    setGateBusy(true)
    const ok = await ensureEnrolled()
    setGateBusy(false)
    if (ok && id) navigate(`/nivelamento/${id}`)
  }

  async function handleStartFromBeginning() {
    setGateBusy(true)
    const ok = await ensureEnrolled()
    setGateBusy(false)
    if (ok) {
      setChoseStartFromZero(true)
      if (id) sessionStorage.setItem(`athenas.placementStartZero.${id}`, '1')
    }
  }

  async function reloadModulesAndLessons() {
    if (!id) return
    const [{ modules: mods }, { data: lessonsData }, trailData] = await Promise.all([
      fetchCourseModules(id),
      supabase.from('lessons').select('*').eq('course_id', id).order('sort_order'),
      fetchTrail(id),
    ])
    setModules(mods)
    if (lessonsData) setLessons(lessonsData as Lesson[])
    if (trailData) setTrail(trailData)
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

  const levelLabel = levelLabels[course.level] ?? course.level
  const isOwner = user?.id === course.instructor_id
  const isFree = Number(course.price) === 0
  const hasEnrollmentAccess = (lesson: { is_preview: boolean }) =>
    isOwner || enrolled || lesson.is_preview
  /** Atividade 4: só a próxima aula da trilha (ou já concluídas) fica liberada */
  const canAccessTrailLesson = (lesson: { id: string; is_preview: boolean }) => {
    if (!hasEnrollmentAccess(lesson)) return false
    if (!trail?.lessons.length) return true
    return isLessonSequentiallyUnlocked(trail.lessons, lesson.id, { isOwner })
  }
  /** Teste de nivelamento pendente: é o primeiro passo da formação */
  const needsPlacement = hasPlacement && !placementTaken
  const hasModules = modules.length > 0
  /**
   * Popup depois de "Começar grátis" (ou se já estiver matriculado sem ter feito o teste).
   * Vale também para o dono do curso, para poder testar o fluxo de aluno.
   */
  const showPlacementPopup = needsPlacement && enrolled && !choseStartFromZero

  const doneModules = modules.filter((m) => m.completed).length
  const progressDone = hasModules ? doneModules : (trail?.completed_count ?? 0)
  const progressTotal = hasModules ? modules.length : (trail?.total_lessons ?? lessons.length)
  const progressPct = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0
  const courseDone =
    !!trail && trail.total_lessons > 0 && trail.completed_count >= trail.total_lessons
  // Pós-teste da pesquisa: libera ao chegar no último módulo (Avaliação Final)
  const postTestOpen =
    isOwner || (enrolled && (courseDone || (hasModules && !!modules[modules.length - 1]?.unlocked)))

  /** Próximo item da trilha para o cartão "Continue de onde parou" */
  const nextRef = hasModules ? nextOpenItem(modules) : null
  const nextModuleIndex = nextRef ? modules.findIndex((m) => m.id === nextRef.moduleId) : -1
  const nextItem =
    nextModuleIndex >= 0
      ? modules[nextModuleIndex].items.find((i) => i.id === nextRef?.itemId) ?? null
      : null
  const nextLesson = !hasModules ? trail?.lessons.find((l) => !l.completed) ?? null : null
  const nextTitle = nextItem?.title ?? nextLesson?.title ?? null
  const nextMeta = nextItem
    ? [
        t('module.label', { n: String(nextModuleIndex + 1) }),
        nextItem.content_type !== 'lesson'
          ? t('module.kindShortQuiz')
          : nextItem.item_kind === 'podcast'
            ? t('module.kindShortPodcast')
            : t('module.kindShortLesson'),
        nextItem.content_type === 'lesson' && nextItem.duration_minutes > 0
          ? `${nextItem.duration_minutes} min`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  function continueLearning() {
    if (nextRef) navigate(`/assistir/${id}/${nextRef.itemId}`)
    else startLearning()
  }

  return (
    <div className="page-shell">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-10">
        <section className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-10">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3.5">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-gold-ink">
              {hasModules
                ? t('trail.eyebrow', { n: String(modules.length) })
                : `${lessons.length} ${lessons.length !== 1 ? t('common.lessons') : t('common.lesson')} · ${levelLabel}`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-4xl font-bold leading-[1.02] text-neutral-900 sm:text-5xl lg:text-[52px]">
                {course.title}
              </h1>
              {isOwner && (
                <span className="text-xs font-bold uppercase tracking-wider bg-neutral-950 text-brand-gold px-3 py-1 rounded-full">
                  {t('myCourses.teachingBadge')}
                </span>
              )}
            </div>
            {course.description && (
              <p className="hidden max-w-[640px] text-base leading-relaxed text-neutral-600 sm:block">
                {course.description}
              </p>
            )}
            {(enrolled || isOwner) && progressTotal > 0 && (
              <div className="mt-2 flex w-full flex-col gap-2">
                <div className="flex justify-between text-[13px] font-bold">
                  <span>{t('trail.yourProgress')}</span>
                  <span className="text-brand-gold-ink">
                    {hasModules
                      ? t('trail.modulesProgress', {
                          done: String(progressDone),
                          total: String(progressTotal),
                          pct: String(progressPct),
                        })
                      : `${progressDone}/${progressTotal} · ${progressPct}%`}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-brand-line">
                  <div
                    className="h-full rounded-full bg-brand-gold transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <aside className="flex w-full flex-col gap-4 rounded-3xl bg-neutral-950 p-6 text-brand-cream sm:p-7 lg:w-[380px] lg:shrink-0">
            {isOwner ? (
              <>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-gold-light">
                  {t('myCourses.teachingBadge')}
                </p>
                <p className="text-sm leading-relaxed text-neutral-300">{t('course.ownerHint')}</p>
                <div className="mt-auto flex flex-col gap-2">
                  {needsPlacement && !enrolled && (
                    <button
                      type="button"
                      onClick={() => void handleEnroll()}
                      disabled={enrolling || gateBusy}
                      className="h-12 rounded-[14px] bg-brand-gold text-[15px] font-extrabold text-neutral-950 hover:brightness-105 disabled:opacity-60"
                    >
                      {enrolling || gateBusy ? t('course.enrolling') : t('placement.ownerTestCta')}
                    </button>
                  )}
                  {lessons[0] && (
                    <button
                      type="button"
                      onClick={startLearning}
                      className="h-12 rounded-[14px] bg-brand-gold text-[15px] font-extrabold text-neutral-950 hover:brightness-105"
                    >
                      {t('course.previewCourse')}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={deletingLessonId === 'course'}
                    onClick={deleteOwnCourse}
                    className="h-11 rounded-[14px] border border-red-400/40 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingLessonId === 'course' ? '...' : t('myCourses.deleteCourse')}
                  </button>
                </div>
              </>
            ) : !enrolled ? (
              <>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-gold-light">
                  {t('trail.startEyebrow')}
                </p>
                <p className="font-display text-4xl font-bold">
                  {course.price > 0 ? `R$ ${Number(course.price).toFixed(2)}` : t('common.free')}
                </p>
                {enrollError && (
                  <p className="alert-error" role="alert">
                    {enrollError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleEnroll()}
                  disabled={enrolling || gateBusy}
                  className="mt-auto h-12 rounded-[14px] bg-brand-gold text-[15px] font-extrabold text-neutral-950 hover:brightness-105 disabled:opacity-60"
                >
                  {enrolling || gateBusy
                    ? t('course.enrolling')
                    : isFree
                      ? t('course.startFree')
                      : t('course.enroll')}
                </button>
                {!user && (
                  <p className="text-center text-xs text-neutral-400">
                    <Link to="/login" className="font-semibold text-brand-gold-light hover:underline">
                      {t('course.signInToEnroll')}
                    </Link>{' '}
                    {t('course.toEnroll')}
                  </p>
                )}
              </>
            ) : needsPlacement && !choseStartFromZero ? (
              <>
                {justEnrolled && <p className="alert-brand text-xs">{t('course.enrolledNow')}</p>}
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-gold-light">
                  {t('placement.stepTitle')}
                </p>
                <p className="text-sm leading-relaxed text-neutral-300">{t('placement.asideHint')}</p>
                <button
                  type="button"
                  onClick={() => void handleTakePlacement()}
                  disabled={gateBusy}
                  className="mt-auto h-12 rounded-[14px] bg-brand-gold text-[15px] font-extrabold text-neutral-950 hover:brightness-105 disabled:opacity-60"
                >
                  {gateBusy ? t('common.loading') : t('placement.cta')}
                </button>
              </>
            ) : (
              <>
                {justEnrolled && <p className="alert-brand text-xs">{t('course.enrolledNow')}</p>}
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-gold-light">
                  {courseDone ? t('certificate.readyTitle') : t('trail.continueEyebrow')}
                </p>
                {courseDone ? (
                  <p className="text-sm leading-relaxed text-neutral-300">{t('trail.allDone')}</p>
                ) : (
                  nextTitle && (
                    <div className="flex flex-col gap-1.5">
                      {nextMeta && (
                        <p className="text-[13px] font-semibold text-neutral-400">{nextMeta}</p>
                      )}
                      <p className="font-display text-[28px] font-bold leading-tight">{nextTitle}</p>
                    </div>
                  )
                )}
                <div className="mt-auto flex flex-wrap gap-3">
                  {courseDone ? (
                    <Link
                      to={`/certificado/${id}`}
                      className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-brand-gold text-[15px] font-extrabold text-neutral-950 hover:brightness-105"
                    >
                      {t('certificate.getCta')}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={continueLearning}
                      className="flex h-12 flex-1 items-center justify-center gap-2.5 rounded-[14px] bg-brand-gold text-[15px] font-extrabold text-neutral-950 hover:brightness-105"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path d="M7 4.5v15l12-7.5Z" />
                      </svg>
                      {t('trail.continueCta')}
                    </button>
                  )}
                </div>
                {hasPlacement && (
                  <Link
                    to={`/nivelamento/${id}`}
                    className="self-center text-[13px] font-semibold text-neutral-400 hover:text-brand-gold-soft hover:underline"
                  >
                    {t('placement.retakeCta')}
                  </Link>
                )}
              </>
            )}
          </aside>
        </section>

        {manageError && (
          <p className="mt-6 alert-error" role="alert">
            {manageError}
          </p>
        )}

        {courseDone && enrolled && (
          <div className="mt-8 rounded-2xl border border-brand-gold/40 bg-brand-gold-soft/25 p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-neutral-900">{t('certificate.readyTitle')}</p>
              <p className="text-sm text-neutral-600 mt-0.5">{t('certificate.readyBody')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="btn-secondary !px-4 !py-2.5 text-sm"
              >
                {t('feedback.rateCta')}
              </button>
              <Link to={`/certificado/${id}`} className="btn-primary !px-4 !py-2.5 text-sm">
                {t('certificate.getCta')}
              </Link>
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <section className="min-w-0 flex-1">
            <h2 className="mb-4 font-display text-3xl font-bold text-neutral-900">
              {hasModules ? t('course.modulesTitle') : t('course.content')}
            </h2>

            {/* Etapa 1 da trilha: verificar conhecimento antes das aulas */}
            {needsPlacement && (enrolled || isOwner) && (
              <div className="mb-6 rounded-2xl border-2 border-brand-gold/50 bg-brand-gold-soft/25 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="h-9 w-9 shrink-0 rounded-full bg-neutral-950 text-brand-gold font-bold flex items-center justify-center text-sm">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-neutral-900">{t('placement.stepTitle')}</p>
                      <p className="text-sm text-neutral-600 mt-0.5 max-w-xl leading-relaxed">
                        {t('placement.stepBody')}
                      </p>
                    </div>
                  </div>
                  <Link to={`/nivelamento/${id}`} className="btn-primary shrink-0 self-start !px-4 !py-2.5 text-sm sm:self-center">
                    {t('placement.stepCta')}
                  </Link>
                </div>
              </div>
            )}
            {(enrolled || isOwner) && hasModules && (
              <ModuleList
                courseId={id!}
                modules={modules}
                isOwner={isOwner}
                placementAvailable={needsPlacement}
              />
            )}
            {isOwner && user && id && (
              <div className="mt-6">
                <AddModuleForm
                  courseId={id}
                  userId={user.id}
                  moduleIndex={modules.length}
                  nextLessonSort={lessons.length}
                  onCreated={() => void reloadModulesAndLessons()}
                />
              </div>
            )}
            {(enrolled || isOwner) && !hasModules && trail && trail.lessons.length > 0 && (
              <TrilhaProgresso
                courseId={id!}
                lessons={trail.lessons}
                completedCount={trail.completed_count}
                totalLessons={trail.total_lessons}
                canAccess={canAccessTrailLesson}
              />
            )}
            {!hasModules &&
              (isOwner || !enrolled || !trail || trail.lessons.length === 0) && (
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
                    {canAccessTrailLesson(lesson) ? (
                      <Link
                        to={`/assistir/${id}/${lesson.id}`}
                        className="text-sm link-athenas"
                      >
                        {t('course.watch')}
                      </Link>
                    ) : enrolled && !isOwner ? (
                      <span className="text-xs text-neutral-400">{t('trail.locked')}</span>
                    ) : (
                      !isOwner && (
                        <span className="text-xs text-neutral-400">
                          {isFree ? t('course.startFreeShort') : t('course.enrollToWatch')}
                        </span>
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

          {(enrolled || isOwner) && (
            <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-24 lg:w-[380px] lg:shrink-0 lg:pt-[60px]">
              <AssistantCard />

              {postTestOpen && (
                <div className="flex flex-col gap-3 rounded-[20px] border-2 border-brand-gold/50 bg-white p-5">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-gold-ink">
                      {t('postTest.kicker')}
                    </p>
                    <p className="mt-1 text-[15px] font-extrabold">{t('postTest.cardTitle')}</p>
                    <p className="mt-1 text-[13px] leading-snug text-neutral-600">{t('postTest.cardBody')}</p>
                  </div>
                  <Link to={`/pos-teste/${id}`} className="btn-primary !py-2.5 text-center text-sm">
                    {t('postTest.cardCta')}
                  </Link>
                </div>
              )}

              <div className="flex items-center gap-3.5 rounded-[20px] bg-brand-gold-soft p-5">
                <svg className="h-9 w-9 shrink-0 text-brand-gold-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="9" r="6" />
                  <path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold">{t('certificate.cardTitle')}</p>
                  <p className="text-[13px] leading-snug text-neutral-600">
                    {courseDone ? t('certificate.cardReady') : t('certificate.cardLocked')}
                  </p>
                </div>
                {courseDone && (
                  <Link to={`/certificado/${id}`} className="btn-primary shrink-0 !px-4 !py-2 text-sm">
                    {t('certificate.getCta')}
                  </Link>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {showPlacementPopup && id && (
        <PlacementPopup
          courseId={id}
          moduleCount={modules.length}
          isLoggedIn={Boolean(user)}
          busy={gateBusy}
          onTakeTest={() => void handleTakePlacement()}
          onStartFromBeginning={() => void handleStartFromBeginning()}
        />
      )}

      {/* Popup de feedback: abre sozinho quando o aluno conclui a trilha e ainda não avaliou */}
      {id && course && enrolled && trail && trail.total_lessons > 0 &&
        trail.completed_count >= trail.total_lessons && (
          <CourseFeedbackModal
            courseId={id}
            courseTitle={course.title}
            auto
            open={feedbackOpen || undefined}
            onClose={() => setFeedbackOpen(false)}
          />
        )}
    </div>
  )
}
