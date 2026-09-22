import { Link } from 'react-router-dom'
import type { ModuleMaterial } from '../lib/courseModules'

function isAppRoute(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('/demo') && !url.includes('.')
}

function isDownloadableFile(url: string): boolean {
  return (
    /\.(pdf|docx?|pptx?|xlsx?|zip|mp3|m4a|mp4|webm)(\?|$)/i.test(url) ||
    url.includes('/course-materials/') ||
    url.includes('/course-videos/') ||
    url.startsWith('/demo/')
  )
}

function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url
    const last = path.split('/').pop() || fallback
    return decodeURIComponent(last.split('?')[0]) || fallback
  } catch {
    return fallback
  }
}

/**
 * Material de apoio: baixa o arquivo e permanece no curso.
 * Links internos (ex.: /termos) continuam navegando no app.
 */
export function MaterialLink({
  material,
  className = 'link-athenas',
}: {
  material: Pick<ModuleMaterial, 'title' | 'url'>
  className?: string
}) {
  const { title, url } = material

  if (isAppRoute(url)) {
    return (
      <Link to={url} className={className}>
        {title}
      </Link>
    )
  }

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDownloadableFile(url)) return
    e.preventDefault()
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = fileNameFromUrl(url, title)
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      // CORS ou falha: abre em aba nova (não troca a página do curso)
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <a
      href={url}
      className={className}
      onClick={(e) => void handleClick(e)}
      download={isDownloadableFile(url) ? fileNameFromUrl(url, title) : undefined}
    >
      {title}
    </a>
  )
}
