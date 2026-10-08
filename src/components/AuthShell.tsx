import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { BrandMark } from './BrandMark'

/**
 * Moldura das telas de acesso (Entrar, Cadastrar, Esqueci a senha, Nova senha):
 * mesmo fundo, mesmo cartão de 920 px com painel preto à esquerda e link de voltar.
 */
export function AuthShell({
  panelTitle,
  panelDesc,
  title,
  subtitle,
  back = { to: '/', label: undefined },
  notice,
  children,
}: {
  panelTitle: string
  panelDesc: string
  title: string
  subtitle?: string
  back?: { to: string; label?: string }
  /** Aviso acima do cartão (ex.: Supabase não configurado) */
  notice?: ReactNode
  children: ReactNode
}) {
  const { t } = useLanguage()

  return (
    <div className="min-h-dvh bg-brand-cream flex flex-col items-center justify-center p-4 gap-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      {notice}
      <div className="w-full max-w-[920px]">
        <Link
          to={back.to}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 -ml-3 text-sm font-semibold text-neutral-600 transition-colors hover:bg-brand-gold-soft/60 hover:text-neutral-900"
        >
          <span aria-hidden>←</span> {back.label ?? t('auth.backHome')}
        </Link>
      </div>
      <div className="w-full max-w-[920px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row md:min-h-[700px] border border-brand-gold/20">
        <div className="bg-neutral-950 text-white p-6 sm:p-10 md:p-12 flex flex-col justify-between md:w-[42%] border-r border-brand-gold/20">
          <Link to="/" className="block w-fit" aria-label={t('auth.backHome')}>
            <BrandMark className="h-12 sm:h-14 w-auto max-w-[11rem]" alt="ATHENAS" />
            <p className="mt-3 text-sm font-semibold tracking-[0.25em] uppercase text-brand-gold">ATHENAS</p>
          </Link>
          <div className="mt-6 md:mt-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">{panelTitle}</h1>
            <p className="text-neutral-400 mt-3 md:mt-4 text-sm leading-relaxed">{panelDesc}</p>
          </div>
        </div>

        <div className="bg-brand-cream/40 p-6 sm:p-10 md:p-12 flex flex-col justify-center md:w-[58%]">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">{title}</h2>
            {subtitle && <p className="text-neutral-500 text-sm mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

/** Campo em pílula com ícone, igual ao do login. */
export function AuthField({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-neutral-300 rounded-full px-4 py-3 focus-within:border-brand-gold focus-within:ring-1 focus-within:ring-brand-gold transition-colors">
      {icon}
      {children}
    </div>
  )
}

export const authInputClass =
  'flex-1 min-w-0 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-400 text-base'

export function MailIcon() {
  return (
    <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

export function LockIcon() {
  return (
    <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}
