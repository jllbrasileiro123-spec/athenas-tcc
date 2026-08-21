import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandSelect } from '../components/BrandSelect'
import { MoneyInput } from '../components/MoneyInput'
import { formatBRL, reaisFromCents } from '../lib/money'
import {
  isYouTubeUrl,
  isValidYouTubeUrl,
  uploadLessonVideo,
  validateVideoFile,
  MAX_VIDEO_BYTES,
} from '../lib/videoStorage'
import type { LessonContentType } from '../types/database'
import type { TranslationKey } from '../i18n/translations'

type DraftQuestion = {
  id: string
  prompt: string
  choices: [string, string, string, string]
  correctIndex: number
}

type DraftLesson = {
  id: string
  title: string
  video_url: string
  content_type: LessonContentType
  videoFile?: File
  videoFileName?: string
  questions: DraftQuestion[]
}

type VideoMode = 'upload' | 'youtube'
type Step = 1 | 2 | 3

const inputClass = 'input-athenas !rounded-xl'

function emptyQuestion(): DraftQuestion {
  return { id: crypto.randomUUID(), prompt: '', choices: ['', '', '', ''], correctIndex: 0 }
}

function formatMb(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

function isQuizType(type: LessonContentType) {
  return type === 'quiz' || type === 'simulado'
}

export function CreateCourse() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceCents, setPriceCents] = useState(0)
  const [level, setLevel] = useState<'iniciante' | 'intermediario' | 'avancado'>('iniciante')
  const [lessons, setLessons] = useState<DraftLesson[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonVideo, setLessonVideo] = useState('')
  const [videoMode, setVideoMode] = useState<VideoMode>('upload')
  const [lessonFile, setLessonFile] = useState<File | null>(null)
  const [lessonType, setLessonType] = useState<LessonContentType>('lesson')
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()])
  const [lessonHint, setLessonHint] = useState<string | null>(null)

  function mapUploadError(code: string) {
    if (code === 'invalidType') return t('create.videoInvalidType')
    if (code === 'tooLarge') return t('create.videoTooLarge', { max: formatMb(MAX_VIDEO_BYTES) })
    if (code === 'noBucket') return t('create.videoNoBucket')
    return code
  }

  function resetLessonForm() {
    setLessonTitle('')
    setLessonVideo('')
    setLessonFile(null)
    setLessonType('lesson')
    setVideoMode('upload')
    setQuestions([emptyQuestion()])
    setLessonHint(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function openModal() {
    resetLessonForm()
    setModalOpen(true)
  }

  function onPickFile(file: File | null) {
    if (!file) {
      setLessonFile(null)
      return
    }
    const err = validateVideoFile(file)
    if (err) {
      setLessonHint(mapUploadError(err))
      setLessonFile(null)
      return
    }
    setLessonHint(null)
    setLessonFile(file)
  }

  function addLesson() {
    if (!lessonTitle.trim()) {
      setLessonHint(t('create.lessonTitleRequired'))
      return
    }
    if (!isQuizType(lessonType)) {
      if (videoMode === 'youtube' && lessonVideo.trim() && !isValidYouTubeUrl(lessonVideo)) {
        setLessonHint(t('create.youtubeInvalid'))
        return
      }
    } else {
      const valid = questions.filter(
        (q) => q.prompt.trim() && q.choices.every((c) => c.trim())
      )
      if (valid.length === 0) {
        setLessonHint(t('create.quizNeedQuestion'))
        return
      }
    }

    setLessons((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: lessonTitle.trim(),
        video_url: isQuizType(lessonType) ? '' : videoMode === 'youtube' ? lessonVideo.trim() : '',
        content_type: lessonType,
        videoFile: isQuizType(lessonType) ? undefined : videoMode === 'upload' ? lessonFile ?? undefined : undefined,
        videoFileName: isQuizType(lessonType) ? undefined : lessonFile?.name,
        questions: isQuizType(lessonType)
          ? questions.filter((q) => q.prompt.trim() && q.choices.every((c) => c.trim()))
          : [],
      },
    ])
    setModalOpen(false)
    resetLessonForm()
  }

  function removeLesson(id: string) {
    setLessons((prev) => prev.filter((l) => l.id !== id))
  }

  function moveLesson(id: string, dir: -1 | 1) {
    setLessons((prev) => {
      const i = prev.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(i, 1)
      next.splice(j, 0, item)
      return next
    })
  }

  function goNext() {
    setError(null)
    if (step === 1 && !title.trim()) {
      setError(t('create.courseTitleRequired'))
      return
    }
    setStep((s) => (s === 3 ? 3 : ((s + 1) as Step)))
  }

  async function saveCourse(forReview: boolean) {
    if (!user) return
    if (!title.trim()) {
      setError(t('create.courseTitleRequired'))
      setStep(1)
      return
    }
    setError(null)
    setUploadProgress(null)
    setLoading(true)

    const base = {
      instructor_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      price: reaisFromCents(priceCents),
      level,
      published: false,
    }

    let course: { id: string } | null = null
    let courseErr = (
      await supabase
        .from('courses')
        .insert({ ...base, review_status: forReview ? 'pending_review' : 'draft' })
        .select('id')
        .single()
    )

    if (courseErr.error?.message?.includes('review_status')) {
      courseErr = await supabase.from('courses').insert(base).select('id').single()
    }

    if (courseErr.error || !courseErr.data) {
      setError(courseErr.error?.message ?? t('create.error'))
      setLoading(false)
      return
    }
    course = courseErr.data

    if (lessons.length > 0) {
      const { data: inserted, error: lessonsErr } = await supabase
        .from('lessons')
        .insert(
          lessons.map((l, i) => ({
            course_id: course!.id,
            title: l.title,
            video_url: l.videoFile ? null : l.video_url || null,
            sort_order: i,
            is_preview: i === 0,
            content_type: l.content_type,
          }))
        )
        .select('id')

      if (lessonsErr || !inserted) {
        setError(lessonsErr?.message ?? t('create.error'))
        setLoading(false)
        return
      }

      for (let i = 0; i < lessons.length; i++) {
        const draft = lessons[i]
        const row = inserted[i]
        if (!row?.id) continue

        if (draft.questions.length > 0) {
          const { error: qErr } = await supabase.from('quiz_questions').insert(
            draft.questions.map((q, qi) => ({
              lesson_id: row.id,
              prompt: q.prompt.trim(),
              choices: q.choices.map((c) => c.trim()),
              correct_index: q.correctIndex,
              sort_order: qi,
            }))
          )
          if (qErr) {
            setError(qErr.message)
            setLoading(false)
            return
          }
        }

        if (!draft.videoFile) continue
        setUploadProgress(t('create.uploadingLesson', { n: String(i + 1), total: String(lessons.length) }))
        const { url, error: upErr } = await uploadLessonVideo(user.id, course!.id, row.id, draft.videoFile)
        if (upErr) {
          setError(mapUploadError(upErr))
          setLoading(false)
          setUploadProgress(null)
          return
        }
        if (url) await supabase.from('lessons').update({ video_url: url }).eq('id', row.id)
      }
    }

    setLoading(false)
    setUploadProgress(null)
    navigate('/instrutor', { replace: true })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (step !== 3) {
      goNext()
      return
    }
    void saveCourse(true)
  }

  const steps: { n: Step; label: TranslationKey }[] = [
    { n: 1, label: 'create.stepInfo' },
    { n: 2, label: 'create.stepLessons' },
    { n: 3, label: 'create.stepReview' },
  ]

  return (
    <div className="page-shell">
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-10">
        <Link to="/meus-cursos?view=teaching" className="inline-flex items-center gap-1 text-sm link-athenas mb-5">
          ← {t('create.back')}
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">{t('create.title')}</h1>
        </header>

        <ol className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <li key={s.n} className="flex items-center gap-2 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setStep(s.n)}
                className={`flex items-center gap-2 min-w-0 ${step === s.n ? 'text-neutral-900' : 'text-neutral-400'}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step === s.n ? 'bg-neutral-950 text-brand-gold' : 'bg-brand-gold-soft text-neutral-600'
                  }`}
                >
                  {s.n}
                </span>
                <span className="hidden sm:inline text-xs font-bold truncate">{t(s.label)}</span>
              </button>
              {i < steps.length - 1 && <span className="flex-1 h-px bg-brand-gold/30" />}
            </li>
          ))}
        </ol>

        <form onSubmit={handleSubmit}>
          {error && (
            <p className="alert-error mb-4" role="alert">
              {error}
            </p>
          )}
          {uploadProgress && <p className="alert-brand mb-4">{uploadProgress}</p>}

          {step === 1 && (
            <section className="card-athenas p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">{t('create.courseTitle')}</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('create.courseTitlePh')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">{t('create.description')}</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('create.descriptionPh')}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-2">{t('create.price')}</label>
                  <MoneyInput cents={priceCents} onCentsChange={setPriceCents} />
                  <p className="mt-1.5 text-[11px] text-neutral-500">{t('create.priceHint')}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-2">{t('create.level')}</label>
                  <BrandSelect
                    aria-label={t('create.level')}
                    value={level}
                    onChange={setLevel}
                    options={[
                      { value: 'iniciante', label: t('level.beginner') },
                      { value: 'intermediario', label: t('level.intermediate') },
                      { value: 'avancado', label: t('level.advanced') },
                    ]}
                  />
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="card-athenas overflow-hidden">
              <div className="px-6 py-4 border-b border-brand-gold/15 bg-brand-cream/60 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
                    {t('create.sectionLessons')}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-1">{t('create.lessonsHintHosted')}</p>
                </div>
                <button type="button" onClick={openModal} className="btn-primary !py-2 !px-4 text-xs shrink-0">
                  + {t('create.addLesson')}
                </button>
              </div>
              <div className="p-6">
                {lessons.length === 0 ? (
                  <p className="text-sm text-neutral-600 text-center py-10 border border-dashed border-brand-gold/40 bg-brand-gold-soft/30 rounded-xl">
                    {t('create.lessonsEmpty')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {lessons.map((l, i) => (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-brand-cream/30"
                      >
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => moveLesson(l.id, -1)}
                            className="text-neutral-400 hover:text-neutral-900 disabled:opacity-30 text-xs"
                            aria-label={t('create.moveUp')}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={i === lessons.length - 1}
                            onClick={() => moveLesson(l.id, 1)}
                            className="text-neutral-400 hover:text-neutral-900 disabled:opacity-30 text-xs"
                            aria-label={t('create.moveDown')}
                          >
                            ▼
                          </button>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-brand-gold text-xs font-bold">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-neutral-900 truncate">{l.title}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {typeLabel(l.content_type, t)}
                            {isQuizType(l.content_type)
                              ? ` · ${t('create.questionCount', { n: String(l.questions.length) })}`
                              : l.videoFileName
                                ? ` · ${l.videoFileName}`
                                : l.video_url && isYouTubeUrl(l.video_url)
                                  ? ` · YouTube`
                                  : l.video_url
                                    ? ` · ${t('create.videoTag')}`
                                    : ` · ${t('create.noVideoYet')}`}
                            {i === 0 && (
                              <span className="ml-2 text-[10px] font-bold uppercase bg-brand-gold-soft text-neutral-700 px-1.5 py-0.5 rounded">
                                {t('create.previewBadge')}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLesson(l.id)}
                          className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 px-2 py-1"
                        >
                          {t('create.removeLesson')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="card-athenas p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
                {t('create.stepReview')}
              </h2>
              <p className="text-lg font-bold text-neutral-900">{title || t('create.courseTitle')}</p>
              {description && <p className="text-sm text-neutral-600">{description}</p>}
              <p className="text-sm text-neutral-500">
                {lessons.length} {lessons.length === 1 ? t('common.lesson') : t('common.lessons')}
                {' · '}
                {priceCents === 0 ? t('common.free') : formatBRL(priceCents)}
              </p>
              <p className="text-xs text-neutral-500 rounded-xl border border-brand-gold/25 bg-brand-gold-soft/40 px-4 py-3">
                {t('create.publishHint')}
              </p>
            </section>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="btn-secondary flex-1 !py-3"
                >
                  {t('common.back')}
                </button>
              ) : (
                <span className="flex-1 hidden sm:block" />
              )}
              {step < 3 ? (
                <button type="button" onClick={goNext} className="btn-primary flex-1 !py-3">
                  {t('create.next')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void saveCourse(false)}
                    className="btn-secondary flex-1 !py-3"
                  >
                    {loading ? '...' : t('create.submitDraft')}
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 !py-3">
                    {loading ? '...' : t('create.submit')}
                  </button>
                </>
              )}
          </div>
        </form>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-neutral-950/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-900">{t('create.addLesson')}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-sm font-semibold text-neutral-500">
                {t('common.back')}
              </button>
            </div>
            <input
              placeholder={t('create.lessonTitle')}
              value={lessonTitle}
              onChange={(e) => {
                setLessonTitle(e.target.value)
                setLessonHint(null)
              }}
              className={inputClass}
            />
            <BrandSelect
              aria-label={t('create.lessonType')}
              value={lessonType}
              onChange={(next) => {
                setLessonType(next)
                setLessonHint(null)
                if (isQuizType(next)) {
                  setLessonFile(null)
                  setLessonVideo('')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }}
              options={[
                { value: 'lesson', label: t('create.typeLesson') },
                { value: 'quiz', label: t('create.typeQuiz') },
                { value: 'simulado', label: t('create.typeExam') },
              ]}
            />

            {isQuizType(lessonType) ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  {t('create.quizSection')}
                </p>
                <QuestionBuilder questions={questions} setQuestions={setQuestions} t={t} />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  {t('create.videoSection')}
                </p>
                <div className="flex gap-2 p-1 bg-brand-cream rounded-full border border-brand-gold/20">
                  <button
                    type="button"
                    onClick={() => setVideoMode('upload')}
                    className={`flex-1 py-2 text-xs font-bold rounded-full ${
                      videoMode === 'upload' ? 'bg-neutral-950 text-brand-gold' : 'text-neutral-600'
                    }`}
                  >
                    {t('create.modeUpload')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoMode('youtube')}
                    className={`flex-1 py-2 text-xs font-bold rounded-full ${
                      videoMode === 'youtube' ? 'bg-neutral-950 text-brand-gold' : 'text-neutral-600'
                    }`}
                  >
                    {t('create.modeYoutube')}
                  </button>
                </div>
                {videoMode === 'upload' ? (
                  <label className="flex flex-col items-center justify-center w-full py-8 border-2 border-dashed border-brand-gold/40 rounded-xl cursor-pointer hover:border-brand-gold">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                      className="hidden"
                      onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                    />
                    <span className="text-sm font-bold text-neutral-900">{t('create.pickVideo')}</span>
                    <span className="text-xs text-neutral-500 mt-1">
                      {t('create.pickVideoHint', { max: formatMb(MAX_VIDEO_BYTES) })}
                    </span>
                    {lessonFile && (
                      <span className="text-xs text-green-700 mt-2">
                        ✓ {lessonFile.name}
                      </span>
                    )}
                  </label>
                ) : (
                  <input
                    placeholder={t('create.lessonVideo')}
                    value={lessonVideo}
                    onChange={(e) => setLessonVideo(e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
            )}

            {lessonHint && <p className="alert-brand text-xs">{lessonHint}</p>}
            <button type="button" onClick={addLesson} className="btn-primary w-full !py-3">
              {t('create.addLesson')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function typeLabel(type: LessonContentType, t: (key: TranslationKey) => string) {
  if (type === 'quiz') return t('trail.typeQuiz')
  if (type === 'simulado') return t('trail.typeExam')
  return t('trail.typeLesson')
}

function QuestionBuilder({
  questions,
  setQuestions,
  t,
}: {
  questions: DraftQuestion[]
  setQuestions: (next: DraftQuestion[] | ((prev: DraftQuestion[]) => DraftQuestion[])) => void
  t: (key: TranslationKey, vars?: Record<string, string>) => string
}) {
  function update(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-neutral-200 p-3 space-y-2 bg-brand-cream/40">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-neutral-600">
              {t('create.questionN', { n: String(i + 1) })}
            </p>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                className="text-xs text-red-600 font-semibold"
              >
                {t('create.removeLesson')}
              </button>
            )}
          </div>
          <input
            placeholder={t('create.questionPh')}
            value={q.prompt}
            onChange={(e) => update(q.id, { prompt: e.target.value })}
            className={inputClass}
          />
          {q.choices.map((choice, idx) => (
            <label key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${q.id}`}
                checked={q.correctIndex === idx}
                onChange={() => update(q.id, { correctIndex: idx })}
              />
              <input
                placeholder={t('create.choicePh', { n: String(idx + 1) })}
                value={choice}
                onChange={(e) => {
                  const next = [...q.choices] as DraftQuestion['choices']
                  next[idx] = e.target.value
                  update(q.id, { choices: next })
                }}
                className={`${inputClass} !py-2`}
              />
            </label>
          ))}
          <p className="text-[10px] text-neutral-500">{t('create.correctHint')}</p>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
        className="w-full py-2.5 text-sm font-bold border-2 border-dashed border-brand-gold/40 rounded-xl text-neutral-700 hover:border-brand-gold"
      >
        + {t('create.addQuestion')}
      </button>
    </div>
  )
}
