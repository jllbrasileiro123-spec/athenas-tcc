import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandMark } from '../components/BrandMark'
import type { InstructorApplication } from '../types/database'

export function BecomeInstructor() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const [expertise, setExpertise] = useState('')
  const [bio, setBio] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [application, setApplication] = useState<InstructorApplication | null>(null)

  const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin'

  useEffect(() => {
    if (!user || isInstructor) {
      setLoading(false)
      return
    }
    void (async () => {
      const { data } = await supabase
        .from('instructor_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setApplication((data as InstructorApplication | null) ?? null)
      setLoading(false)
    })()
  }, [user, isInstructor])

  if (isInstructor) {
    return <Navigate to="/instrutor" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('instructor_applications')
      .insert({
        user_id: user.id,
        expertise: expertise.trim(),
        bio: bio.trim(),
        portfolio_url: portfolio.trim() || null,
        status: 'pending',
      })
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setApplication(data as InstructorApplication)
  }

  const status = application?.status

  return (
    <div className="page-shell">
      <div className="max-w-xl mx-auto px-4 py-10">
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold mb-3">
          <BrandMark framed className="h-5 w-5" alt="" />
          ATHENAS
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{t('instructorApply.title')}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t('instructorApply.desc')}</p>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="spinner-athenas" />
          </div>
        ) : status === 'pending' ? (
          <div className="mt-8 alert-brand space-y-2">
            <p className="font-bold">{t('instructorApply.statusPending')}</p>
            <p className="text-sm text-neutral-700">{t('instructorApply.statusPendingHint')}</p>
            <span className="inline-flex text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
              {t('instructorApply.badgePending')}
            </span>
          </div>
        ) : status === 'approved' ? (
          <div className="mt-8 alert-brand space-y-3">
            <p className="font-bold">{t('instructorApply.statusApproved')}</p>
            <Link to="/instrutor" className="btn-primary inline-flex">
              {t('instructorApply.goTeach')}
            </Link>
          </div>
        ) : status === 'rejected' ? (
          <div className="mt-8 space-y-4">
            <div className="alert-error">
              <p className="font-bold">{t('instructorApply.statusRejected')}</p>
              {application?.admin_note && (
                <p className="mt-1 text-sm">{application.admin_note}</p>
              )}
            </div>
            <p className="text-sm text-neutral-600">{t('instructorApply.reapplyHint')}</p>
            <ApplyForm
              expertise={expertise}
              bio={bio}
              portfolio={portfolio}
              setExpertise={setExpertise}
              setBio={setBio}
              setPortfolio={setPortfolio}
              error={error}
              saving={saving}
              onSubmit={handleSubmit}
            />
          </div>
        ) : (
          <div className="mt-8">
            <ApplyForm
              expertise={expertise}
              bio={bio}
              portfolio={portfolio}
              setExpertise={setExpertise}
              setBio={setBio}
              setPortfolio={setPortfolio}
              error={error}
              saving={saving}
              onSubmit={handleSubmit}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ApplyForm({
  expertise,
  bio,
  portfolio,
  setExpertise,
  setBio,
  setPortfolio,
  error,
  saving,
  onSubmit,
}: {
  expertise: string
  bio: string
  portfolio: string
  setExpertise: (v: string) => void
  setBio: (v: string) => void
  setPortfolio: (v: string) => void
  error: string | null
  saving: boolean
  onSubmit: (e: FormEvent) => void
}) {
  const { t } = useLanguage()
  return (
    <form onSubmit={onSubmit} className="card-athenas p-6 space-y-4">
      {error && <p className="alert-error">{error}</p>}
      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1">{t('instructorApply.expertise')}</label>
        <input
          required
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
          placeholder={t('instructorApply.expertisePh')}
          className="input-athenas !rounded-xl"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1">{t('instructorApply.bio')}</label>
        <textarea
          required
          rows={5}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t('instructorApply.bioPh')}
          className="input-athenas !rounded-xl min-h-[120px]"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-neutral-700 mb-1">{t('instructorApply.portfolio')}</label>
        <input
          type="url"
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
          placeholder={t('instructorApply.portfolioPh')}
          className="input-athenas !rounded-xl"
        />
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full !py-3">
        {saving ? '...' : t('instructorApply.submit')}
      </button>
    </form>
  )
}
