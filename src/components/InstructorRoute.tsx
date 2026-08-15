import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandSplash } from './BrandSplash'

export function InstructorRoute({ children }: { children: React.ReactNode }) {
  const { profile, initializing } = useAuth()
  const { t } = useLanguage()

  if (initializing) {
    return <BrandSplash />
  }

  const canTeach = profile?.role === 'instructor' || profile?.role === 'admin'

  if (!canTeach) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-neutral-600">{t('instructor.notInstructor')}</p>
        <Link to="/tornar-se-instrutor" className="btn-primary inline-flex">
          {t('menu.becomeInstructor')}
        </Link>
        <div>
          <Link to="/explorar" className="link-athenas text-sm">
            {t('instructor.backHome')}
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
