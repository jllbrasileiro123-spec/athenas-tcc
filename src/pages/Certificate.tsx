import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { AthenaMark } from '../components/AthenaMark'
import { issueCertificate, isMissingCertificates, type Certificate as Cert } from '../lib/certificates'

export function Certificate() {
  const { courseId } = useParams<{ courseId: string }>()
  const { t, language } = useLanguage()

  const [cert, setCert] = useState<Cert | null>(null)
  const [incomplete, setIncomplete] = useState<{ done: number; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    async function load() {
      const { certificate, error: err } = await issueCertificate(courseId!)
      if (err) {
        if (isMissingCertificates(err)) setMissing(true)
        else setError(err)
      } else if (certificate?.ok) {
        setCert(certificate)
      } else if (certificate?.error === 'incomplete') {
        setIncomplete({
          done: certificate.completed_count ?? 0,
          total: certificate.total_lessons ?? 0,
        })
      }
      setLoading(false)
    }
    void load()
  }, [courseId])

  const issuedDate = cert?.issued_at
    ? new Date(cert.issued_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[40vh]">
        <div className="spinner-athenas" />
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {missing ? (
          <p className="alert-brand text-sm">{t('certificate.missingTable')}</p>
        ) : error ? (
          <p className="alert-error text-sm">{error}</p>
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
            <div className="rounded-2xl border-4 border-brand-gold/40 bg-white p-8 md:p-12 text-center shadow-sm print:border-2 print:shadow-none">
              <AthenaMark framed variant="header" className="h-16 w-16 mx-auto" alt="ATHENAS" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-brand-gold">
                {t('certificate.kicker')}
              </p>
              <h1 className="mt-4 text-2xl md:text-3xl font-bold text-neutral-900">
                {cert.holder_name}
              </h1>
              <p className="mt-3 text-sm text-neutral-600">{t('certificate.completedThe')}</p>
              <p className="mt-1 text-lg font-bold text-neutral-900">{cert.course_title}</p>
              <p className="mt-3 text-sm text-neutral-600">
                {t('certificate.lessonsTotal', { total: String(cert.total_lessons) })}
              </p>
              <p className="mt-6 text-sm text-neutral-500">
                {t('certificate.issuedOn', { date: issuedDate })}
              </p>
              <div className="mt-6 inline-block rounded-xl border border-brand-gold/40 bg-brand-gold-soft/30 px-5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  {t('certificate.codeLabel')}
                </p>
                <p className="mt-0.5 text-lg font-mono font-bold tracking-widest text-neutral-900">
                  {cert.code}
                </p>
              </div>
              <p className="mt-4 text-xs text-neutral-500">{t('certificate.verifyHint')}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-primary !px-4 !py-2.5 text-sm"
              >
                {t('certificate.print')}
              </button>
              <Link
                to={`/verificar/${cert.code}`}
                className="btn-secondary !px-4 !py-2.5 text-sm"
              >
                {t('certificate.verifyCta')}
              </Link>
              <Link to={`/curso/${courseId}`} className="btn-secondary !px-4 !py-2.5 text-sm">
                {t('placement.openTrail')}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
