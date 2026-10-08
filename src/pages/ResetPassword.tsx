import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { AuthField, AuthShell, LockIcon, authInputClass } from '../components/AuthShell'

export function ResetPassword() {
  const { updatePassword } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError(t('password.tooShort'))
      return
    }
    if (password !== confirm) {
      setError(t('password.mismatch'))
      return
    }
    setError(null)
    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    setDone(true)
    setTimeout(() => navigate('/login', { replace: true }), 2000)
  }

  return (
    <AuthShell
      back={{ to: '/login', label: t('signup.backLogin') }}
      panelTitle={t('password.panelTitle')}
      panelDesc={t('password.panelDesc')}
      title={done ? t('password.resetDone') : t('password.resetTitle')}
      subtitle={done ? t('password.redirecting') : ready ? t('password.resetDesc') : undefined}
    >
      {done ? (
        <Link to="/login" className="btn-primary w-full !py-4 tracking-[0.2em] uppercase">
          {t('nav.login')}
        </Link>
      ) : !ready ? (
        <div className="flex items-center gap-3 text-neutral-600">
          <div className="spinner-athenas" />
          <p>{t('password.openingLink')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="alert-error">{error}</p>}
          <AuthField icon={<LockIcon />}>
            <input
              type={show ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              aria-label={t('password.new')}
              placeholder={`${t('password.new')} (${t('signup.passwordHint').toLowerCase()})`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="text-xs font-bold text-brand-gold shrink-0 hover:underline"
            >
              {show ? t('login.hide') : t('login.show')}
            </button>
          </AuthField>
          <AuthField icon={<LockIcon />}>
            <input
              type={show ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              aria-label={t('password.confirmFull')}
              placeholder={t('password.confirmFull')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authInputClass}
            />
          </AuthField>
          <button type="submit" disabled={loading} className="btn-primary w-full !mt-6 !py-4 tracking-[0.2em] uppercase">
            {loading ? t('password.saving') : t('password.saveNew')}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
