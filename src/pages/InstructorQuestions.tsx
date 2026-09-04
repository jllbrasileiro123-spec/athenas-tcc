import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  answerLessonQuestion,
  fetchInstructorQuestions,
  isMissingQuestions,
  type InstructorQuestion,
} from '../lib/lessonQuestions'

export function InstructorQuestions() {
  const { user, profile } = useAuth()
  const { t, language } = useLanguage()

  const [questions, setQuestions] = useState<InstructorQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyFor, setReplyFor] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  const canTeach = profile?.role === 'instructor' || profile?.role === 'admin'

  useEffect(() => {
    if (!canTeach) {
      setLoading(false)
      return
    }
    async function load() {
      const { questions: rows, error: err } = await fetchInstructorQuestions()
      if (err && isMissingQuestions(err)) setMissing(true)
      else if (err) setError(err)
      else setQuestions(rows)
      setLoading(false)
    }
    void load()
  }, [canTeach])

  async function submitAnswer(id: string) {
    if (!user || !replyText.trim()) return
    setError(null)
    setReplying(true)
    const { error: err } = await answerLessonQuestion(id, replyText, user.id)
    setReplying(false)
    if (err) {
      setError(err)
      return
    }
    const answeredAt = new Date().toISOString()
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, answer: replyText.trim(), answered_at: answeredAt } : q
      )
    )
    setReplyFor(null)
    setReplyText('')
  }

  if (!canTeach) {
    return (
      <div className="page-shell">
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-3">
          <p className="text-neutral-600">{t('instructor.notInstructor')}</p>
          <Link to="/tornar-se-instrutor" className="btn-primary inline-flex">
            {t('menu.becomeInstructor')}
          </Link>
        </div>
      </div>
    )
  }

  const pending = questions.filter((q) => !q.answer)
  const answered = questions.filter((q) => q.answer)

  return (
    <div className="page-shell">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">
          {t('doubts.queueKicker')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{t('doubts.queueTitle')}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t('doubts.queueDesc')}</p>

        {missing ? (
          <p className="mt-8 alert-brand text-sm">{t('doubts.missingTable')}</p>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner-athenas" />
          </div>
        ) : (
          <>
            {error && (
              <p className="mt-6 alert-error text-sm" role="alert">
                {error}
              </p>
            )}

            <p className="mt-6 text-sm font-semibold text-neutral-700">
              {t('doubts.counter', {
                answered: String(answered.length),
                pending: String(pending.length),
              })}
            </p>

            {questions.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500">
                {t('doubts.queueEmpty')}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {[...pending, ...answered].map((q) => (
                  <li key={q.id} className="rounded-2xl border border-neutral-200 overflow-hidden">
                    <div className="bg-neutral-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900">{q.student_name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            q.answer ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {q.answer ? t('doubts.answered') : t('doubts.waiting')}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {new Date(q.created_at).toLocaleDateString(
                            language === 'pt' ? 'pt-BR' : 'en-US',
                            { day: '2-digit', month: 'short' }
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {q.course_title}
                        {q.lesson_title ? ` · ${q.lesson_title}` : ''}
                      </p>
                      <p className="mt-2 text-sm text-neutral-900 whitespace-pre-wrap">{q.body}</p>
                      {q.lesson_id && (
                        <Link
                          to={`/assistir/${q.course_id}/${q.lesson_id}`}
                          className="link-athenas text-xs mt-2 inline-block"
                        >
                          {t('doubts.openLesson')}
                        </Link>
                      )}
                    </div>

                    {q.answer ? (
                      <div className="border-t border-neutral-200 bg-brand-gold-soft/25 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-brand-gold">
                          {t('doubts.yourAnswer')}
                        </p>
                        <p className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{q.answer}</p>
                      </div>
                    ) : (
                      <div className="border-t border-neutral-200 px-4 py-3">
                        {replyFor === q.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={4}
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
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <Link to="/instrutor" className="link-athenas inline-block mt-8 text-sm">
          ← {t('instructor.title')}
        </Link>
      </div>
    </div>
  )
}
