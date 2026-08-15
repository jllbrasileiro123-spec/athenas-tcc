import { AthenaMark } from './AthenaMark'

/** Splash / loading com a ilustração da Athena e fade-in. */
export function BrandSplash({ message, fullScreen = false }: { message?: string; fullScreen?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-brand-cream px-4 ${
        fullScreen ? 'min-h-screen' : 'min-h-[40vh]'
      }`}
    >
      <div className="animate-[athenas-fade-in_0.7s_ease-out_both] text-center">
        <AthenaMark framed variant="header" className="mx-auto h-36 w-36 sm:h-40 sm:w-40" alt="" />
        <div className="spinner-athenas mx-auto mt-6" />
        {message ? <p className="mt-4 text-sm text-neutral-600">{message}</p> : null}
      </div>
    </div>
  )
}
