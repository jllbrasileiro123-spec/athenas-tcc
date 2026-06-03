import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { UserAvatarMenu } from './UserAvatarMenu'

export function Layout() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link to="/explorar" className="text-brand font-bold text-lg shrink-0 tracking-widest uppercase">
            ATHENAS
          </Link>

          <span className="hidden md:inline text-xs text-neutral-500 border-l border-neutral-300 pl-4">
            {t('nav.aiFormations')}
          </span>

          <nav className="flex-1 flex items-center gap-1 text-sm font-medium">
            <Link
              to="/explorar"
              className="px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
            >
              {t('nav.explore')}
            </Link>
            {user && (
              <>
                <Link
                  to="/meus-cursos?view=learning"
                  className="px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
                >
                  {t('nav.myLearning')}
                </Link>
                <Link
                  to="/meus-cursos?view=teaching"
                  className="px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
                >
                  {t('nav.myLessons')}
                </Link>
                {(profile?.role === 'instructor' || profile?.role === 'admin') && (
                  <Link
                    to="/instrutor"
                    className="px-3 py-2 rounded-md text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
                  >
                    {t('nav.teach')}
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <UserAvatarMenu />
            ) : (
              <>
                <Link
                  to="/"
                  className="text-sm font-semibold border border-neutral-900 px-3 py-1.5 hover:bg-neutral-50"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/cadastro"
                  className="text-sm font-semibold bg-neutral-900 text-white px-3 py-1.5 hover:bg-neutral-800"
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-neutral-950 text-neutral-400 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p className="font-semibold text-white mb-1 tracking-widest uppercase">ATHENAS</p>
          <p>{t('footer.tagline')}</p>
        </div>
      </footer>
    </div>
  )
}
