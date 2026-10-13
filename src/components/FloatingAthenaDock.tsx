import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AthenaAssistant } from './AthenaAssistant'
import { AthenaMark } from './AthenaMark'
import { useLanguage } from '../contexts/LanguageContext'
import { OPEN_ATHENA_EVENT } from '../lib/athenaDock'

/**
 * Botão flutuante + chat de dúvidas em todas as páginas (exceto o hub demo).
 * Celular: bolinha com a Athena; computador: botão "Tire suas dúvidas".
 * O chat abre como cartão no canto, logo acima de onde fica o botão.
 */
export function FloatingAthenaDock() {
  const { t } = useLanguage()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const hideOn = location.pathname.startsWith('/demo-video')

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_ATHENA_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_ATHENA_EVENT, onOpen)
  }, [])

  if (hideOn) return null

  if (open) {
    return (
      <div className="fixed z-[61] inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-6 md:right-6">
        <AthenaAssistant dock onClose={() => setOpen(false)} />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="fixed z-[60] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 md:bottom-6 md:right-6 flex items-center gap-2 rounded-full border-2 border-brand-gold bg-neutral-950 p-1 md:pr-4 text-white shadow-xl hover:brightness-110 touch-manipulation"
      aria-expanded={false}
      aria-label={t('assistant.title')}
    >
      <AthenaMark framed variant="mensagem" alt="" />
      <span className="hidden md:inline text-sm font-bold text-brand-gold whitespace-nowrap">
        {t('assistant.title')}
      </span>
    </button>
  )
}
