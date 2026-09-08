import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

type PlacementPopupProps = {
  courseId: string
  /** Quantos módulos existem, para o texto explicar o que pode ser pulado */
  moduleCount: number
  onDismiss: () => void
}

/**
 * Popup de desbloqueio por nivelamento: aparece ao entrar na formação
 * (Atividade 5). Quem acerta as perguntas de um módulo já começa nele.
 */
export function PlacementPopup({ courseId, moduleCount, onDismiss }: PlacementPopupProps) {
  const { t } = useLanguage()
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  function dismiss() {
    setClosing(true)
    onDismiss()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="placement-popup-title"
    >
      <div
        className={`celebration-pop w-full max-w-md rounded-3xl border border-brand-gold/40 bg-brand-cream p-7 shadow-2xl ${
          closing ? 'opacity-0' : ''
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
          {t('placement.popupKicker')}
        </p>
        <h2 id="placement-popup-title" className="mt-2 text-xl font-bold text-neutral-900">
          {t('placement.popupTitle')}
        </h2>
        <p className="mt-3 text-sm text-neutral-700 leading-relaxed">
          {moduleCount > 0
            ? t('placement.popupBodyModules', { count: String(moduleCount) })
            : t('placement.popupBody')}
        </p>

        <ul className="mt-4 space-y-1.5 text-sm text-neutral-600">
          <li>· {t('placement.popupRule1')}</li>
          <li>· {t('placement.popupRule2')}</li>
        </ul>

        <div className="mt-6 space-y-2">
          <Link
            to={`/nivelamento/${courseId}`}
            onClick={dismiss}
            className="btn-primary w-full !py-3 inline-flex justify-center"
          >
            {t('placement.popupTakeTest')}
          </Link>
          <button type="button" onClick={dismiss} className="btn-secondary w-full !py-2.5">
            {t('placement.popupStartFirst')}
          </button>
        </div>
      </div>
    </div>
  )
}
