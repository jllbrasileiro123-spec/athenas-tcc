import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { isMissingCertificates, verifyCertificate, type Certificate } from '../lib/certificates'

export function VerifyCertificate() {
  const { code: codeParam } = useParams<{ code: string }>()
  const { t, language } = useLanguage()
  const navigate = useNavigate()

  const [code, setCode] = useState(codeParam ?? '')
  const [cert, setCert] = useState<Certificate | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!codeParam) return
    setCode(codeParam)
    void check(codeParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam])

  async function check(value: string) {
    if (!value.trim()) return
    setLoading(true)
    setNotFound(false)
    setCert(null)
    const { certificate, error } = await verifyCertificate(value)
    setLoading(false)
    if (error) {
      if (isMissingCertificates(error)) setMissing(true)
      return
    }
    if (certificate?.ok) setCert(certificate)
    else setNotFound(true)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    if (trimmed.toUpperCase() !== (codeParam ?? '').toUpperCase()) {
      navigate(`/verificar/${trimmed}`)
      return
    }
    void check(trimmed)
  }

  return (
    <div className="page-shell">
      <div className="max-w-xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">
          {t('verify.kicker')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{t('verify.title')}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t('verify.desc')}</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col sm:flex-row gap-2">
          <label htmlFor="cert-code" className="sr-only">
            {t('certificate.codeLabel')}
          </label>
          <input
            id="cert-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ATH-XXXX-XXXX"
            className="flex-1 rounded-full border border-neutral-300 px-4 py-3 text-sm font-mono tracking-widest outline-none focus:border-brand-gold"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="btn-primary !px-5 !py-3 text-sm disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('verify.check')}
          </button>
        </form>

        {missing && <p className="mt-6 alert-brand text-sm">{t('certificate.missingTable')}</p>}

        {notFound && <p className="mt-6 alert-error text-sm">{t('verify.notFound')}</p>}

        {cert && (
          <div className="mt-6 rounded-2xl border border-brand-gold/40 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">
              {t('verify.valid')}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  {t('verify.holder')}
                </dt>
                <dd className="font-bold text-neutral-900">{cert.holder_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  {t('verify.course')}
                </dt>
                <dd className="font-semibold text-neutral-900">{cert.course_title}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  {t('verify.issued')}
                </dt>
                <dd className="text-neutral-800">
                  {new Date(cert.issued_at).toLocaleDateString(
                    language === 'pt' ? 'pt-BR' : 'en-US',
                    { day: '2-digit', month: 'long', year: 'numeric' }
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">
                  {t('certificate.codeLabel')}
                </dt>
                <dd className="font-mono font-bold tracking-widest text-neutral-900">{cert.code}</dd>
              </div>
            </dl>
          </div>
        )}

        <Link to="/explorar" className="link-athenas inline-block mt-8 text-sm">
          ← {t('common.back')}
        </Link>
      </div>
    </div>
  )
}
