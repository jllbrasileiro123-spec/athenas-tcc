import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

export function InstructorRoute({ children }: { children: React.ReactNode }) {
  const { profile, initializing } = useAuth()
  const { t } = useLanguage()

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin" />
      </div>
    )
  }

  if (profile?.role !== 'instructor') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">{t('instructor.notInstructor')}</p>
        <Link to="/explorar" className="text-brand mt-4 inline-block hover:underline">
          {t('instructor.backHome')}
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
