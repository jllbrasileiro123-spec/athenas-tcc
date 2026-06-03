import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { SignupModal } from '../components/SignupModal'
import { SocialLogin } from '../components/SocialLogin'

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
    <div className="min-h-screen bg-neutral-200 flex items-center justify-center p-4">
      <div className="w-full max-w-[920px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[520px]">
        <div className="bg-neutral-950 text-white p-10 md:p-12 flex flex-col justify-between md:w-[42%]">
          <p className="text-sm font-semibold tracking-[0.25em] uppercase">ATHENAS</p>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">{t('login.welcome')}</h1>
            <p className="text-neutral-400 mt-4 text-sm leading-relaxed">{t('login.welcomeDesc')}</p>
          </div>
        </div>

        <div className="bg-neutral-100 p-10 md:p-12 flex flex-col justify-center md:w-[58%]">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900">{t('login.title')}</h2>
            <p className="text-neutral-500 text-sm mt-1">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 bg-neutral-200/80 border border-neutral-300 rounded-full px-4 py-3 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-colors">
              <MailIcon />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400 text-sm"
              />
            </div>

            <div className="flex items-center gap-3 bg-neutral-200/80 border border-neutral-300 rounded-full px-4 py-3 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 transition-colors">
              <LockIcon />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder={t('login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs font-bold text-neutral-900 shrink-0 hover:underline"
              >
                {showPassword ? t('login.hide') : t('login.show')}
              </button>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 accent-neutral-900 rounded"
              />
              <span className="text-sm text-neutral-600">{t('login.remember')}</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 bg-neutral-950 text-white font-bold text-sm tracking-[0.2em] uppercase rounded-full hover:bg-black disabled:opacity-60 transition-colors"
            >
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <SocialLogin />

          <p className="text-center text-sm text-neutral-600 mt-6">
            {t('login.noAccount')}{' '}
            <button
              type="button"
              onClick={() => setShowSignup(true)}
              className="font-bold text-neutral-900 hover:underline"
            >
              {t('login.signupLink')}
            </button>
          </p>
          <p className="text-center text-sm mt-2">
            <Link to="/esqueci-senha" className="text-neutral-500 hover:text-neutral-900 hover:underline">
              {t('login.forgot')}
            </Link>
          </p>
        </div>
      </div>

      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
    </div>
  )
}
