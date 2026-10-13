import { useEffect, useMemo, useRef, useState } from 'react'
import { BrandMark } from './BrandMark'
import { useGamification } from '../contexts/GamificationContext'
import { useLanguage } from '../contexts/LanguageContext'
import { FREEZE_COST } from '../lib/gamification'

export function StreakWidget() {
  const { t } = useLanguage()
  const { status, unavailable, buyFreeze, ackBrokenStreak } = useGamification()
  const [open, setOpen] = useState(false)
  const [buying, setBuying] = useState(false)
  const [shopError, setShopError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const showBroken = status.broken_from > 1

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  if (unavailable) return null

  async function onBuy() {
    setBuying(true)
    setShopError(null)
    const result = await buyFreeze()
    setBuying(false)
    if (!result) {
      setShopError(t('streak.buyError'))
      return
    }
    if (!result.ok) setShopError(t('streak.notEnoughCoins'))
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 touch-manipulation"
          aria-expanded={open}
          aria-label={`${t('streak.aria')}. ${t('streak.coinsAria')}`}
        >
          <img src={`${import.meta.env.BASE_URL}icons/streak-flame.png`} alt="" className="h-5 w-5 object-contain" draggable={false} />
          <span className="text-sm font-bold text-brand-gold-soft tabular-nums">
            {status.current_streak}
          </span>
          <span className="mx-0.5 h-5 w-px bg-neutral-600" aria-hidden />
          <img src={`${import.meta.env.BASE_URL}icons/coin-a.png`} alt="" className="h-5 w-5 object-contain" draggable={false} />
          <span className="text-sm font-bold text-brand-gold-soft tabular-nums">
            {status.coin_balance}
          </span>
        </button>

        {open && (
          <>
            <div className="fixed right-3 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] md:absolute md:right-0 md:top-full md:mt-2 z-[90] w-[min(320px,calc(100vw-1.5rem))] max-h-[min(80dvh,560px)] overflow-y-auto rounded-2xl border border-brand-gold/30 bg-white shadow-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  {t('streak.days', { n: String(status.current_streak) })}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t('streak.record', { n: String(status.longest_streak) })}
                </p>
              </div>
              <div className="text-right text-xs font-semibold text-neutral-700">
                <p>{t('streak.xp', { n: String(status.total_xp) })}</p>
                <p className="text-brand-gold">{t('streak.coins', { n: String(status.coin_balance) })}</p>
              </div>
            </div>

            <StreakCalendar dates={status.activity_dates} today={status.today} />

            <div className="mt-4 rounded-xl border border-brand-gold/25 bg-brand-cream/80 p-3">
              <p className="text-sm font-bold text-neutral-900">{t('streak.freezeTitle')}</p>
              <p className="text-xs text-neutral-600 mt-1">{t('streak.freezeDesc')}</p>
              <p className="text-xs font-semibold text-neutral-700 mt-2">
                {t('streak.freezeOwned', { n: String(status.freeze_count) })}
              </p>
              <button
                type="button"
                disabled={buying}
                onClick={() => void onBuy()}
                className="btn-primary w-full mt-3 !py-2 text-xs"
              >
                {buying ? '...' : t('streak.buyFreeze', { cost: String(FREEZE_COST) })}
              </button>
              {shopError && (
                <p className="mt-2 text-xs text-red-700" role="alert">
                  {shopError}
                </p>
              )}
            </div>
            </div>
          </>
        )}
      </div>

      {showBroken && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-neutral-950/70 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-brand-gold/30 p-7 text-center shadow-xl">
            <BrandMark framed className="mx-auto h-16 w-16" alt="" />
            <p className="mt-4 text-lg font-bold text-neutral-900">
              {t('streak.brokenTitle', { n: String(status.broken_from) })}
            </p>
            <p className="mt-2 text-sm text-neutral-600">{t('streak.brokenHint')}</p>
            <button type="button" className="btn-primary w-full mt-6" onClick={() => void ackBrokenStreak()}>
              {t('streak.brokenCta')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function StreakCalendar({ dates, today }: { dates: string[]; today: string }) {
  const { t, language } = useLanguage()
  const done = useMemo(() => new Set(dates.map((d) => d.slice(0, 10))), [dates])
  const cursor = parseISODate(today)
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
    <div className="mt-4">
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 capitalize">
        {monthLabel}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((d, i) => (
          <span key={`${d}-${i}`} className="text-[10px] font-bold text-neutral-400">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />
          const iso = toISO(year, month, day)
          const active = done.has(iso)
          const isToday = iso === today.slice(0, 10)
          return (
            <span
              key={iso}
              title={active ? t('streak.dayDone') : undefined}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                active
                  ? 'bg-neutral-950 text-brand-gold'
                  : isToday
                    ? 'border border-brand-gold text-neutral-900'
                    : 'text-neutral-500'
              }`}
            >
              {day}
            </span>
          )
        })}
      </div>
    </div>
  )
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
