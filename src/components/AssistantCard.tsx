import { useLanguage } from '../contexts/LanguageContext'
import { openAthenaAssistant } from '../lib/athenaDock'

function ChatIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z" />
      <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" />
    </svg>
  )
}

/** "Tire suas dúvidas com nosso assistente": abre o chat da Athena. */
export function AssistantCard({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage()

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-neutral-950 px-4 py-3.5">
        <ChatIcon className="h-5 w-5 shrink-0 text-brand-gold-light" />
        <p className="flex-1 text-[13px] font-bold leading-snug text-brand-cream">
          {t('assistant.cardTitle')}
        </p>
        <button
          type="button"
          onClick={openAthenaAssistant}
          className="h-9 shrink-0 rounded-xl bg-brand-gold px-3 text-xs font-extrabold text-neutral-950 hover:brightness-105"
        >
          {t('assistant.cardCtaShort')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-[20px] bg-neutral-950 p-6 text-brand-cream">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/60 bg-neutral-900 text-brand-gold-light">
          <ChatIcon />
        </span>
        <p className="font-display text-2xl font-bold leading-tight">{t('assistant.cardTitle')}</p>
      </div>
      <p className="text-sm leading-relaxed text-neutral-300">{t('assistant.cardBody')}</p>
      <button
        type="button"
        onClick={openAthenaAssistant}
        className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-gold text-sm font-extrabold text-neutral-950 hover:brightness-105"
      >
        {t('assistant.cardCta')}
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}
