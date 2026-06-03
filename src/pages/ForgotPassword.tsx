import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

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
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b px-6 py-4">
        <Link to="/" className="text-brand font-bold text-xl tracking-widest uppercase">
          ATHENAS
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <h1 className="text-2xl font-bold mb-2">{t('forgot.title')}</h1>
          <p className="text-slate-600 text-sm mb-6">{t('forgot.desc')}</p>

          {sent ? (
            <div className="bg-green-50 border border-green-200 p-4 rounded text-sm">
              <p className="font-semibold text-green-900">{t('forgot.sentTitle')}</p>
              <p className="text-green-800 mt-1">{t('forgot.sentBody', { email })}</p>
              <Link to="/login" className="inline-block mt-4 text-brand font-semibold hover:underline">
                {t('signup.backLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div>
                <label className="block text-sm font-bold mb-1">{t('forgot.emailLabel')}</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-900 rounded-sm focus:outline-none focus:border-brand"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-brand text-white font-bold hover:bg-brand-dark disabled:opacity-60"
              >
                {loading ? t('forgot.submitting') : t('forgot.submit')}
              </button>
              <Link to="/login" className="block text-center text-sm text-brand font-semibold hover:underline">
                {t('signup.backLogin')}
              </Link>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
