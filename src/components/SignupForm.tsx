import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { SocialLogin } from './SocialLogin'

/** Formulário de cadastro: mesmo visual do formulário de login (lado direito do cartão). */
export function SignupForm({ onDone }: { onDone: () => void }) {
  const { signUp } = useAuth()
  const { t } = useLanguage()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'instructor'>('student')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) {
      setError(t('login.emailInvalid'))
      return
    }
    if (password.length < 6) {
      setError(t('signup.passwordShort'))
      return
    }
    setError(null)
    setLoading(true)

    const { error: err } = await signUp(email.trim(), password, fullName.trim(), role)
    setLoading(false)

    if (err) {
      setError(err)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">{t('signup.confirmEmail')}</h2>
        <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{t('signup.sentTo', { email })}</p>
        <button type="button" onClick={onDone} className="btn-primary w-full mt-6 !py-4 tracking-[0.2em] uppercase">
          {t('signup.backLogin')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignup} className="space-y-3">
      {error && <p className="alert-error">{error}</p>}

      <input
        type="text"
        required
        autoComplete="name"
        aria-label={t('signup.fullName')}
        placeholder={t('signup.fullName')}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="input-athenas"
      />
      <input
        type="email"
        required
        autoComplete="email"
        aria-label={t('forgot.emailLabel')}
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-athenas"
      />
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        aria-label={t('login.password')}
        placeholder={`${t('login.password')} (${t('signup.passwordHint').toLowerCase()})`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-athenas"
      />

      <fieldset className="pt-1">
        <legend className="text-sm text-neutral-600 mb-2">{t('signup.role')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['student', 'instructor'] as const).map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-full border px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                role === value
                  ? 'border-neutral-900 bg-brand-gold-soft/60 text-neutral-900'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:border-brand-gold'
              }`}
            >
              <input
                type="radio"
                name="role"
                className="sr-only"
                checked={role === value}
                onChange={() => setRole(value)}
              />
              {value === 'student' ? t('signup.student') : t('signup.instructor')}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={loading} className="btn-primary w-full !mt-5 !py-4 tracking-[0.2em] uppercase">
        {loading ? t('signup.submitting') : t('signup.submit')}
      </button>

      <SocialLogin />
    </form>
  )
}
