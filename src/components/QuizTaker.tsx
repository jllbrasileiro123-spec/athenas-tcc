import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../contexts/LanguageContext'
import { userTimezone, type CompleteLessonResult } from '../lib/gamification'

export type QuizQuestion = {
  id: string
  prompt: string
  choices: string[]
  sort_order: number
}

type SubmitResult = {
  ok: boolean
  passed: boolean
  correct: number
  total: number
  percent: number
  completion: CompleteLessonResult | null
}

export function QuizTaker({
  lessonId,
  completed,
  onPassed,
}: {
  lessonId: string
  completed: boolean
  onPassed: (result: CompleteLessonResult) => void
}) {
  const { t } = useLanguage()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setResult(null)
    setAnswers({})
    void supabase.rpc('get_quiz', { p_lesson_id: lessonId }).then(({ data, error: err }) => {
      setLoading(false)
      if (err) {
        setError(err.message)
        setQuestions([])
        return
      }
      const list = Array.isArray(data) ? data : []
      setQuestions(
        list.map((q: QuizQuestion) => ({
          ...q,
          choices: Array.isArray(q.choices) ? q.choices.map(String) : [],
        }))
      )
    })
  }, [lessonId])

  async function submit() {
    if (questions.some((q) => answers[q.id] === undefined)) {
      setError(t('quiz.unanswered'))
      return
    }
    setError(null)
    setSubmitting(true)
    const { data, error: err } = await supabase.rpc('submit_quiz', {
      p_lesson_id: lessonId,
      p_answers: answers,
      p_timezone: userTimezone(),
    })
    setSubmitting(false)
    if (err) {
      setError(err.message)
      return
    }
    const raw = (data ?? {}) as SubmitResult
    const parsed: SubmitResult = {
      ok: Boolean(raw.ok),
      passed: Boolean(raw.passed),
      correct: Number(raw.correct ?? 0),
      total: Number(raw.total ?? 0),
      percent: Number(raw.percent ?? 0),
      completion: raw.completion ?? null,
    }
    setResult(parsed)
    if (parsed.passed && parsed.completion && !parsed.completion.already_completed) {
      onPassed(parsed.completion)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-brand-gold/20 bg-white p-8 flex justify-center">
        <div className="spinner-athenas" />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <p className="rounded-2xl border border-brand-gold/30 bg-brand-gold-soft/40 px-4 py-6 text-sm text-neutral-700">
        {t('quiz.empty')}
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-gold/20 bg-white p-5 sm:p-6 space-y-6">
      {questions.map((q, i) => (
        <fieldset key={q.id} className="space-y-2">
          <legend className="text-sm font-bold text-neutral-900">
            {i + 1}. {q.prompt}
          </legend>
          <div className="space-y-1.5">
            {q.choices.map((choice, idx) => (
              <label
                key={`${q.id}-${idx}`}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer ${
                  answers[q.id] === idx
                    ? 'border-neutral-900 bg-brand-gold-soft/50'
                    : 'border-neutral-200 hover:border-brand-gold/50'
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  className="mt-0.5"
                  checked={answers[q.id] === idx}
                  disabled={completed && !result}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                />
                <span>{choice}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <p className={result.passed ? 'alert-brand' : 'alert-error'}>
          {result.passed
            ? t('quiz.passed', { n: String(result.percent) })
            : t('quiz.failed', { n: String(result.percent) })}
        </p>
      )}

      {!completed && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="btn-primary w-full !py-3"
        >
          {submitting ? t('common.loading') : t('quiz.submit')}
        </button>
      )}
    </div>
  )
}
