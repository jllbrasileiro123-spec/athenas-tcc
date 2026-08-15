import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandMark } from '../components/BrandMark'

export function ForgotPassword() {
  const { resetPassword } = useAuth()
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <header className="border-b border-brand-gold/20 bg-white px-6 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-neutral-950 font-bold text-xl tracking-widest uppercase">
          <BrandMark framed className="h-8 w-8" alt="" />
          ATHENAS
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] rounded-2xl border border-brand-gold/20 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">{t('forgot.title')}</h1>
          <p className="text-neutral-600 text-sm mb-6">{t('forgot.desc')}</p>

          {sent ? (
            <div className="alert-brand">
              <p className="font-semibold">{t('forgot.sentTitle')}</p>
              <p className="mt-1 text-neutral-700">{t('forgot.sentBody', { email })}</p>
              <Link to="/login" className="link-athenas inline-block mt-4">
                {t('signup.backLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="alert-error">{error}</p>}
              <div>
                <label className="block text-sm font-bold mb-1">{t('forgot.emailLabel')}</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-athenas !rounded-xl"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
                {loading ? t('forgot.submitting') : t('forgot.submit')}
              </button>
              <Link to="/login" className="link-athenas block text-center text-sm">
                {t('signup.backLogin')}
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
