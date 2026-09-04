import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  answerLessonQuestion,
  askLessonQuestion,
  fetchLessonQuestions,
  isMissingQuestions,
  type LessonQuestion,
} from '../lib/lessonQuestions'

function formatDate(value: string, lang: 'pt' | 'en') {
  return new Date(value).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
    day: '2-digit',
    month: 'short',
  })
}

/**
 * Dúvidas da aula. O aluno pergunta, o instrutor do curso responde na
 * mesma lista — e quem é dono do curso responde direto por aqui.
 */
export function LessonDoubts({
  courseId,
  lessonId,
  isOwner,
}: {
  courseId: string
  lessonId: string
  isOwner: boolean
}) {
  const { user } = useAuth()
  const { t, language } = useLanguage()

  const [questions, setQuestions] = useState<LessonQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [replyFor, setReplyFor] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { questions: rows, error: err } = await fetchLessonQuestions(lessonId)
      if (!active) return
      if (err && isMissingQuestions(err)) setMissing(true)
      else if (err) setError(err)
      else setQuestions(rows)
      setLoading(false)
    }
    void load()
    return () => {
      active = false
    }
  }, [lessonId])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!user || !body.trim()) return
    setError(null)
    setSending(true)
    const { question, error: err } = await askLessonQuestion({
      courseId,
      lessonId,
      userId: user.id,
      body,
    })
    setSending(false)
    if (err) {
      if (isMissingQuestions(err)) setMissing(true)
      else setError(err)
      return
    }
    if (question) {
      setQuestions((prev) => [question, ...prev])
      setBody('')
      setSent(true)
    }
  }

  async function submitAnswer(questionId: string) {
    if (!user || !replyText.trim()) return
    setError(null)
    setReplying(true)
    const { error: err } = await answerLessonQuestion(questionId, replyText, user.id)
    setReplying(false)
    if (err) {
      setError(err)
      return
    }
    const answeredAt = new Date().toISOString()
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, answer: replyText.trim(), answered_at: answeredAt } : q
      )
    )
    setReplyFor(null)
    setReplyText('')
  }

  if (missing) {
    return (
      <section className="mt-8 card-athenas p-5">
        <h2 className="text-base font-bold text-neutral-900">{t('doubts.title')}</h2>
        <p className="mt-2 alert-brand text-sm">{t('doubts.missingTable')}</p>
      </section>
    )
  }

  const answered = questions.filter((q) => q.answer)
  const pending = questions.filter((q) => !q.answer)

  return (
    <section className="mt-8 card-athenas p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-neutral-900">{t('doubts.title')}</h2>
        <p className="text-xs text-neutral-500">
          {t('doubts.counter', {
            answered: String(answered.length),
            pending: String(pending.length),
          })}
        </p>
      </div>
      <p className="mt-1 text-sm text-neutral-600">
        {isOwner ? t('doubts.ownerHint') : t('doubts.studentHint')}
      </p>

      {!isOwner && user && (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <label htmlFor="doubt-body" className="sr-only">
            {t('doubts.placeholder')}
          </label>
          <textarea
            id="doubt-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              setSent(false)
            }}
            rows={3}
            maxLength={600}
            placeholder={t('doubts.placeholder')}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold resize-y"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="btn-primary !px-4 !py-2.5 text-sm disabled:opacity-50"
            >
              {sending ? t('common.loading') : t('doubts.send')}
            </button>
            {sent && <span className="text-xs font-semibold text-brand-gold">{t('doubts.sent')}</span>}
          </div>
        </form>
      )}

      {!user && <p className="mt-4 text-sm text-neutral-500">{t('doubts.signIn')}</p>}

      {error && (
        <p className="mt-4 alert-error text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="spinner-athenas" />
          </div>
        ) : questions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500">
            {t('doubts.empty')}
          </p>
        ) : (
          <ul className="space-y-3">
            {questions.map((q) => {
              const mine = q.user_id === user?.id
              return (
                <li key={q.id} className="rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="bg-neutral-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                        {mine ? t('doubts.you') : t('doubts.student')}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {formatDate(q.created_at, language)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          q.answer
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {q.answer ? t('doubts.answered') : t('doubts.waiting')}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-neutral-900 whitespace-pre-wrap">{q.body}</p>
                  </div>

                  {q.answer ? (
                    <div className="border-t border-neutral-200 bg-brand-gold-soft/25 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-brand-gold">
                        {t('doubts.instructorAnswer')}
                      </p>
                      <p className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{q.answer}</p>
                    </div>
                  ) : (
                    isOwner && (
                      <div className="border-t border-neutral-200 px-4 py-3">
                        {replyFor === q.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={3}
                              maxLength={1200}
                              placeholder={t('doubts.answerPlaceholder')}
                              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-gold resize-y"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={replying || !replyText.trim()}
                                onClick={() => void submitAnswer(q.id)}
                                className="btn-primary !px-4 !py-2 text-xs disabled:opacity-50"
                              >
                                {replying ? t('common.loading') : t('doubts.publishAnswer')}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyFor(null)
                                  setReplyText('')
                                }}
                                className="btn-secondary !px-4 !py-2 text-xs"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyFor(q.id)
                              setReplyText('')
                            }}
                            className="btn-primary !px-4 !py-2 text-xs"
                          >
                            {t('doubts.answerCta')}
                          </button>
                        )}
                      </div>
                    )
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
