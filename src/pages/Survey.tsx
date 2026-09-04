import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

const ITEM_KEYS = [
  'survey.q1',
  'survey.q2',
  'survey.q3',
  'survey.q4',
  'survey.q5',
  'survey.q6',
  'survey.q7',
  'survey.q8',
  'survey.q9',
  'survey.q10',
] as const

const ITEM_COUNT = ITEM_KEYS.length

/**
 * System Usability Scale (Atividade 8): 10 itens, escala 1–5.
 * Nota = ((soma dos ímpares - 5) + (25 - soma dos pares)) * 2,5 → 0 a 100.
 */
function susScore(answers: number[]): number {
  let odd = 0
  let even = 0
  answers.forEach((value, index) => {
    if (index % 2 === 0) odd += value
    else even += value
  })
  return ((odd - 5 + (25 - even)) * 2.5)
}

export function Survey() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()

  const [answers, setAnswers] = useState<(number | null)[]>(Array(ITEM_COUNT).fill(null))
  const [comment, setComment] = useState('')
  const [participant, setParticipant] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)

  const complete = answers.every((a) => a !== null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!complete) {
      setError(t('survey.incomplete'))
      return
    }
    const values = answers as number[]
    const result = susScore(values)
    setError(null)
    setSaving(true)

    const { error: err } = await supabase.from('sus_responses').insert({
      user_id: user?.id ?? null,
      participant: participant.trim() || null,
      answers: values,
      score: result,
      comment: comment.trim() || null,
    })
    setSaving(false)

    if (err) {
      // Sem a tabela, ainda mostramos a nota calculada para não travar o teste
      setScore(result)
      setError(t('survey.savedLocalOnly'))
      return
    }
    setScore(result)
  }

  if (score !== null) {
    return (
      <div className="page-shell">
        <div className="max-w-xl mx-auto px-4 py-10">
          <div className="card-athenas p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
              {t('survey.kicker')}
            </p>
            <h1 className="mt-3 text-2xl font-bold text-neutral-900">{t('survey.thanks')}</h1>
            <p className="mt-5 text-5xl font-bold text-neutral-900">{score.toFixed(1)}</p>
            <p className="mt-1 text-sm text-neutral-500">{t('survey.scoreOf100')}</p>
            <p className="mt-4 text-sm text-neutral-600">
              {score >= 68 ? t('survey.aboveAverage') : t('survey.belowAverage')}
            </p>
            {error && <p className="mt-4 alert-brand text-xs">{error}</p>}
          </div>
          <Link to="/explorar" className="link-athenas inline-block mt-8 text-sm">
            ← {t('common.back')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">
          {t('survey.kicker')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{t('survey.title')}</h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{t('survey.desc')}</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="card-athenas p-5">
            <label htmlFor="participant" className="block text-sm font-semibold text-neutral-900">
              {t('survey.participant')}
            </label>
            <input
              id="participant"
              value={participant}
              onChange={(e) => setParticipant(e.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
              placeholder={t('survey.participantHint')}
            />
          </div>

          {ITEM_KEYS.map((key, i) => (
            <fieldset key={key} className="card-athenas p-5">
              <legend className="text-sm font-bold text-neutral-900">
                {i + 1}. {t(key)}
              </legend>
              <div className="mt-3 flex items-center justify-between gap-1.5">
                <span className="text-[10px] text-neutral-500 shrink-0 max-w-[72px] leading-tight">
                  {t('survey.disagree')}
                </span>
                {[1, 2, 3, 4, 5].map((value) => (
                  <label
                    key={value}
                    className={`flex-1 text-center cursor-pointer rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors ${
                      answers[i] === value
                        ? 'border-neutral-900 bg-brand-gold-soft/60 text-neutral-900'
                        : 'border-neutral-200 text-neutral-600 hover:border-brand-gold/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      className="sr-only"
                      checked={answers[i] === value}
                      onChange={() =>
                        setAnswers((prev) => {
                          const next = [...prev]
                          next[i] = value
                          return next
                        })
                      }
                    />
                    {value}
                  </label>
                ))}
                <span className="text-[10px] text-neutral-500 shrink-0 max-w-[72px] leading-tight text-right">
                  {t('survey.agree')}
                </span>
              </div>
            </fieldset>
          ))}

          <div className="card-athenas p-5">
            <label htmlFor="survey-comment" className="block text-sm font-semibold text-neutral-900">
              {t('survey.comment')}
            </label>
            <textarea
              id="survey-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={1200}
              className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold resize-y"
              placeholder={t('survey.commentHint')}
            />
          </div>

          {error && (
            <p className="alert-error text-sm" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !complete}
            className="btn-primary w-full !py-3 disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('survey.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
