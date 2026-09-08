import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

type PlacementPopupProps = {
  courseId: string
  /** Quantos módulos existem, para o texto explicar o que pode ser pulado */
  moduleCount: number
  /** Usuário logado: pode fazer o teste. Sem login, só pede autenticação. */
  isLoggedIn: boolean
  busy?: boolean
  onTakeTest: () => void
  onStartFromBeginning: () => void
}

/**
 * Gate obrigatório ao abrir a formação: define se o aluno começa do
 * Módulo 1 ou pode avançar pelo teste de nivelamento.
 */
export function PlacementPopup({
  courseId,
  moduleCount,
  isLoggedIn,
  busy = false,
  onTakeTest,
  onStartFromBeginning,
}: PlacementPopupProps) {
  const { t } = useLanguage()

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="placement-popup-title"
    >
      <div className="celebration-pop w-full max-w-md rounded-3xl border border-brand-gold/40 bg-brand-cream p-7 shadow-2xl">
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
          <li>· {t('placement.popupRule3')}</li>
        </ul>

        <div className="mt-6 space-y-2">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onTakeTest}
                className="btn-primary w-full !py-3 inline-flex justify-center disabled:opacity-60"
              >
                {busy ? t('common.loading') : t('placement.popupTakeTest')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onStartFromBeginning}
                className="btn-secondary w-full !py-2.5 disabled:opacity-60"
              >
                {t('placement.popupStartFirst')}
              </button>
            </>
          ) : (
            <Link
              to="/"
              state={{ from: { pathname: `/curso/${courseId}` } }}
              className="btn-primary w-full !py-3 inline-flex justify-center"
            >
              {t('placement.popupSignIn')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
