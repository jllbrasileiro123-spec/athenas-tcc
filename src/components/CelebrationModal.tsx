import { Link } from 'react-router-dom'
import { PhoenixMark } from './PhoenixMark'
import { useLanguage } from '../contexts/LanguageContext'
import type { CompleteLessonResult } from '../lib/gamification'

type CelebrationModalProps = {
  result: CompleteLessonResult
  courseId: string
  onClose: () => void
}

export function CelebrationModal({ result, courseId, onClose }: CelebrationModalProps) {
  const { t } = useLanguage()
  const pct =
    result.total_lessons > 0
      ? Math.round((result.completed_count / result.total_lessons) * 100)
      : 0
  const remaining = Math.max(result.total_lessons - result.completed_count, 0)
  const nextTo = result.next_lesson_id
    ? `/assistir/${courseId}/${result.next_lesson_id}`
    : `/curso/${courseId}`

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-950/85 px-4">
      <div className="celebration-pop w-full max-w-md rounded-3xl border border-brand-gold/40 bg-brand-cream p-8 text-center shadow-2xl">
        <PhoenixMark className="mx-auto h-28 w-28" glow />
        <p className="mt-5 text-2xl font-bold text-neutral-900 leading-snug">
          {t('celebrate.title', { title: result.lesson_title })}
        </p>
        <p className="mt-3 inline-flex items-center rounded-full bg-neutral-950 px-4 py-1.5 text-lg font-bold text-brand-gold">
          {t('celebrate.xp', { xp: String(result.xp_awarded) })}
        </p>
        {result.freeze_used && (
          <p className="mt-3 text-sm font-semibold text-neutral-700">{t('celebrate.freezeUsed')}</p>
        )}
        <div className="mt-6 text-left">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 mb-1.5">
            <span>{t('trail.moduleProgress')}</span>
            <span>
              {t('celebrate.remaining', { n: String(remaining) })}
            </span>
          </div>
          <div className="h-3 rounded-full bg-brand-gold-soft overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-gold celebration-bar"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <Link to={nextTo} onClick={onClose} className="btn-primary w-full mt-8 !py-3.5 text-base">
          {result.next_lesson_id ? t('celebrate.next') : t('celebrate.backTrail')}
        </Link>
      </div>
    </div>
  )
}
