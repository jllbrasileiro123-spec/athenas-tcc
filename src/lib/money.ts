export const PRICE_MAX_REAIS = 50_000
const PRICE_MAX_CENTS = PRICE_MAX_REAIS * 100

export function centsFromMaskedInput(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const cents = Number.parseInt(digits || '0', 10)
  if (!Number.isFinite(cents)) return 0
  return Math.min(Math.max(cents, 0), PRICE_MAX_CENTS)
}

export function formatBRLNumber(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatBRL(cents: number) {
  return `R$ ${formatBRLNumber(cents)}`
}

export function reaisFromCents(cents: number) {
  return Math.round(cents) / 100
}
