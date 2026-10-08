import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { AuthField, AuthShell, MailIcon, authInputClass } from '../components/AuthShell'

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
    if (!email.includes('@')) {
      setError(t('login.emailInvalid'))
      return
    }
    setError(null)
    setLoading(true)
    const { error: err } = await resetPassword(email.trim())
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    setSent(true)
  }

  return (
    <AuthShell
      back={{ to: '/login', label: t('signup.backLogin') }}
      panelTitle={t('forgot.panelTitle')}
      panelDesc={t('forgot.panelDesc')}
      title={sent ? t('forgot.sentTitle') : t('forgot.title')}
      subtitle={sent ? undefined : t('forgot.desc')}
    >
      {sent ? (
        <div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold-soft [&_svg]:h-6 [&_svg]:w-6 [&_svg]:text-[#8a6a12]">
            <MailIcon />
          </div>
          <p className="mt-5 text-neutral-700 leading-relaxed">{t('forgot.sentBody', { email })}</p>
          <p className="mt-2 text-sm text-neutral-500">{t('forgot.checkSpam')}</p>
          <Link to="/login" className="btn-primary w-full mt-8 !py-4 tracking-[0.2em] uppercase">
            {t('signup.backLogin')}
          </Link>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 block w-full text-center text-sm text-neutral-500 hover:text-brand-gold hover:underline"
          >
            {t('forgot.tryOther')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="alert-error">{error}</p>}
          <AuthField icon={<MailIcon />}>
            <input
              type="email"
              required
              autoComplete="email"
              aria-label={t('forgot.emailLabel')}
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
            />
          </AuthField>
          <button type="submit" disabled={loading} className="btn-primary w-full !mt-6 !py-4 tracking-[0.2em] uppercase">
            {loading ? t('forgot.submitting') : t('forgot.submit')}
          </button>
          <p className="text-center text-sm text-neutral-600 !mt-6">
            {t('forgot.remembered')}{' '}
            <Link to="/login" className="font-bold text-brand-gold hover:underline">
              {t('signup.loginLink')}
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
