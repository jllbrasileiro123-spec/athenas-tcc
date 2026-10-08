import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { PhoenixMark } from './PhoenixMark'
import {
  dismissFeedback,
  fetchMyFeedback,
  saveFeedback,
  wasFeedbackDismissed,
} from '../lib/courseFeedback'

type Props = {
  courseId: string
  courseTitle: string
  /** Abre sozinho ao concluir o curso, se o aluno ainda não avaliou */
  auto?: boolean
  /** Modo controlado (botão "Avaliar curso") */
  open?: boolean
  onClose?: () => void
  onSaved?: () => void
}

export function CourseFeedbackModal({ courseId, courseTitle, auto, open, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { t } = useLanguage()

  const [autoOpen, setAutoOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [recommend, setRecommend] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const visible = open ?? autoOpen

  // Carrega o feedback existente (para editar) e decide se abre sozinho
  useEffect(() => {
    if (!user) return
    if (!auto && !open) return
    let cancelled = false
    void fetchMyFeedback(user.id, courseId).then(({ feedback, error: err }) => {
      if (cancelled) return
      if (feedback) {
        setRating(feedback.rating)
        setRecommend(feedback.would_recommend)
        setComment(feedback.comment ?? '')
      }
      // Sem a tabela no Supabase não abre sozinho (evita popup quebrado)
      if (auto && !err && !feedback && !wasFeedbackDismissed(courseId)) setAutoOpen(true)
    })
    return () => {
      cancelled = true
    }
  }, [user, courseId, auto, open])

  function close() {
    if (!done) dismissFeedback(courseId)
    setAutoOpen(false)
    setDone(false)
    onClose?.()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (rating < 1) {
      setError(t('feedback.needRating'))
      return
    }
    setError(null)
    setSaving(true)
    const err = await saveFeedback(user.id, courseId, {
      rating,
      would_recommend: recommend,
      comment,
    })
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    setDone(true)
    onSaved?.()
  }

  if (!visible) return null

  const shown = hover || rating

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-neutral-950/80 px-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div className="celebration-pop w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-brand-gold/40 bg-brand-cream p-6 sm:p-8 shadow-2xl">
        {done ? (
          <div className="text-center">
            <PhoenixMark className="mx-auto h-20 w-20" glow />
            <p id="feedback-title" className="mt-4 text-xl font-bold text-neutral-900">
              {t('feedback.thanks')}
            </p>
            <p className="mt-2 text-sm text-neutral-600">{t('feedback.thanksBody')}</p>
            <button type="button" onClick={close} className="btn-primary w-full mt-6 !py-3">
              {t('feedback.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold text-center">
              {t('feedback.kicker')}
            </p>
            <h2 id="feedback-title" className="mt-2 text-xl font-bold text-neutral-900 text-center leading-snug">
              {t('feedback.title')}
            </h2>
            <p className="mt-1 text-sm text-neutral-600 text-center">{courseTitle}</p>

            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-neutral-900">{t('feedback.ratingQ')}</legend>
              <div className="mt-2 flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    aria-label={t('feedback.starN', { n: String(n) })}
                    aria-pressed={rating === n}
                    className={`text-4xl leading-none px-1 transition-transform hover:scale-110 ${
                      n <= shown ? 'text-brand-gold' : 'text-neutral-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="mt-1 h-4 text-center text-xs text-neutral-500">
                {shown > 0 ? t(`feedback.rating${shown}` as 'feedback.rating1') : ''}
              </p>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-neutral-900">{t('feedback.recommendQ')}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setRecommend(value)}
                    aria-pressed={recommend === value}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      recommend === value
                        ? 'border-neutral-900 bg-brand-gold-soft/60 text-neutral-900'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-gold/60'
                    }`}
                  >
                    {value ? t('feedback.yes') : t('feedback.no')}
                  </button>
                ))}
              </div>
            </fieldset>

            <label htmlFor="feedback-comment" className="mt-5 block text-sm font-semibold text-neutral-900">
              {t('feedback.commentQ')}
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-gold resize-y"
              placeholder={t('feedback.commentPh')}
            />

            {error && (
              <p className="alert-error text-sm mt-3" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={saving} className="btn-primary w-full mt-5 !py-3">
              {saving ? t('common.loading') : t('feedback.submit')}
            </button>
            <button
              type="button"
              onClick={close}
              className="btn-ghost w-full mt-2 justify-center"
            >
              {t('feedback.later')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
