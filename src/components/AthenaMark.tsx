import './AthenaAvatar.css'

type MarkProps = {
  className?: string
  /** Disco/quadro com fundo preto (bom em qualquer superfície) */
  framed?: boolean
  /** Header = quadrado arredondado; mensagem = círculo */
  variant?: 'header' | 'mensagem'
  alt?: string
}

/**
 * Avatar da assistente Athena — busto em linha dourada.
 * Em 40px os detalhes ficam miúdos; prefira 56px+ no header do chat.
 */
export function AthenaMark({
  className = 'h-10 w-10',
  framed = false,
  variant = 'header',
  alt = 'Athena',
}: MarkProps) {
  const src =
    variant === 'mensagem' ? '/brand/avatar-athena.png' : '/brand/avatar-athena-header.png'

  const img = (
    <img
      src={framed ? src : '/brand/avatar-athena-header.png'}
      alt={alt}
      className={framed ? undefined : `object-contain ${className}`}
      draggable={false}
    />
  )

  if (!framed) return img

  const frameClass = variant === 'mensagem' ? 'athena-avatar-mensagem' : 'athena-avatar-header'

  return (
    <span className={`${frameClass} ${className}`} aria-hidden={alt === '' ? true : undefined}>
      {img}
    </span>
  )
}
