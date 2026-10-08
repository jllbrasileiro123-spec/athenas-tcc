import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { SignupForm } from '../components/SignupForm'
import { SocialLogin } from '../components/SocialLogin'
import { AuthShell, LockIcon, MailIcon } from '../components/AuthShell'
import { isSupabaseConfigured } from '../lib/supabase'

const STORAGE_EMAIL = 'athenas_remember_email'

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
  // Entrar e Cadastrar são a mesma tela: só troca o lado direito do cartão
  const signup = openSignup
  const switchTo = (path: '/login' | '/cadastro') => {
    setError(null)
    navigate(path, { replace: true, state: location.state })
  }

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
    <AuthShell
      panelTitle={signup ? t('signup.welcome') : t('login.welcome')}
      panelDesc={signup ? t('signup.welcomeDesc') : t('login.welcomeDesc')}
      title={signup ? t('signup.title') : t('login.title')}
      subtitle={t('login.subtitle')}
      notice={
        !isSupabaseConfigured && (
          <div className="w-full max-w-[920px] alert-brand">
            <p className="font-semibold">Supabase ainda não configurado</p>
            <p className="mt-1 text-neutral-700">
              Edite o arquivo <code className="font-mono text-xs">.env</code> com a URL e a chave{' '}
              <code className="font-mono text-xs">anon</code> do seu projeto Supabase e reinicie{' '}
              <code className="font-mono text-xs">npm run dev</code>.
            </p>
          </div>
        )
      }
    >

          {signup ? (
            <>
              <SignupForm onDone={() => switchTo('/login')} />
              <p className="text-center text-sm text-neutral-600 mt-6">
                {t('signup.haveAccount')}{' '}
                <button type="button" onClick={() => switchTo('/login')} className="font-bold text-brand-gold hover:underline">
                  {t('signup.loginLink')}
                </button>
              </p>
            </>
          ) : (
          <>
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
            <button type="button" onClick={() => switchTo('/cadastro')} className="font-bold text-brand-gold hover:underline">
              {t('login.signupLink')}
            </button>
          </p>
          <p className="text-center text-sm mt-2">
            <Link to="/esqueci-senha" className="text-neutral-500 hover:text-brand-gold hover:underline">
              {t('login.forgot')}
            </Link>
          </p>
          </>
          )}
    </AuthShell>
  )
}
