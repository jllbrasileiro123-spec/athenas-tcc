import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  isYouTubeUrl,
  uploadLessonVideo,
  validateVideoFile,
  MAX_VIDEO_BYTES,
} from '../lib/videoStorage'

type DraftLesson = {
  id: string
  title: string
  video_url: string
  videoFile?: File
  videoFileName?: string
}

type VideoMode = 'upload' | 'youtube'

const inputClass =
  'w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors'

function formatMb(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

export function CreateCourse() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0')
  const [level, setLevel] = useState<'iniciante' | 'intermediario' | 'avancado'>('iniciante')
  const [published, setPublished] = useState(false)
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonVideo, setLessonVideo] = useState('')
  const [videoMode, setVideoMode] = useState<VideoMode>('upload')
  const [lessonFile, setLessonFile] = useState<File | null>(null)
  const [lessons, setLessons] = useState<DraftLesson[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lessonHint, setLessonHint] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  function mapUploadError(code: string) {
    if (code === 'invalidType') return t('create.videoInvalidType')
    if (code === 'tooLarge') return t('create.videoTooLarge', { max: formatMb(MAX_VIDEO_BYTES) })
    if (code === 'noBucket') return t('create.videoNoBucket')
    return code
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
    if (videoMode === 'youtube' && lessonVideo.trim() && !lessonVideo.includes('youtube') && !lessonVideo.includes('youtu.be')) {
      setLessonHint(t('create.youtubeInvalid'))
      return
    }

    setLessonHint(null)
    setLessons((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: lessonTitle.trim(),
        video_url: videoMode === 'youtube' ? lessonVideo.trim() : '',
        videoFile: videoMode === 'upload' ? lessonFile ?? undefined : undefined,
        videoFileName: lessonFile?.name,
      },
    ])
    setLessonTitle('')
    setLessonVideo('')
    setLessonFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeLesson(id: string) {
    setLessons((prev) => prev.filter((l) => l.id !== id))
  }

  async function saveCourse(publish: boolean) {
    if (!user) return
    setError(null)
    setUploadProgress(null)
    setLoading(true)

    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .insert({
        instructor_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        level,
        published: publish,
      })
      .select()
      .single()

    if (courseErr || !course) {
      setError(courseErr?.message ?? t('create.error'))
      setLoading(false)
      return
    }

    if (lessons.length > 0) {
      const { data: inserted, error: lessonsErr } = await supabase
        .from('lessons')
        .insert(
          lessons.map((l, i) => ({
            course_id: course.id,
            title: l.title,
            video_url: l.videoFile ? null : l.video_url || null,
            sort_order: i,
            is_preview: i === 0,
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
        if (!row?.id || !draft.videoFile) continue

        setUploadProgress(t('create.uploadingLesson', { n: String(i + 1), total: String(lessons.length) }))
        const { url, error: upErr } = await uploadLessonVideo(
          user.id,
          course.id,
          row.id,
          draft.videoFile
        )
        if (upErr) {
          setError(mapUploadError(upErr))
          setLoading(false)
          setUploadProgress(null)
          return
        }
        if (url) {
          await supabase.from('lessons').update({ video_url: url }).eq('id', row.id)
        }
      }
    }

    setLoading(false)
    setUploadProgress(null)
    navigate('/meus-cursos?view=teaching', { replace: true })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await saveCourse(published)
  }

  return (
    <div className="min-h-full bg-neutral-100">
      <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
        <Link
          to="/meus-cursos?view=teaching"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 mb-6"
        >
          ← {t('create.back')}
        </Link>

        <header className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500 mb-2">
            ATHENAS · {t('nav.myLessons')}
          </p>
          <h1 className="text-3xl font-bold text-neutral-900">{t('create.title')}</h1>
          <p className="text-neutral-600 mt-2 text-sm max-w-lg">{t('create.subtitle')}</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
              {error}
            </p>
          )}
          {uploadProgress && (
            <p className="text-sm text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-3">
              {uploadProgress}
            </p>
          )}

          <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
                {t('create.sectionInfo')}
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">
                  {t('create.courseTitle')}
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('create.courseTitlePh')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">
                  {t('create.description')}
                </label>
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
                  <label className="block text-xs font-bold text-neutral-700 mb-2">
                    {t('create.price')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-2">
                    {t('create.level')}
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as typeof level)}
                    className={inputClass}
                  >
                    <option value="iniciante">{t('level.beginner')}</option>
                    <option value="intermediario">{t('level.intermediate')}</option>
                    <option value="avancado">{t('level.advanced')}</option>
                  </select>
                </div>
              </div>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50 cursor-pointer hover:border-neutral-400 transition-colors">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-neutral-900 rounded"
                />
                <span>
                  <span className="block text-sm font-bold text-neutral-900">{t('create.publish')}</span>
                  <span className="block text-xs text-neutral-500 mt-0.5">{t('create.publishHint')}</span>
                </span>
              </label>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">
                {t('create.sectionLessons')}
              </h2>
              <p className="text-xs text-neutral-500 mt-1">{t('create.lessonsHintHosted')}</p>
            </div>

            <div className="p-6">
              {lessons.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6 border border-dashed border-neutral-200 rounded-xl mb-5">
                  {t('create.lessonsEmpty')}
                </p>
              ) : (
                <ul className="space-y-2 mb-5">
                  {lessons.map((l, i) => (
                    <li
                      key={l.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-neutral-900 truncate">{l.title}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {l.videoFileName ? (
                            <span className="text-green-700">
                              📁 {l.videoFileName} ({t('create.hostedPending')})
                            </span>
                          ) : l.video_url && isYouTubeUrl(l.video_url) ? (
                            <span className="text-green-700">▶ YouTube</span>
                          ) : l.video_url ? (
                            <span className="text-green-700">▶ {t('create.videoTag')}</span>
                          ) : (
                            t('create.noVideoYet')
                          )}
                          {i === 0 && (
                            <span className="ml-2 text-[10px] font-bold uppercase bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded">
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

              <div className="rounded-xl border border-neutral-200 p-4 bg-white space-y-4">
                <input
                  placeholder={t('create.lessonTitle')}
                  value={lessonTitle}
                  onChange={(e) => {
                    setLessonTitle(e.target.value)
                    setLessonHint(null)
                  }}
                  className={inputClass}
                />

                <div className="flex gap-2 p-1 bg-neutral-100 rounded-full">
                  <button
                    type="button"
                    onClick={() => setVideoMode('upload')}
                    className={`flex-1 py-2 text-xs font-bold rounded-full transition-colors ${
                      videoMode === 'upload'
                        ? 'bg-neutral-950 text-white'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {t('create.modeUpload')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoMode('youtube')}
                    className={`flex-1 py-2 text-xs font-bold rounded-full transition-colors ${
                      videoMode === 'youtube'
                        ? 'bg-neutral-950 text-white'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {t('create.modeYoutube')}
                  </button>
                </div>

                {videoMode === 'upload' ? (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center w-full py-8 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer hover:border-neutral-900 hover:bg-neutral-50 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        className="hidden"
                        onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                      />
                      <span className="text-2xl mb-2">↑</span>
                      <span className="text-sm font-bold text-neutral-900">
                        {t('create.pickVideo')}
                      </span>
                      <span className="text-xs text-neutral-500 mt-1 text-center px-4">
                        {t('create.pickVideoHint', { max: formatMb(MAX_VIDEO_BYTES) })}
                      </span>
                    </label>
                    {lessonFile && (
                      <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        ✓ {lessonFile.name} ({formatMb(lessonFile.size)})
                      </p>
                    )}
                  </div>
                ) : (
                  <input
                    placeholder={t('create.lessonVideo')}
                    value={lessonVideo}
                    onChange={(e) => setLessonVideo(e.target.value)}
                    className={inputClass}
                  />
                )}

                {lessonHint && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">{lessonHint}</p>
                )}
                <button
                  type="button"
                  onClick={addLesson}
                  className="w-full py-2.5 text-sm font-bold border-2 border-dashed border-neutral-300 rounded-xl text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                >
                  + {t('create.addLesson')}
                </button>
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => saveCourse(false)}
              className="flex-1 py-3.5 text-sm font-bold border border-neutral-900 rounded-full text-neutral-900 hover:bg-neutral-100 disabled:opacity-50 transition-colors"
            >
              {loading && !published ? '...' : t('create.submitDraft')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-bold bg-neutral-950 text-white rounded-full hover:bg-black disabled:opacity-60 transition-colors tracking-wide"
            >
              {loading && published ? '...' : t('create.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
