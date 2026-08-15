import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandMark } from './BrandMark'
import { SocialLogin } from './SocialLogin'

interface SignupModalProps {
  onClose: () => void
}

export function SignupModal({ onClose }: SignupModalProps) {
  const { signUp } = useAuth()
  const { t } = useLanguage()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'instructor'>('student')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-title"
        className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl border border-brand-gold/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-gold/20 bg-brand-cream">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.25em] uppercase text-brand-gold">
              <BrandMark framed className="h-5 w-5" alt="" />
              ATHENAS
            </p>
            <h2 id="signup-title" className="text-lg font-bold text-neutral-900">
              {done ? t('signup.confirmEmail') : t('signup.title')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-neutral-500 hover:bg-brand-gold-soft hover:text-neutral-900 transition-colors"
            aria-label={t('common.back')}
          >
            ✕
          </button>
        </div>

        <div className="p-5 bg-brand-cream/40">
          {done ? (
            <div className="text-center py-2">
              <p className="text-sm text-neutral-600 leading-relaxed">
                {t('signup.sentTo', { email })}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary w-full mt-5 !py-3 tracking-wide uppercase"
              >
                {t('signup.backLogin')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              {error && <p className="alert-error text-xs">{error}</p>}

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {t('signup.fullName')}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-athenas !rounded-xl !py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {t('forgot.emailLabel')}
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-athenas !rounded-xl !py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {t('login.password')}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder={t('signup.passwordHint')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-athenas !rounded-xl !py-2.5"
                />
              </div>

              <fieldset className="pt-1">
                <legend className="text-xs font-bold text-neutral-700 mb-2">{t('signup.role')}</legend>
                <div className="space-y-1.5 text-xs text-neutral-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'student'}
                      onChange={() => setRole('student')}
                      className="accent-brand-gold"
                    />
                    {t('signup.student')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'instructor'}
                      onChange={() => setRole('instructor')}
                      className="accent-brand-gold"
                    />
                    {t('signup.instructor')}
                  </label>
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-1 !py-3 tracking-wide uppercase"
              >
                {loading ? t('signup.submitting') : t('signup.submit')}
              </button>

              <SocialLogin compact />
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
