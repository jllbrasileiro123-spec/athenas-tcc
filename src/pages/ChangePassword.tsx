import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

export function ChangePassword() {
  const { user, updatePassword } = useAuth()
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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
    setSuccess(true)
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="page-shell">
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">{t('password.changeTitle')}</h1>
        <p className="text-neutral-600 text-sm mb-6">
          {t('password.account')} <strong>{user?.email}</strong>
        </p>

        {success ? (
          <p className="alert-brand">{t('password.success')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-brand-gold/20 p-6 rounded-2xl">
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
              <label className="block text-sm font-bold mb-1">{t('password.confirm')}</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input-athenas !rounded-xl"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
              {loading ? t('password.saving') : t('password.update')}
            </button>
          </form>
        )}

        <Link to="/explorar" className="link-athenas inline-block mt-6 text-sm">
          ← {t('common.back')}
        </Link>
      </div>
    </div>
  )
}
