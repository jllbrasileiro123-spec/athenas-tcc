import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { SignupModal } from '../components/SignupModal'
import { SocialLogin } from '../components/SocialLogin'
import { BrandMark } from '../components/BrandMark'
import { isSupabaseConfigured } from '../lib/supabase'

const STORAGE_EMAIL = 'athenas_remember_email'

function MailIcon() {
  return (
    <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

export function Login({ openSignup = false }: { openSignup?: boolean }) {
  const { signIn, user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/explorar'

  const [email, setEmail] = useState(() => localStorage.getItem(STORAGE_EMAIL) ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => !!localStorage.getItem(STORAGE_EMAIL))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSignup, setShowSignup] = useState(openSignup)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('oauth_error')
    if (oauthError) {
      setError(decodeURIComponent(oauthError))
      params.delete('oauth_error')
      const next = params.toString()
      const path = window.location.pathname + (next ? `?${next}` : '')
      window.history.replaceState({}, '', path)
    }
  }, [])

  if (user) {
    return <Navigate to="/explorar" replace />
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setError(t('login.emailInvalid'))
      return
    }
    setError(null)
    setLoading(true)

    if (remember) {
      localStorage.setItem(STORAGE_EMAIL, email.trim())
    } else {
      localStorage.removeItem(STORAGE_EMAIL)
    }

    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)

    if (err) {
      setError(err)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-dvh bg-brand-cream flex flex-col items-center justify-center p-4 gap-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      {!isSupabaseConfigured && (
        <div className="w-full max-w-[920px] alert-brand">
          <p className="font-semibold">Supabase ainda não configurado</p>
          <p className="mt-1 text-neutral-700">
            Edite o arquivo <code className="font-mono text-xs">.env</code> com a URL e a chave{' '}
            <code className="font-mono text-xs">anon</code> do seu projeto Supabase e reinicie{' '}
            <code className="font-mono text-xs">npm run dev</code>.
          </p>
        </div>
      )}
      <div className="w-full max-w-[920px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row md:min-h-[520px] border border-brand-gold/20">
        <div className="bg-neutral-950 text-white p-6 sm:p-10 md:p-12 flex flex-col justify-between md:w-[42%] border-r border-brand-gold/20">
          <div>
            <BrandMark className="h-12 sm:h-14 w-auto max-w-[11rem]" alt="ATHENAS" />
            <p className="mt-3 text-sm font-semibold tracking-[0.25em] uppercase text-brand-gold">
              ATHENAS
            </p>
          </div>
          <div className="mt-6 md:mt-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">{t('login.welcome')}</h1>
            <p className="text-neutral-400 mt-3 md:mt-4 text-sm leading-relaxed">{t('login.welcomeDesc')}</p>
          </div>
        </div>

        <div className="bg-brand-cream/40 p-6 sm:p-10 md:p-12 flex flex-col justify-center md:w-[58%]">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">{t('login.title')}</h2>
            <p className="text-neutral-500 text-sm mt-1">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && <p className="alert-error">{error}</p>}

            <div className="flex items-center gap-3 bg-white border border-neutral-300 rounded-full px-4 py-3 focus-within:border-brand-gold focus-within:ring-1 focus-within:ring-brand-gold transition-colors">
              <MailIcon />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400 text-base"
              />
            </div>

            <div className="flex items-center gap-3 bg-white border border-neutral-300 rounded-full px-4 py-3 focus-within:border-brand-gold focus-within:ring-1 focus-within:ring-brand-gold transition-colors">
              <LockIcon />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs font-bold text-brand-gold shrink-0 hover:underline"
              >
                {showPassword ? t('login.hide') : t('login.show')}
              </button>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 accent-brand-gold rounded"
              />
              <span className="text-sm text-neutral-600">{t('login.remember')}</span>
            </label>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 !py-4 tracking-[0.2em] uppercase">
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <SocialLogin />

          <p className="text-center text-sm text-neutral-600 mt-6">
            {t('login.noAccount')}{' '}
            <button type="button" onClick={() => setShowSignup(true)} className="font-bold text-brand-gold hover:underline">
              {t('login.signupLink')}
            </button>
          </p>
          <p className="text-center text-sm mt-2">
            <Link to="/esqueci-senha" className="text-neutral-500 hover:text-brand-gold hover:underline">
              {t('login.forgot')}
            </Link>
          </p>
        </div>
      </div>

      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
    </div>
  )
}
