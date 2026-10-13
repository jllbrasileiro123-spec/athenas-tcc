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

/** Correção por pergunta; correct_index/explanation só vêm quando passou */
type QuestionReview = {
  id: string
  is_correct: boolean
  correct_index?: number
  explanation?: string | null
}

type SubmitResult = {
  ok: boolean
  passed: boolean
  correct: number
  total: number
  percent: number
  completion: CompleteLessonResult | null
  review: QuestionReview[]
}

/** Mesmo corte do submit_quiz no banco */
const PASS_RATIO = 0.7
const LETTERS = 'ABCDEFGH'

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
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setResult(null)
    setAnswers({})
    setStep(0)
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
    const firstMissing = questions.findIndex((q) => answers[q.id] === undefined)
    if (firstMissing >= 0) {
      setError(t('quiz.unanswered'))
      setStep(firstMissing)
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
      review: Array.isArray(raw.review) ? raw.review : [],
    }
    setResult(parsed)
    if (parsed.passed && parsed.completion && !parsed.completion.already_completed) {
      onPassed(parsed.completion)
    }
  }

  function choose(questionId: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }))
    setError(null)
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-brand-line bg-white p-8 flex justify-center">
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

  const total = questions.length
  const need = Math.ceil(total * PASS_RATIO)
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length
  const locked = completed && !result

  const howItWorks = (
    <div className="flex flex-col gap-2 rounded-[20px] border border-brand-line bg-white p-5 sm:flex-row sm:items-center sm:gap-5">
      <p className="font-display text-3xl font-bold leading-none text-neutral-900">
        {need}/{total}
      </p>
      <div className="text-sm leading-relaxed text-neutral-700">
        <p className="font-extrabold text-neutral-900">{t('quiz.howTitle')}</p>
        <p>
          {t('quiz.howBody', { need: String(need), total: String(total) })} {t('quiz.howReview')}
        </p>
      </div>
    </div>
  )

  // Depois de enviar: todas as perguntas com a correção
  if (result) {
    return (
      <div className="flex flex-col gap-5">
        <div
          className={`rounded-[20px] p-5 ${
            result.passed ? 'bg-neutral-950 text-brand-cream' : 'border border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <p className="font-display text-3xl font-bold">
            {result.correct}/{result.total}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {result.passed
              ? t('quiz.passed', { n: String(result.percent) })
              : t('quiz.failed', { n: String(result.percent) })}
          </p>
        </div>

        <h2 className="font-display text-2xl font-bold text-neutral-900">{t('quiz.reviewTitle')}</h2>
        {questions.map((q, i) => {
          const review = result.review.find((r) => r.id === q.id)
          return (
            <section key={q.id} className="flex flex-col gap-3 rounded-[20px] border border-brand-line bg-white p-5">
              <p className="font-bold text-neutral-900">
                {i + 1}. {q.prompt}
              </p>
              <p className="text-sm text-neutral-600">
                {LETTERS[answers[q.id]] ?? '–'}) {q.choices[answers[q.id]] ?? ''}
              </p>
              {review && (
                <div
                  className={`rounded-xl px-3 py-2 text-sm ${
                    review.is_correct
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border border-red-200 text-red-900'
                  }`}
                >
                  <p className="font-semibold">
                    {review.is_correct
                      ? t('quiz.right')
                      : review.correct_index !== undefined
                        ? t('quiz.wrongPassed', { answer: q.choices[review.correct_index] ?? '' })
                        : t('quiz.wrong')}
                  </p>
                  {review.explanation && <p className="mt-1 leading-relaxed">{review.explanation}</p>}
                </div>
              )}
            </section>
          )
        })}

        {!result.passed && (
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setStep(0)
            }}
            className="h-[50px] rounded-[14px] bg-neutral-950 px-7 text-[15px] font-extrabold text-brand-gold-soft hover:bg-black"
          >
            {t('quiz.retry')}
          </button>
        )}
      </div>
    )
  }

  const q = questions[Math.min(step, total - 1)]
  const isLast = step >= total - 1

  return (
    <div className="flex flex-col gap-5">
      {howItWorks}

      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between text-[13px] font-bold">
          <span>{t('quiz.questionOf', { n: String(step + 1), total: String(total) })}</span>
          <span className="text-neutral-500">{t('quiz.answeredCount', { n: String(answeredCount) })}</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
          {questions.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(i)}
              aria-label={t('quiz.questionOf', { n: String(i + 1), total: String(total) })}
              aria-current={i === step ? 'step' : undefined}
              className={`h-2 rounded-full ${
                i === step
                  ? 'bg-brand-gold'
                  : answers[item.id] !== undefined
                    ? 'bg-neutral-900'
                    : 'bg-brand-line'
              }`}
            />
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-5 rounded-3xl border border-brand-line bg-white p-5 sm:p-8">
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-4 text-lg font-extrabold leading-snug text-neutral-900 sm:text-[22px]">
            {q.prompt}
          </legend>
          {q.choices.map((choice, idx) => {
            const selected = answers[q.id] === idx
            return (
              <label
                key={`${q.id}-${idx}`}
                className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-[15px] font-semibold sm:text-base ${
                  locked ? 'cursor-default' : 'cursor-pointer'
                } ${
                  selected
                    ? 'border-2 border-brand-gold bg-[#fbf3de]'
                    : 'border border-neutral-200 bg-white hover:border-brand-gold/60'
                } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-gold`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-sm font-extrabold ${
                    selected ? 'bg-brand-gold text-neutral-950' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {LETTERS[idx]}
                </span>
                <input
                  type="radio"
                  name={q.id}
                  className="sr-only"
                  checked={selected}
                  disabled={locked}
                  onChange={() => choose(q.id, idx)}
                />
                <span>{choice}</span>
              </label>
            )
          })}
        </fieldset>
      </section>

      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="h-[50px] rounded-[14px] border border-[#d9cfb8] bg-white px-5 text-[15px] font-bold text-neutral-900 hover:border-neutral-900 disabled:opacity-40"
        >
          {t('quiz.prev')}
        </button>
        {isLast ? (
          !completed && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit()}
              className="h-[50px] rounded-[14px] bg-neutral-950 px-7 text-[15px] font-extrabold text-brand-gold-soft hover:bg-black disabled:opacity-60"
            >
              {submitting ? t('common.loading') : t('quiz.submit')}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            className="h-[50px] rounded-[14px] bg-neutral-950 px-7 text-[15px] font-extrabold text-brand-gold-soft hover:bg-black"
          >
            {t('quiz.nextQuestion')}
          </button>
        )}
      </div>
    </div>
  )
}
