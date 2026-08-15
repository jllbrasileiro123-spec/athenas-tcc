import { BrandMark } from './BrandMark'

export function InstructorBadge({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-950 text-brand-gold ${className}`}
    >
      <BrandMark className="h-3.5 w-3.5" alt="" />
      {label ?? 'Instrutor'}
    </span>
  )
}
