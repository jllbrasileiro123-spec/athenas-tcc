import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../contexts/LanguageContext'

export function AuthCallback() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [status, setStatus] = useState(t('authCallback.working'))

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let subscription: { unsubscribe: () => void } | undefined

    async function finish() {
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const oauthError =
        params.get('error_description') ||
        params.get('error') ||
        hash.get('error_description') ||
        hash.get('error')

      if (oauthError) {
        const msg = decodeURIComponent(oauthError.replace(/\+/g, ' '))
        if (!cancelled) navigate(`/?oauth_error=${encodeURIComponent(msg)}`, { replace: true })
        return
      }

      const code = params.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          if (!cancelled) navigate(`/?oauth_error=${encodeURIComponent(error.message)}`, { replace: true })
          return
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        if (!cancelled) navigate(`/?oauth_error=${encodeURIComponent(sessionError.message)}`, { replace: true })
        return
      }

      if (session) {
        if (!cancelled) navigate('/explorar', { replace: true })
        return
      }

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, s) => {
        if (event === 'SIGNED_IN' && s && !cancelled) {
          navigate('/explorar', { replace: true })
        }
      })
      subscription = sub

      timeoutId = setTimeout(() => {
        if (!cancelled) {
          navigate(`/?oauth_error=${encodeURIComponent(t('authCallback.noSession'))}`, { replace: true })
        }
      }, 10000)
    }

    void finish()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
  }, [navigate, t])

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="h-10 w-10 mx-auto mb-4 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
        <p className="text-neutral-600 text-sm">{status}</p>
      </div>
    </div>
  )
}
