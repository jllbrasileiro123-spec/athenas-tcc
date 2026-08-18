import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandSplash } from './BrandSplash'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, initializing } = useAuth()
  const { t } = useLanguage()

  if (initializing) {
    return <BrandSplash />
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-neutral-600">{t('admin.forbidden')}</p>
        <Link to="/explorar" className="link-athenas mt-4 inline-block">
          {t('instructor.backHome')}
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
