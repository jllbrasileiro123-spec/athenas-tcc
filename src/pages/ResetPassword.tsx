import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-slate-600">{t('password.openingLink')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {done ? (
          <>
            <h1 className="text-2xl font-bold text-green-700">{t('password.resetDone')}</h1>
            <p className="text-slate-600 mt-2">{t('password.redirecting')}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">{t('password.resetTitle')}</h1>
            <p className="text-slate-600 text-sm mb-6">{t('password.resetDesc')}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div>
                <label className="block text-sm font-bold mb-1">{t('password.new')}</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-900 rounded-sm focus:outline-none focus:border-brand"
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
                  className="w-full px-4 py-3 border-2 border-slate-900 rounded-sm focus:outline-none focus:border-brand"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-brand text-white font-bold hover:bg-brand-dark disabled:opacity-60"
              >
                {loading ? t('password.saving') : t('password.saveNew')}
              </button>
            </form>
          </>
        )}
        <Link to="/login" className="block text-center text-sm text-brand mt-6 hover:underline">
          {t('nav.login')}
        </Link>
      </div>
    </div>
  )
}
