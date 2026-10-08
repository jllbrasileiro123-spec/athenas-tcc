import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { issueCertificate, isMissingCertificates, type Certificate as Cert } from '../lib/certificates'
import {
  canvasToBlob,
  certificateFileName,
  looksLikeFullName,
  renderCertificateImage,
} from '../lib/certificateImage'
import { CourseFeedbackModal } from '../components/CourseFeedbackModal'

export function Certificate() {
  const { courseId } = useParams<{ courseId: string }>()
  const { updateProfile } = useAuth()
  const { t, language } = useLanguage()

  const [cert, setCert] = useState<Cert | null>(null)
  const [incomplete, setIncomplete] = useState<{ done: number; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nameDraft, setNameDraft] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [rendering, setRendering] = useState(false)

  const load = useCallback(async () => {
    if (!courseId) return
    const { certificate, error: err } = await issueCertificate(courseId)
    if (err) {
      if (isMissingCertificates(err)) setMissing(true)
      else setError(err)
    } else if (certificate?.ok) {
      setCert(certificate)
      setNameDraft(certificate.holder_name)
      setEditingName(!looksLikeFullName(certificate.holder_name))
    } else if (certificate?.error === 'incomplete') {
      setIncomplete({
        done: certificate.completed_count ?? 0,
        total: certificate.total_lessons ?? 0,
      })
    }
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    void load()
  }, [load])

  const issuedDate = cert?.issued_at
    ? new Date(cert.issued_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const nameReady = !!cert && !editingName && looksLikeFullName(cert.holder_name)

  // Gera a imagem sempre que o nome (ou idioma) muda
  useEffect(() => {
    if (!cert || !nameReady) return
    let cancelled = false
    let url: string | null = null
    setRendering(true)
    const verifyUrl = `${window.location.origin}${import.meta.env.BASE_URL}verificar/${cert.code}`
    void renderCertificateImage({
      holderName: cert.holder_name.trim(),
      courseTitle: cert.course_title,
      totalLessons: cert.total_lessons,
      issuedDate,
      code: cert.code,
      verifyUrl: verifyUrl.replace(/^https?:\/\//, ''),
      labels: {
        kicker: t('certificate.kicker'),
        certifyThat: t('certificate.certifyThat'),
        completedThe: t('certificate.completedThe'),
        lessonsTotal: t('certificate.lessonsTotal', { total: String(cert.total_lessons) }),
        issuedOn: t('certificate.issuedLabel'),
        codeLabel: t('certificate.codeLabel'),
        verifyAt: t('certificate.verifyAt'),
      },
    })
      .then(canvasToBlob)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setImageBlob(blob)
        setImageUrl(url)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setRendering(false)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [cert, nameReady, issuedDate, t])

  async function saveName(e: FormEvent) {
    e.preventDefault()
    const name = nameDraft.trim().replace(/\s+/g, ' ')
    if (!looksLikeFullName(name)) {
      setError(t('certificate.nameInvalid'))
      return
    }
    setError(null)
    setSavingName(true)
    const { error: err } = await updateProfile({ full_name: name })
    setSavingName(false)
    if (err) {
      setError(err)
      return
    }
    setImageUrl(null)
    setImageBlob(null)
    // Recarrega do banco: o nome do certificado vem do perfil
    await load()
    setEditingName(false)
  }

  function download() {
    if (!imageUrl || !cert) return
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = certificateFileName(cert.holder_name, cert.code)
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function share() {
    if (!imageBlob || !cert) return
    const file = new File([imageBlob], certificateFileName(cert.holder_name, cert.code), {
      type: 'image/png',
    })
    try {
      await navigator.share({ files: [file], title: cert.course_title })
    } catch {
      /* usuário cancelou */
    }
  }

  const canShare =
    !!imageBlob &&
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File([imageBlob], 'c.png', { type: 'image/png' })] })

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[40vh]">
        <div className="spinner-athenas" />
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {missing ? (
          <p className="alert-brand text-sm">{t('certificate.missingTable')}</p>
        ) : incomplete ? (
          <div className="card-athenas p-8 text-center">
            <h1 className="text-xl font-bold text-neutral-900">{t('certificate.lockedTitle')}</h1>
            <p className="mt-2 text-sm text-neutral-600">
              {t('certificate.lockedBody', {
                done: String(incomplete.done),
                total: String(incomplete.total),
              })}
            </p>
            <Link to={`/curso/${courseId}`} className="btn-primary inline-flex mt-5 !px-4 !py-2.5 text-sm">
              {t('placement.openTrail')}
            </Link>
          </div>
        ) : cert ? (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
              {t('certificate.kicker')}
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-neutral-900">{cert.course_title}</h1>

            {editingName || !nameReady ? (
              <form onSubmit={saveName} className="card-athenas mt-6 p-6">
                <h2 className="font-bold text-neutral-900">{t('certificate.nameTitle')}</h2>
                <p className="mt-1 text-sm text-neutral-600">{t('certificate.nameDesc')}</p>
                <label htmlFor="cert-name" className="sr-only">
                  {t('certificate.nameLabel')}
                </label>
                <input
                  id="cert-name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  autoComplete="name"
                  maxLength={120}
                  className="input-athenas mt-4"
                  placeholder={t('certificate.namePh')}
                />
                {error && (
                  <p className="alert-error text-sm mt-3" role="alert">
                    {error}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="submit" disabled={savingName} className="btn-primary !px-4 !py-2.5 text-sm">
                    {savingName ? t('common.loading') : t('certificate.nameSave')}
                  </button>
                  {looksLikeFullName(cert.holder_name) && (
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(cert.holder_name)
                        setEditingName(false)
                        setError(null)
                      }}
                      className="btn-secondary !px-4 !py-2.5 text-sm"
                    >
                      {t('common.cancel')}
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <>
                <div className="mt-6 overflow-hidden rounded-2xl border border-brand-gold/40 bg-white shadow-sm">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={t('certificate.imageAlt', { name: cert.holder_name })}
                      className="block w-full h-auto"
                    />
                  ) : (
                    <div className="aspect-[2000/1414] flex items-center justify-center">
                      <div className="spinner-athenas" />
                    </div>
                  )}
                </div>

                {error && (
                  <p className="alert-error text-sm mt-3" role="alert">
                    {error}
                  </p>
                )}

                <p className="mt-3 text-sm text-neutral-600">
                  {t('certificate.nameShown', { name: cert.holder_name })}{' '}
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="link-athenas text-sm"
                  >
                    {t('certificate.nameFix')}
                  </button>
                </p>

                <div className="mt-6 flex flex-wrap gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={download}
                    disabled={!imageUrl || rendering}
                    className="btn-primary !px-4 !py-2.5 text-sm"
                  >
                    {t('certificate.download')}
                  </button>
                  {canShare && (
                    <button
                      type="button"
                      onClick={() => void share()}
                      className="btn-secondary !px-4 !py-2.5 text-sm"
                    >
                      {t('certificate.share')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-secondary !px-4 !py-2.5 text-sm"
                  >
                    {t('certificate.print')}
                  </button>
                  <Link to={`/verificar/${cert.code}`} className="btn-secondary !px-4 !py-2.5 text-sm">
                    {t('certificate.verifyCta')}
                  </Link>
                  <Link to={`/curso/${courseId}`} className="btn-secondary !px-4 !py-2.5 text-sm">
                    {t('placement.openTrail')}
                  </Link>
                </div>
              </>
            )}

            {courseId && <CourseFeedbackModal courseId={courseId} courseTitle={cert.course_title} auto />}
          </>
        ) : error ? (
          <p className="alert-error text-sm">{error}</p>
        ) : null}
      </div>
    </div>
  )
}
