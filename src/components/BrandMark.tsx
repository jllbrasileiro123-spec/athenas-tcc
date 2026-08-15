type MarkProps = {
  className?: string
  /** Envolve em disco preto (bom em fundo claro; o PNG tem traço dourado) */
  framed?: boolean
  alt?: string
}

/** Logo institucional — templo geométrico (header, login, favicon, selo). */
export function BrandMark({ className = 'h-8 w-8', framed = false, alt = 'ATHENAS' }: MarkProps) {
  const img = (
    <img
      src="/brand/logo-templo.png"
      alt={alt}
      className={framed ? 'h-full w-full object-contain p-[12%]' : `object-contain ${className}`}
      draggable={false}
    />
  )

  if (!framed) return img

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-950 ring-1 ring-brand-gold/40 ${className}`}
      aria-hidden={alt === '' ? true : undefined}
    >
      {img}
    </span>
  )
}
