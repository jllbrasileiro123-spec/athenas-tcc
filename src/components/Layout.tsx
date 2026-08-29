import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandMark } from './BrandMark'
import { StreakWidget } from './StreakWidget'
import { UserAvatarMenu } from './UserAvatarMenu'
import { MobileTabBar } from './MobileTabBar'
import { buildWhatsAppUrl } from '../lib/supportWhatsApp'

export function Layout() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()

  const supportHref = buildWhatsAppUrl(`${t('support.whatsappHeader')}\n${t('footer.support')}`)

  const canTeach = profile?.role === 'instructor' || profile?.role === 'admin'
  const isAdmin = profile?.role === 'admin'
  const onMyCourses = location.pathname.startsWith('/meus-cursos')
  const onTeach = location.pathname.startsWith('/instrutor')
  const onAdmin = location.pathname.startsWith('/admin')

  function navClass(active: boolean) {
    return `shrink-0 whitespace-nowrap px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
      active
        ? 'bg-neutral-950 text-brand-gold'
        : 'text-neutral-700 hover:bg-brand-gold-soft hover:text-neutral-900'
    }`
  }

  return (
    <div className="min-h-dvh flex flex-col bg-brand-cream">
      <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur border-b border-brand-gold/20 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto h-14 md:h-16 px-3 sm:px-4 flex items-center gap-2 sm:gap-3">
          <Link
            to="/explorar"
            className="inline-flex items-center gap-2 text-neutral-950 font-bold text-base sm:text-lg shrink-0 tracking-widest uppercase"
          >
            <BrandMark framed className="h-8 w-8" alt="" />
            <span className="hidden sm:inline">ATHENAS</span>
          </Link>

          <nav className="hidden md:flex flex-1 min-w-0 items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <NavLink to="/explorar" className={({ isActive }) => navClass(isActive)} end={false}>
              {t('nav.explore')}
            </NavLink>
            {user && (
              <>
                <NavLink to="/meus-cursos" className={() => navClass(onMyCourses)}>
                  {t('nav.myLearning')}
                </NavLink>
                {canTeach && (
                  <NavLink to="/instrutor" className={() => navClass(onTeach)}>
                    {t('nav.teach')}
                  </NavLink>
                )}
                {isAdmin && (
                  <NavLink to="/admin/moderacao" className={() => navClass(onAdmin)}>
                    {t('menu.adminModeration')}
                  </NavLink>
                )}
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <StreakWidget />
                <UserAvatarMenu />
              </>
            ) : (
              <>
                <Link to="/" className="btn-secondary !px-3 !py-1.5 text-xs">
                  {t('nav.login')}
                </Link>
                <Link to="/cadastro" className="btn-primary !px-3 !py-1.5 text-xs">
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      <footer className="hidden md:block bg-neutral-950 text-neutral-400 mt-auto border-t border-brand-gold/20">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
            <div className="max-w-sm">
              <p className="inline-flex items-center gap-2.5 font-semibold text-brand-gold tracking-widest uppercase">
                <BrandMark className="h-9 w-auto max-w-[7rem]" alt="" />
                ATHENAS
              </p>
              <p className="mt-2 text-sm leading-relaxed">{t('footer.tagline')}</p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {supportHref ? (
                <a
                  href={supportHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-gold transition-colors"
                >
                  {t('footer.support')}
                </a>
              ) : (
                <span className="text-neutral-500">{t('footer.support')}</span>
              )}
              <Link to="/explorar" className="hover:text-brand-gold transition-colors">
                {t('nav.explore')}
              </Link>
              <Link to="/termos" className="hover:text-brand-gold transition-colors">
                {t('footer.terms')}
              </Link>
              <Link to="/privacidade" className="hover:text-brand-gold transition-colors">
                {t('footer.privacy')}
              </Link>
            </nav>
          </div>
          <p className="mt-8 pt-6 border-t border-white/10 text-xs text-neutral-500">
            {t('footer.copyright', { year: String(new Date().getFullYear()) })}
          </p>
        </div>
      </footer>

      <MobileTabBar />
    </div>
  )
}
