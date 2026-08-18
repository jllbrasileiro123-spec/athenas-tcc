import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

export function MobileTabBar() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const canTeach = profile?.role === 'instructor' || profile?.role === 'admin'
  const isAdmin = profile?.role === 'admin'

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-brand-gold/20 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label={t('nav.mobile')}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] h-14">
        <Tab to="/explorar" label={t('nav.exploreShort')} icon={<IconCompass />} />
        <Tab to="/meus-cursos" label={t('nav.learnShort')} icon={<IconBook />} />
        {canTeach && <Tab to="/instrutor" label={t('nav.teachShort')} icon={<IconTeach />} />}
        {isAdmin && <Tab to="/admin/moderacao" label={t('nav.adminShort')} icon={<IconShield />} />}
      </div>
    </nav>
  )
}

function Tab({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold tracking-wide ${
          isActive ? 'text-brand-gold' : 'text-neutral-500'
        }`
      }
    >
      {icon}
      <span className="leading-none">{label}</span>
    </NavLink>
  )
}

function IconCompass() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 9.5l-2.2 5.3L7 16.5l2.2-5.3L14.5 9.5z" />
    </svg>
  )
}

function IconBook() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 5.25A2.25 2.25 0 016.75 3H12v16.5H6.75A2.25 2.25 0 014.5 17.25V5.25zM19.5 5.25A2.25 2.25 0 0017.25 3H12v16.5h5.25a2.25 2.25 0 002.25-2.25V5.25z"
      />
    </svg>
  )
}

function IconTeach() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15M12 4.5h7.5V12M9 15l-4.5 4.5H12" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7.5 3v5.25c0 4.556-3.086 8.606-7.5 9.75-4.414-1.144-7.5-5.194-7.5-9.75V6L12 3z"
      />
    </svg>
  )
}
