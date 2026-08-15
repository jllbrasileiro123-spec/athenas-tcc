/** Número com DDI + DDD, só dígitos. Ex.: 5511999999999 */
export function getSupportWhatsAppNumber(): string {
  const raw = import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''
  return raw.replace(/\D/g, '')
}

export function buildWhatsAppUrl(text: string): string | null {
  const number = getSupportWhatsAppNumber()
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

export type SupportWhatsAppLabels = {
  header: string
  body: string
  labelName: string
  labelTopic: string
  labelEmail: string
  labelPhone: string
  topicOther: string
}

/** Mensagem curta para atalho "Outros" → WhatsApp */
export function buildOtherSupportWhatsAppUrl(
  labels: SupportWhatsAppLabels,
  ctx: { name?: string; email?: string; phone?: string }
): string | null {
  const lines = [
    labels.header,
    labels.body,
    ctx.name ? `${labels.labelName}: ${ctx.name}` : '',
    `${labels.labelTopic}: ${labels.topicOther}`,
    ctx.email ? `${labels.labelEmail}: ${ctx.email}` : '',
    ctx.phone ? `${labels.labelPhone}: ${ctx.phone}` : '',
  ].filter(Boolean)

  return buildWhatsAppUrl(lines.join('\n'))
}
