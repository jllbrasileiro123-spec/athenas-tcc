import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../contexts/LanguageContext'
import { useGamification } from '../contexts/GamificationContext'
import {
  fetchPlacementTest,
  isMissingPlacement,
  submitPlacementTest,
  type PlacementQuestion,
  type PlacementResult,
} from '../lib/placementTest'

export function PlacementTest() {
  const { courseId } = useParams<{ courseId: string }>()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { refresh } = useGamification()

  const [courseTitle, setCourseTitle] = useState('')
  const [questions, setQuestions] = useState<PlacementQuestion[]>([])
  const [alreadyTaken, setAlreadyTaken] = useState(false)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [result, setResult] = useState<PlacementResult | null>(null)

  useEffect(() => {
    if (!courseId) return
    const cId: string = courseId

    async function load() {
      setLoading(true)
      const [{ data: course }, { test, error: err }] = await Promise.all([
        supabase.from('courses').select('title').eq('id', cId).single(),
        fetchPlacementTest(cId),
      ])

      if (course) setCourseTitle((course as { title: string }).title)

      if (err) {
        if (isMissingPlacement(err)) setMissing(true)
        else setError(err)
      } else if (test) {
        setQuestions(test.questions)
        setAlreadyTaken(test.already_taken)
      }
      setLoading(false)
    }

    void load()
  }, [courseId])

  async function handleSubmit() {
    if (!courseId) return
    if (questions.some((q) => answers[q.id] === undefined)) {
      setError(t('placement.unanswered'))
      return
    }
    setError(null)
    setSubmitting(true)
    const { result: res, error: err } = await submitPlacementTest(courseId, answers)
    setSubmitting(false)

    if (err) {
      if (isMissingPlacement(err)) setMissing(true)
      else setError(err)
      return
    }
    if (res && !res.ok) {
      setError(t('placement.noQuestions'))
      return
    }
    setResult(res)
    void refresh()
  }

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[40vh]">
        <div className="spinner-athenas" />
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">
          {t('placement.kicker')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{t('placement.title')}</h1>
        {courseTitle && <p className="mt-1 text-sm font-semibold text-neutral-700">{courseTitle}</p>}
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{t('placement.desc')}</p>

        {missing ? (
          <p className="mt-8 alert-brand text-sm">{t('placement.missingTable')}</p>
        ) : result ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-brand-gold/30 bg-white p-6 shadow-sm">
              <p className="text-lg font-bold text-neutral-900">
                {t('placement.resultTitle', {
                  unlocked: String(result.unlocked_count),
                  total: String(result.lesson_count),
                })}
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                {t('placement.resultScore', {
                  correct: String(result.correct_count),
                  total: String(result.total_count),
                })}
              </p>
              {result.next_lesson_title ? (
                <p className="mt-3 text-sm text-neutral-800 font-semibold">
                  {t('placement.startAt', { lesson: result.next_lesson_title })}
                </p>
              ) : (
                <p className="mt-3 text-sm text-neutral-800 font-semibold">
                  {t('placement.allDone')}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {result.next_lesson_id && (
                <button
                  type="button"
                  onClick={() => navigate(`/assistir/${courseId}/${result.next_lesson_id}`)}
                  className="btn-primary !px-4 !py-2.5 text-sm"
                >
                  {t('placement.goToLesson')}
                </button>
              )}
              <Link to={`/curso/${courseId}`} className="btn-secondary !px-4 !py-2.5 text-sm">
                {t('placement.openTrail')}
              </Link>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <div className="mt-8 space-y-4">
            <p className="alert-brand text-sm">{t('placement.noQuestions')}</p>
            <Link to={`/curso/${courseId}`} className="btn-primary inline-flex !px-4 !py-2.5 text-sm">
              {t('placement.startFromZero')}
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {alreadyTaken && <p className="alert-brand text-sm">{t('placement.retake')}</p>}

            <div className="rounded-2xl border border-brand-gold/20 bg-white p-5 sm:p-6 space-y-6">
              {questions.map((q, i) => (
                <fieldset key={q.id} className="space-y-2">
                  <legend className="text-sm font-bold text-neutral-900">
                    {i + 1}. {q.prompt}
                  </legend>
                  <p className="text-xs text-neutral-500">
                    {t('placement.aboutLesson', { lesson: q.lesson_title })}
                  </p>
                  <div className="space-y-1.5 pt-1">
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

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="btn-primary w-full !py-3"
              >
                {submitting ? t('common.loading') : t('placement.submit')}
              </button>
            </div>

            <Link to={`/curso/${courseId}`} className="link-athenas inline-block text-sm">
              {t('placement.skipTest')}
            </Link>
          </div>
        )}

        <Link to="/explorar" className="link-athenas inline-block mt-8 text-sm">
          ← {t('common.back')}
        </Link>
      </div>
    </div>
  )
}
