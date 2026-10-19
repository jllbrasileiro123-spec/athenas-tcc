import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  OTHER,
  SURVEY_QUESTIONS,
  fetchMyPostTest,
  isAnswered,
  isMissingPrePost,
  savePostTest,
  type SurveyAnswer,
  type SurveyAnswers,
  type SurveyQuestion,
} from '../lib/prePostSurvey'

const BLOCK_TITLE = {
  A: 'postTest.blockA',
  B: 'postTest.blockB',
  C: 'postTest.blockC',
} as const satisfies Record<SurveyQuestion['block'], string>

/** Pós-teste da pesquisa: mesmas perguntas do pré-teste (Google Forms) + avaliação final. */
export function PostTest() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [alreadyAnswered, setAlreadyAnswered] = useState(false)

  useEffect(() => {
    if (!courseId || !user) return
    void fetchMyPostTest(courseId, user.id).then(({ response, error: err }) => {
      if (err) setError(isMissingPrePost(err) ? t('postTest.missingSql') : err)
      if (response) {
        setAnswers(response.answers)
        setAlreadyAnswered(true)
      }
      setLoading(false)
    })
  }, [courseId, user, t])

  const set = (id: string, value: SurveyAnswer) => setAnswers((prev) => ({ ...prev, [id]: value }))

  const toggleMulti = (id: string, option: string) =>
    setAnswers((prev) => {
      const cur = Array.isArray(prev[id]) ? (prev[id] as string[]) : []
      return { ...prev, [id]: cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option] }
    })

  const pending = SURVEY_QUESTIONS.filter((q) => q.required && !isAnswered(answers[q.id]))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!courseId || !user) return
    if (pending.length) {
      setError(t('postTest.incomplete', { n: String(pending.length) }))
      document.getElementById(`q-${pending[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setError(null)
    setSaving(true)
    const { error: err } = await savePostTest(courseId, user.id, answers)
    setSaving(false)
    if (err) {
      setError(isMissingPrePost(err) ? t('postTest.missingSql') : err)
      return
    }
    setDone(true)
    window.scrollTo({ top: 0 })
  }

  if (loading) {
    return (
      <div className="page-shell flex min-h-[40vh] items-center justify-center">
        <div className="spinner-athenas" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className="card-athenas p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold-ink">{t('postTest.kicker')}</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-neutral-900">{t('postTest.thanks')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{t('postTest.thanksBody')}</p>
          </div>
          <Link to={`/curso/${courseId}`} className="link-athenas mt-8 inline-block text-sm">
            ← {t('course.backToCourse')}
          </Link>
        </div>
      </div>
    )
  }

  let number = 0

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-gold-ink">{t('postTest.kicker')}</p>
        <h1 className="font-display text-3xl font-bold text-neutral-900 md:text-4xl">{t('postTest.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{t('postTest.desc')}</p>
        {alreadyAnswered && <p className="alert-brand mt-4 text-sm">{t('postTest.alreadyAnswered')}</p>}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {SURVEY_QUESTIONS.map((q, i) => {
            number += 1
            const showBlock = i === 0 || SURVEY_QUESTIONS[i - 1].block !== q.block
            const value = answers[q.id]
            const missing = Boolean(error) && q.required && !isAnswered(value)
            return (
              <div key={q.id}>
                {showBlock && (
                  <h2 className="mb-3 mt-8 text-xs font-extrabold uppercase tracking-[0.14em] text-neutral-500 first:mt-0">
                    {t(BLOCK_TITLE[q.block])}
                  </h2>
                )}
                <fieldset
                  id={`q-${q.id}`}
                  className={`card-athenas p-5 ${missing ? '!border-red-300' : ''}`}
                >
                  <legend className="float-left w-full text-sm font-bold leading-snug text-neutral-900">
                    {number}. {q.text}
                    {q.required && <span className="text-red-600"> *</span>}
                    {q.kind === 'multi' && (
                      <span className="block text-xs font-semibold text-neutral-500">{t('postTest.multiHint')}</span>
                    )}
                  </legend>
                  <div className="clear-both pt-3">
                    <QuestionInput
                      q={q}
                      value={value}
                      otherText={String(answers[`${q.id}_outro`] ?? '')}
                      onSingle={(v) => set(q.id, v)}
                      onToggle={(o) => toggleMulti(q.id, o)}
                      onOtherText={(v) => set(`${q.id}_outro`, v)}
                      t={t}
                    />
                  </div>
                </fieldset>
              </div>
            )
          })}

          {error && (
            <p className="alert-error text-sm" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full !py-3 disabled:opacity-50">
            {saving ? t('common.loading') : alreadyAnswered ? t('postTest.update') : t('postTest.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}

type TFn = ReturnType<typeof useLanguage>['t']

function QuestionInput({
  q,
  value,
  otherText,
  onSingle,
  onToggle,
  onOtherText,
  t,
}: {
  q: SurveyQuestion
  value: SurveyAnswer | undefined
  otherText: string
  onSingle: (v: SurveyAnswer) => void
  onToggle: (option: string) => void
  onOtherText: (v: string) => void
  t: TFn
}) {
  const choice = (active: boolean) =>
    `flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${
      active ? 'border-neutral-900 bg-brand-gold-soft/50' : 'border-neutral-200 hover:border-brand-gold/60'
    }`

  if (q.kind === 'scale' || q.kind === 'nps') {
    const values = q.kind === 'nps' ? Array.from({ length: 11 }, (_, i) => i) : [1, 2, 3, 4, 5]
    return (
      <div>
        <div className={`grid gap-1.5 ${q.kind === 'nps' ? 'grid-cols-6 sm:grid-cols-11' : 'grid-cols-5'}`}>
          {values.map((v) => (
            <label
              key={v}
              className={`cursor-pointer rounded-xl border py-2.5 text-center text-sm font-bold ${
                value === v
                  ? 'border-neutral-900 bg-brand-gold-soft/60 text-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-brand-gold/60'
              }`}
            >
              <input type="radio" name={q.id} className="sr-only" checked={value === v} onChange={() => onSingle(v)} />
              {v}
            </label>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-neutral-500">
          <span>{q.kind === 'nps' ? t('postTest.npsLow') : q.scaleLabels?.[0]}</span>
          <span>{q.kind === 'nps' ? t('postTest.npsHigh') : q.scaleLabels?.[1]}</span>
        </div>
      </div>
    )
  }

  if (q.kind === 'text') {
    return (
      <textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onSingle(e.target.value)}
        rows={4}
        maxLength={1500}
        className="w-full resize-y rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
      />
    )
  }

  const options = [...(q.options ?? []), ...(q.other ? [OTHER] : [])]
  const selected = (o: string) => (Array.isArray(value) ? value.includes(o) : value === o)
  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <label key={o} className={choice(selected(o))}>
          <input
            type={q.kind === 'multi' ? 'checkbox' : 'radio'}
            name={q.id}
            className="mt-0.5"
            checked={selected(o)}
            onChange={() => (q.kind === 'multi' ? onToggle(o) : onSingle(o))}
          />
          <span>{o === OTHER ? t('postTest.other') : o}</span>
        </label>
      ))}
      {q.other && selected(OTHER) && (
        <input
          value={otherText}
          onChange={(e) => onOtherText(e.target.value)}
          maxLength={200}
          placeholder={t('postTest.otherPh')}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-gold"
        />
      )}
    </div>
  )
}
