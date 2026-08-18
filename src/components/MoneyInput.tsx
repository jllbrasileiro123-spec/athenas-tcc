import { centsFromMaskedInput, formatBRLNumber } from '../lib/money'

export function MoneyInput({
  cents,
  onCentsChange,
  id,
}: {
  cents: number
  onCentsChange: (cents: number) => void
  id?: string
}) {
  return (
    <div className="flex items-center rounded-xl border border-neutral-300 bg-white focus-within:border-brand-gold focus-within:ring-1 focus-within:ring-brand-gold">
      <span className="pl-4 text-sm font-bold text-neutral-500 select-none">R$</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatBRLNumber(cents)}
        onChange={(e) => onCentsChange(centsFromMaskedInput(e.target.value))}
        className="flex-1 min-w-0 bg-transparent px-3 py-3 text-sm text-neutral-900 outline-none tabular-nums"
      />
    </div>
  )
}
