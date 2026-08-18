import { useMemo, type CSSProperties } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { FREEZE_COST, type GamificationStatus } from '../lib/gamification'

type StreakPopupProps = {
  status: GamificationStatus
  buying: boolean
  shopError: string | null
  onBuy: () => void
}

const FIRE = '#E24A1A'
const GOLD = '#C9A227'
const INK = '#0A0A0A'

export function StreakPopup({ status, buying, shopError, onBuy }: StreakPopupProps) {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] max-h-[min(85dvh,640px)] overflow-y-auto rounded-t-3xl border-2 border-neutral-900 bg-brand-cream shadow-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-[min(320px,calc(100vw-1.5rem))] md:max-h-none md:rounded-2xl md:pb-4">
      <div className="md:hidden flex justify-center pb-2">
        <span className="h-1 w-10 rounded-full bg-neutral-400" />
      </div>

      <p className="text-xl font-extrabold text-neutral-900 leading-tight">
        {t('streak.days', { n: String(status.current_streak) })}
      </p>
      <p className="text-sm font-semibold text-neutral-800 mt-1">
        {t('streak.record', { n: String(status.longest_streak) })}
      </p>
      <p className="mt-2 text-sm font-bold text-neutral-900">
        {t('streak.xp', { n: String(status.total_xp) })}
        <span className="mx-1.5 text-neutral-400">·</span>
        <span style={{ color: GOLD }}>{t('streak.coins', { n: String(status.coin_balance) })}</span>
      </p>

      <StreakCalendar dates={status.activity_dates} today={status.today} />

      <div className="mt-4 overflow-hidden rounded-xl border-2 border-neutral-950 bg-white">
        <div className="bg-neutral-950 px-3 py-2.5">
          <p className="text-sm font-extrabold text-brand-gold">{t('streak.freezeTitle')}</p>
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-neutral-800 leading-snug">{t('streak.freezeDesc')}</p>
          <p className="text-sm font-bold text-neutral-900 mt-2">
            {t('streak.freezeOwned', { n: String(status.freeze_count) })}
          </p>
          <button
            type="button"
            disabled={buying}
            onClick={onBuy}
            className="btn-primary w-full mt-3 !py-2.5 text-xs"
          >
            {buying ? '...' : t('streak.buyFreeze', { cost: String(FREEZE_COST) })}
          </button>
          {shopError && (
            <p className="mt-2 text-xs font-semibold text-red-700" role="alert">
              {shopError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StreakCalendar({ dates, today }: { dates: string[]; today: string }) {
  const { t, language } = useLanguage()
  const todayIso = validISODate(today) ?? localISODate()
  const done = useMemo(() => new Set(dates.map((d) => d.slice(0, 10))), [dates])
  const cursor = parseISODate(todayIso)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = cursor.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  const weekdays =
    language === 'en'
      ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      : ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-neutral-800 mb-3 capitalize">
        {monthLabel}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((d, i) => (
          <span key={`${d}-${i}`} className="text-[10px] font-extrabold text-neutral-700">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />
          const iso = toISO(year, month, day)
          const active = done.has(iso)
          const isToday = iso === todayIso
          const isFuture = iso > todayIso
          return (
            <span
              key={iso}
              title={active ? t('streak.dayDone') : undefined}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold mx-auto"
              style={dayStyle({ active, isToday, isFuture })}
            >
              {day}
            </span>
          )
        })}
      </div>
      <ul className="mt-3 space-y-1 text-[11px] font-semibold text-neutral-800">
        <li className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: GOLD }} />
          {t('streak.legendDone')}
        </li>
        <li className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full"
            style={{ border: `2px solid ${INK}`, background: 'white' }}
          />
          {t('streak.legendToday')}
        </li>
        <li className="flex items-center gap-2">
          <span className="text-neutral-400">19</span>
          {t('streak.legendFuture')}
        </li>
      </ul>
    </div>
  )
}

function dayStyle(opts: { active: boolean; isToday: boolean; isFuture: boolean }): CSSProperties {
  const { active, isToday, isFuture } = opts
  if (active && isToday) {
    return {
      background: FIRE,
      color: '#fff',
      boxShadow: `0 0 0 2px ${INK}`,
    }
  }
  if (active) {
    return { background: GOLD, color: INK }
  }
  if (isToday) {
    return {
      background: 'transparent',
      color: INK,
      boxShadow: `inset 0 0 0 2px ${INK}`,
    }
  }
  if (isFuture) {
    return { background: 'transparent', color: '#D4D4D4', fontWeight: 500 }
  }
  return { background: '#F3F3F3', color: '#525252', fontWeight: 600 }
}

function validISODate(value: string) {
  const iso = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null
}

function localISODate() {
  const n = new Date()
  return toISO(n.getFullYear(), n.getMonth(), n.getDate())
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toISO(year: number, monthIndex: number, day: number) {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}
