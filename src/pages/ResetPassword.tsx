import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandMark } from '../components/BrandMark'

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

  if (!ready && !done) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
        <div className="text-center">
          <div className="spinner-athenas mx-auto mb-3" />
          <p className="text-neutral-600">{t('password.openingLink')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-brand-gold/20 bg-white p-6 shadow-sm">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-gold mb-4">
          <BrandMark framed className="h-5 w-5" alt="" />
          ATHENAS
        </p>
        {done ? (
          <>
            <h1 className="text-2xl font-bold text-neutral-900">{t('password.resetDone')}</h1>
            <p className="text-neutral-600 mt-2">{t('password.redirecting')}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">{t('password.resetTitle')}</h1>
            <p className="text-neutral-600 text-sm mb-6">{t('password.resetDesc')}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="alert-error">{error}</p>}
              <div>
                <label className="block text-sm font-bold mb-1">{t('password.new')}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-athenas !rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">{t('password.confirmFull')}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-athenas !rounded-xl"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
                {loading ? t('password.saving') : t('password.saveNew')}
              </button>
            </form>
          </>
        )}
        <Link to="/login" className="link-athenas block text-center text-sm mt-6">
          {t('nav.login')}
        </Link>
      </div>
    </div>
  )
}
