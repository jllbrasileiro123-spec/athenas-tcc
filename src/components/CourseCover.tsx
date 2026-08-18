type CourseCoverProps = {
  title: string
  thumbnailUrl?: string | null
  className?: string
}

/** Capa do curso: foto enviada ou fallback bege/dourado (evita o retângulo preto vazio). */
export function CourseCover({ title, thumbnailUrl, className = '' }: CourseCoverProps) {
  const letter = title.trim().charAt(0).toUpperCase() || 'A'

  return (
    <div className={`relative overflow-hidden bg-brand-gold-soft ${className}`}>
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <span
            className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[12px] border-brand-gold/40"
            aria-hidden
          />
          <span
            className="absolute -left-10 -bottom-12 h-32 w-32 rotate-12 bg-brand-gold/25"
            aria-hidden
          />
          <span className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950 text-lg font-bold text-brand-gold">
              {letter}
            </span>
            <span className="mt-2 line-clamp-2 text-[11px] font-bold leading-tight text-neutral-900">
              {title}
            </span>
          </span>
        </>
      )}
    </div>
  )
}
