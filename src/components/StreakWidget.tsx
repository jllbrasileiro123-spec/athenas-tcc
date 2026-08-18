import { useEffect, useRef, useState } from 'react'
import { PhoenixMark } from './PhoenixMark'
import { StreakPopup } from './StreakPopup'
import { useGamification } from '../contexts/GamificationContext'
import { useLanguage } from '../contexts/LanguageContext'

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
      <div ref={rootRef} className="relative flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border-2 border-streak-ember bg-streak-fire/15 px-2 py-1 sm:px-2.5 hover:bg-streak-fire/25 touch-manipulation"
          aria-expanded={open}
          aria-label={t('streak.aria')}
        >
          <PhoenixMark className="h-6 w-6" tone="flame" glow={status.current_streak > 0} />
          <span className="text-sm font-bold text-streak-ember tabular-nums leading-none">
            {status.current_streak}
            <span className="ml-0.5 text-[10px] font-bold text-streak-ember/80">d</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border-2 border-brand-gold bg-neutral-950 px-2 py-1 sm:px-2.5 hover:bg-black touch-manipulation"
          aria-expanded={open}
          aria-label={t('streak.coinsAria')}
        >
          <CoinIcon />
          <span className="text-sm font-bold text-brand-gold tabular-nums">
            {status.coin_balance}
          </span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-[89] bg-neutral-950/50 md:hidden" onClick={() => setOpen(false)} />
            <StreakPopup status={status} buying={buying} shopError={shopError} onBuy={() => void onBuy()} />
          </>
        )}
      </div>

      {showBroken && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-neutral-950/70 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white border border-brand-gold/30 p-7 text-center shadow-xl">
            <PhoenixMark className="mx-auto h-16 w-16" tone="flame" />
            <p className="mt-4 text-lg font-bold text-neutral-900">
              {t('streak.brokenTitle', { n: String(status.broken_from) })}
            </p>
            <p className="mt-2 text-sm text-neutral-700">{t('streak.brokenHint')}</p>
            <button type="button" className="btn-primary w-full mt-6" onClick={() => void ackBrokenStreak()}>
              {t('streak.brokenCta')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function CoinIcon() {
  return (
    <svg className="h-4 w-4 text-brand-gold" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" fill="#0a0a0a" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    </svg>
  )
}
