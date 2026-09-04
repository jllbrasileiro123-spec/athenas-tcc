import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AthenaAssistant } from './AthenaAssistant'
import { AthenaMark } from './AthenaMark'
import { useLanguage } from '../contexts/LanguageContext'

/** Botão flutuante + chat de dúvidas em todas as páginas (exceto o hub demo). */
export function FloatingAthenaDock() {
  const { t } = useLanguage()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const hideOn = location.pathname.startsWith('/demo-video')

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  if (hideOn) return null

  return (
    <div className="fixed z-[60] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 md:bottom-6 md:right-6 flex flex-col items-end gap-3">
      {open && (
        <div>
          <AthenaAssistant dock onClose={() => setOpen(false)} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border-2 border-brand-gold bg-neutral-950 pl-1.5 pr-4 py-1.5 text-white shadow-xl hover:brightness-110 touch-manipulation"
        aria-expanded={open}
        aria-label={open ? t('assistant.close') : t('assistant.open')}
      >
        <AthenaMark framed variant="mensagem" alt="" />
        <span className="text-xs font-bold text-brand-gold whitespace-nowrap">
          {open ? t('assistant.close') : t('assistant.title')}
        </span>
      </button>
    </div>
  )
}
