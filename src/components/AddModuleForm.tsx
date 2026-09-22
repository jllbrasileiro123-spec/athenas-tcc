import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { createCourseModule } from '../lib/createModule'
import { formatMaxVideoLabel, MAX_VIDEO_BYTES } from '../lib/videoStorage'
import type { CourseLevel } from '../types/database'

type AddModuleFormProps = {
  courseId: string
  userId: string
  moduleIndex: number
  nextLessonSort: number
  onCreated: () => void
}

export function AddModuleForm({
  courseId,
  userId,
  moduleIndex,
  nextLessonSort,
  onCreated,
}: AddModuleFormProps) {
  const { t } = useLanguage()
  const n = moduleIndex + 1
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(`Módulo ${n} — `)
  const [description, setDescription] = useState(
    n === 1
      ? 'Começa liberado. Explicação, tutorial, podcast e exercício.'
      : 'Libera ao concluir o módulo anterior — ou pelo teste de nivelamento.'
  )
  const [level, setLevel] = useState<CourseLevel>(
    n <= 2 ? 'iniciante' : n === 3 ? 'intermediario' : 'avancado'
  )
  const [explicacaoFile, setExplicacaoFile] = useState<File | null>(null)
  const [tutorialFile, setTutorialFile] = useState<File | null>(null)
  const [podcastFile, setPodcastFile] = useState<File | null>(null)
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await createCourseModule({
      courseId,
      userId,
      title,
      description,
      level,
      moduleIndex,
      nextLessonSort,
      explicacaoFile,
      tutorialFile,
      podcastFile,
      materialFile,
      materialTitle: materialFile
        ? `Material de apoio — Módulo ${n}`
        : undefined,
    })
    setBusy(false)
    if (err) {
      if (err === 'emptyTitle') setError(t('module.createEmptyTitle'))
      else if (err === 'tooLarge')
        setError(t('create.videoTooLarge', { max: formatMaxVideoLabel() }))
      else if (err === 'invalidType') setError(t('create.videoInvalidType'))
      else if (err === 'noBucket') setError(t('create.videoNoBucket'))
      else if (err === 'noMaterialBucket') setError(t('module.noMaterialBucket'))
      else setError(err)
      return
    }
    setOpen(false)
    setTitle(`Módulo ${n + 1} — `)
    setExplicacaoFile(null)
    setTutorialFile(null)
    setPodcastFile(null)
    setMaterialFile(null)
    onCreated()
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary w-full !py-3">
        {t('module.addCta', { n: String(n) })}
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-2xl border-2 border-brand-gold/40 bg-white p-5 space-y-4"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
          {t('module.createKicker')}
        </p>
        <h3 className="mt-1 text-lg font-bold text-neutral-900">
          {t('module.createTitle', { n: String(n) })}
        </h3>
        <p className="mt-1 text-sm text-neutral-600">{t('module.createBody')}</p>
      </div>

      <label className="block text-sm">
        <span className="font-semibold text-neutral-800">{t('module.fieldTitle')}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-athenas mt-1 w-full"
          required
        />
      </label>

      <label className="block text-sm">
        <span className="font-semibold text-neutral-800">{t('module.fieldDesc')}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-athenas mt-1 w-full min-h-[72px]"
          rows={2}
        />
      </label>

      <label className="block text-sm">
        <span className="font-semibold text-neutral-800">{t('module.fieldLevel')}</span>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as CourseLevel)}
          className="input-athenas mt-1 w-full"
        >
          <option value="iniciante">{t('level.beginner')}</option>
          <option value="intermediario">{t('level.intermediate')}</option>
          <option value="avancado">{t('level.advanced')}</option>
        </select>
      </label>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <FileField
          label={t('module.fileExplicacao')}
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          file={explicacaoFile}
          onChange={setExplicacaoFile}
          hint={t('module.fileVideoHint', { max: formatMaxVideoLabel() })}
        />
        <FileField
          label={t('module.fileTutorial')}
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          file={tutorialFile}
          onChange={setTutorialFile}
          hint={t('module.fileVideoHint', { max: formatMaxVideoLabel() })}
        />
        <FileField
          label={t('module.filePodcast')}
          accept="audio/*,.mp3,.m4a,.aac,.wav"
          file={podcastFile}
          onChange={setPodcastFile}
          hint={t('module.filePodcastHint')}
        />
        <FileField
          label={t('module.fileMaterial')}
          accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf"
          file={materialFile}
          onChange={setMaterialFile}
          hint={t('module.fileMaterialHint')}
        />
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">{t('module.createStructure')}</p>

      {error && (
        <p className="alert-error text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-primary !py-2.5 disabled:opacity-60">
          {busy ? t('common.loading') : t('module.createSubmit')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="btn-secondary !py-2.5"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

function FileField({
  label,
  accept,
  file,
  onChange,
  hint,
}: {
  label: string
  accept: string
  file: File | null
  onChange: (f: File | null) => void
  hint: string
}) {
  return (
    <label className="block rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
      <span className="font-semibold text-neutral-800">{label}</span>
      <input
        type="file"
        accept={accept}
        className="mt-1.5 block w-full text-xs"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          if (f && f.size > MAX_VIDEO_BYTES && accept.includes('video')) {
            onChange(null)
            return
          }
          onChange(f)
        }}
      />
      <span className="mt-1 block text-[11px] text-neutral-500">
        {file ? file.name : hint}
      </span>
    </label>
  )
}
