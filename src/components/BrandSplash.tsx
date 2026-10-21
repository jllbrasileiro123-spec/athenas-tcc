/**
 * Carregamento discreto: só uma linha dourada correndo no topo da tela
 * (sem a ilustração da Athena nem o spinner no meio da página).
 */
export function BrandSplash({ message, fullScreen = false }: { message?: string; fullScreen?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center bg-brand-cream px-4 ${fullScreen ? 'min-h-dvh' : 'min-h-[40vh]'}`}
      role="status"
      aria-live="polite"
      aria-label={message ?? 'Carregando'}
    >
      <div className="loading-bar fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden" aria-hidden />
      {message ? <p className="text-sm text-neutral-500">{message}</p> : null}
    </div>
  )
}
