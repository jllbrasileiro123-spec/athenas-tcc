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
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">{t('password.changeTitle')}</h1>
      <p className="text-slate-600 text-sm mb-6">
        {t('password.account')} <strong>{user?.email}</strong>
      </p>

      {success ? (
        <p className="text-green-700 bg-green-50 border border-green-200 p-4 rounded text-sm">
          {t('password.success')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white border p-6 rounded-lg">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-bold mb-1">{t('password.new')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-brand outline-none"
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
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-brand outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand text-white font-semibold rounded hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? t('password.saving') : t('password.update')}
          </button>
        </form>
      )}

      <Link to="/explorar" className="inline-block mt-6 text-sm text-brand hover:underline">
        ← {t('common.back')}
      </Link>
    </div>
  )
}
