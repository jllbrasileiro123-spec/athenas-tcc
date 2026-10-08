/**
 * Gera a imagem (PNG) do certificado no navegador, via <canvas>.
 * Tamanho A4 paisagem (2000 × 1414), boa para imprimir e postar.
 */

export type CertificateImageData = {
  holderName: string
  courseTitle: string
  totalLessons: number
  issuedDate: string
  code: string
  verifyUrl: string
  labels: {
    kicker: string
    certifyThat: string
    completedThe: string
    lessonsTotal: string
    issuedOn: string
    codeLabel: string
    verifyAt: string
  }
}

const W = 2000
const H = 1414
const GOLD = '#c9a227'
const GOLD_SOFT = '#f5e6c8'
const CREAM = '#faf6ee'
const INK = '#171717'
const MUTED = '#525252'
const SERIF = 'Georgia, "Times New Roman", serif'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** Nome completo = pelo menos duas palavras (nome + sobrenome). */
export function looksLikeFullName(name: string | null | undefined): boolean {
  if (!name) return false
  const parts = name.trim().split(/\s+/).filter((p) => p.length >= 2)
  return parts.length >= 2 && !name.includes('@')
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing ainda não existe em todo navegador; sem ele o texto só fica mais junto
  if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = `${px}px`
}

/** Diminui a fonte até o texto caber na largura. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
  min: number,
  font: (size: number) => string
) {
  let size = start
  ctx.font = font(size)
  while (size > min && ctx.measureText(text).width > maxWidth) {
    size -= 2
    ctx.font = font(size)
  }
  return size
}

/** Quebra o texto em até `maxLines` linhas. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, '')}…`
    return kept
  }
  return lines
}

export async function renderCertificateImage(data: CertificateImageData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível neste navegador')

  const logo = await loadImage(`${import.meta.env.BASE_URL}brand/logo-athena.png`)

  // Fundo e molduras
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = CREAM
  ctx.fillRect(40, 40, W - 80, H - 80)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 6
  ctx.strokeRect(70, 70, W - 140, H - 140)
  ctx.lineWidth = 2
  ctx.strokeRect(88, 88, W - 176, H - 176)

  // Cantos decorativos
  ctx.fillStyle = GOLD
  for (const [x, y] of [
    [88, 88],
    [W - 88, 88],
    [88, H - 88],
    [W - 88, H - 88],
  ]) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-14, -14, 28, 28)
    ctx.restore()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const cx = W / 2
  let y = 150

  if (logo) {
    const size = 170
    const ratio = logo.width / logo.height || 1
    const w = ratio >= 1 ? size : size * ratio
    const h = ratio >= 1 ? size / ratio : size
    ctx.drawImage(logo, cx - w / 2, y, w, h)
    y += h + 70
  } else {
    y += 120
  }

  // "CERTIFICADO DE CONCLUSÃO"
  ctx.fillStyle = GOLD
  ctx.font = `700 34px ${SANS}`
  setSpacing(ctx, 12)
  ctx.fillText(data.labels.kicker.toUpperCase(), cx, y)
  setSpacing(ctx, 0)

  y += 90
  ctx.fillStyle = MUTED
  ctx.font = `italic 38px ${SERIF}`
  ctx.fillText(data.labels.certifyThat, cx, y)

  // Nome completo
  y += 130
  ctx.fillStyle = INK
  fitFont(ctx, data.holderName, W - 420, 104, 56, (s) => `700 ${s}px ${SERIF}`)
  ctx.fillText(data.holderName, cx, y)

  // Linha dourada sob o nome
  y += 40
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - 520, y)
  ctx.lineTo(cx + 520, y)
  ctx.stroke()

  y += 80
  ctx.fillStyle = MUTED
  ctx.font = `38px ${SERIF}`
  ctx.fillText(data.labels.completedThe, cx, y)

  // Título do curso (até 2 linhas)
  y += 85
  ctx.fillStyle = INK
  ctx.font = `700 56px ${SERIF}`
  const titleLines = wrap(ctx, data.courseTitle, W - 480, 2)
  for (const line of titleLines) {
    ctx.fillText(line, cx, y)
    y += 70
  }

  y += 10
  ctx.fillStyle = MUTED
  ctx.font = `32px ${SANS}`
  ctx.fillText(data.labels.lessonsTotal, cx, y)

  // Rodapé: data à esquerda, código à direita
  const footY = H - 250
  ctx.textAlign = 'center'
  for (const [x, label, value, mono] of [
    [520, data.labels.issuedOn, data.issuedDate, false],
    [W - 520, data.labels.codeLabel, data.code, true],
  ] as const) {
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x - 260, footY)
    ctx.lineTo(x + 260, footY)
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.font = mono ? `700 42px "Courier New", monospace` : `700 38px ${SERIF}`
    setSpacing(ctx, mono ? 4 : 0)
    ctx.fillText(value, x, footY - 22)
    setSpacing(ctx, 3)
    ctx.fillStyle = MUTED
    ctx.font = `600 22px ${SANS}`
    ctx.fillText(label.toUpperCase(), x, footY + 42)
    setSpacing(ctx, 0)
  }

  // Selo central
  ctx.beginPath()
  ctx.arc(cx, footY - 30, 78, 0, Math.PI * 2)
  ctx.fillStyle = INK
  ctx.fill()
  ctx.lineWidth = 5
  ctx.strokeStyle = GOLD
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, footY - 30, 64, 0, Math.PI * 2)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = GOLD_SOFT
  ctx.stroke()
  ctx.fillStyle = GOLD
  ctx.font = `700 19px ${SERIF}`
  setSpacing(ctx, 2)
  ctx.fillText('ATHENAS', cx, footY - 23)
  setSpacing(ctx, 0)

  ctx.fillStyle = MUTED
  ctx.font = `24px ${SANS}`
  ctx.fillText(`${data.labels.verifyAt} ${data.verifyUrl}`, cx, H - 130)

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar a imagem'))), 'image/png')
  })
}

export function certificateFileName(holderName: string, code: string) {
  const slug = holderName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `certificado-athenas-${slug || 'aluno'}-${code}.png`
}
