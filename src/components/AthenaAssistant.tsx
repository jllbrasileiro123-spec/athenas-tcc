import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  getContextualSuggestions,
  resolveAssistantTurn,
  saveAssistantFeedback,
  type AssistantAction,
  type AssistantResult,
} from '../lib/assistantReplies'
import { askLessonQuestion, isMissingQuestions } from '../lib/lessonQuestions'
import { buildOtherSupportWhatsAppUrl } from '../lib/supportWhatsApp'
import { AthenaMark } from './AthenaMark'

type Role = 'user' | 'assistant'

interface Message {
  id: string
  role: Role
  text: string
  actions?: AssistantAction[]
  followups?: string[]
  feedback?: 'up' | 'down' | null
}

function welcomeMessage(text: string, followups: string[]): Message {
  return { id: 'welcome', role: 'assistant', text, followups, feedback: null }
}

const chipClass =
  'w-full text-left text-xs text-neutral-100 bg-transparent border border-brand-gold/45 rounded-full px-3.5 py-2 hover:bg-brand-gold/10 hover:border-brand-gold transition-colors'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export function AthenaAssistant({
  forceExpanded = false,
  dock = false,
  onClose,
}: {
  forceExpanded?: boolean
  /** Painel flutuante (FAB no Layout) */
  dock?: boolean
  onClose?: () => void
} = {}) {
  const { user, profile, resetPassword } = useAuth()
  const { t, language } = useLanguage()
  const location = useLocation()

  const supportUrl = useMemo(
    () =>
      buildOtherSupportWhatsAppUrl(
        {
          header: t('support.whatsappHeader'),
          body: t('support.directOtherBody'),
          labelName: t('support.labelName'),
          labelTopic: t('support.labelTopic'),
          labelEmail: t('support.labelEmail'),
          labelPhone: t('support.labelPhone'),
          topicOther: t('support.topicOther'),
        },
        {
          name: profile?.full_name ?? undefined,
          email: user?.email,
          phone: profile?.phone ?? undefined,
        }
      ),
    [t, user, profile]
  )

  const contextual = useMemo(
    () => getContextualSuggestions(location.pathname, language),
    [location.pathname, language]
  )

  const [messages, setMessages] = useState<Message[]>(() => [
    welcomeMessage(t('assistant.welcome'), contextual),
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [lastTopic, setLastTopic] = useState<string | null>(null)
  const [resetEmail, setResetEmail] = useState(user?.email ?? '')
  const [resetStatus, setResetStatus] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(() =>
    forceExpanded || dock
      ? true
      : typeof window === 'undefined'
        ? true
        : window.matchMedia('(min-width: 1024px)').matches
  )
  const canSend = input.trim().length > 0 && !typing
  const showBody = forceExpanded || dock || expanded

  useEffect(() => {
    setMessages([welcomeMessage(t('assistant.welcome'), getContextualSuggestions(location.pathname, language))])
    setInput('')
    setLastTopic(null)
    setResetStatus(null)
  }, [language, t, location.pathname])

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || typing) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setTyping(true)
    setResetStatus(null)
    scrollToBottom()

    await sleep(550 + Math.floor(Math.random() * 350))

    const result: AssistantResult = await resolveAssistantTurn(trimmed, {
      lang: language,
      lastTopic,
      pathname: location.pathname,
      userId: user?.id ?? null,
      history: messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.text })),
    })

    setLastTopic(result.topic)
    const botMsg: Message = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: result.text,
      actions: result.actions,
      followups: result.followups,
      feedback: null,
    }
    setMessages((prev) => [...prev, botMsg])
    setTyping(false)
    scrollToBottom()
  }

  function clearChat() {
    setMessages([welcomeMessage(t('assistant.welcome'), contextual)])
    setInput('')
    setLastTopic(null)
    setTyping(false)
    setResetStatus(null)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void sendMessage(input)
  }

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault()
    if (!resetEmail.includes('@')) {
      setResetStatus(t('login.emailInvalid'))
      return
    }
    setResetLoading(true)
    const { error } = await resetPassword(resetEmail.trim())
    setResetLoading(false)
    setResetStatus(error ?? t('forgot.sentTitle'))
  }

  function vote(messageId: string, vote: 'up' | 'down', text: string) {
    saveAssistantFeedback({ messageId, vote, text })
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedback: vote } : m)))
  }

  const showStarterChips = messages.length <= 1 && !typing
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')

  const panel = (
      <div
        className={`rounded-2xl border border-brand-gold/25 bg-neutral-950 text-white p-4 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45)] ring-1 ring-white/5 flex flex-col ${
          dock
            ? 'h-[min(70dvh,560px)] w-[min(100vw-1.5rem,360px)]'
            : 'max-h-[min(70dvh,640px)] lg:max-h-[min(80vh,640px)]'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-3 shrink-0">
          <button
            type="button"
            className={`flex items-center gap-3 text-left ${forceExpanded || dock ? '' : 'lg:pointer-events-none'}`}
            onClick={() => {
              if (dock && onClose) onClose()
              else if (!forceExpanded) setExpanded((v) => !v)
            }}
            aria-expanded={showBody}
          >
            <AthenaMark framed variant="header" className="h-14 w-14 lg:h-[72px] lg:w-[72px]" alt="Athena" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold">Athena</p>
              <h3 className="font-bold text-base leading-tight">{t('assistant.title')}</h3>
              {!forceExpanded && !dock && (
                <p className="lg:hidden text-[11px] text-neutral-400 mt-0.5">
                  {expanded ? t('assistant.close') : t('assistant.open')}
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 1 && showBody && (
              <button
                type="button"
                onClick={clearChat}
                className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 hover:text-brand-gold"
              >
                {t('assistant.clear')}
              </button>
            )}
            {(dock || !forceExpanded) && (
              <button
                type="button"
                className={`h-8 w-8 rounded-full text-brand-gold hover:bg-white/10 ${dock ? '' : 'lg:hidden'}`}
                onClick={() => {
                  if (dock && onClose) onClose()
                  else setExpanded((v) => !v)
                }}
                aria-label={showBody ? t('assistant.close') : t('assistant.open')}
              >
                {dock ? '×' : showBody ? '–' : '+'}
              </button>
            )}
          </div>
        </div>
        <p className={`text-xs text-neutral-400 mb-3 shrink-0 ${showBody ? '' : 'hidden lg:block'}`}>
          {t('assistant.subtitle')}
        </p>

        <div className={showBody ? 'contents' : 'hidden lg:contents'}>
        <div
          ref={listRef}
          className="flex-1 min-h-[140px] overflow-y-auto space-y-3 pr-1 mb-3 rounded-lg bg-black/40 p-2"
        >
          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              <div
                className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start items-end'}`}
              >
                {m.role === 'assistant' && (
                  <AthenaMark framed variant="mensagem" className="mb-0.5" alt="" />
                )}
                <div
                  className={`text-xs leading-relaxed px-3 py-2.5 rounded-xl max-w-[88%] whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'bg-neutral-800 text-neutral-50 shadow-sm ring-1 ring-white/5'
                  }`}
                >
                  {m.text}
                </div>
              </div>

              {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                <div className="ml-12 max-w-[88%] space-y-2">
                  {m.actions.map((action, i) => (
                    <ActionBlock
                      key={`${m.id}-a-${i}`}
                      action={action}
                      supportUrl={supportUrl}
                      resetEmail={resetEmail}
                      resetStatus={resetStatus}
                      resetLoading={resetLoading}
                      onResetEmail={setResetEmail}
                      onPasswordReset={handlePasswordReset}
                      lang={language}
                      userId={user?.id ?? null}
                    />
                  ))}
                </div>
              )}

              {m.role === 'assistant' && m.id !== 'welcome' && (
                <div className="flex items-center gap-3 ml-12">
                  {m.feedback ? (
                    <span className="text-[10px] uppercase tracking-wider text-brand-gold/80">
                      {language === 'pt' ? 'Obrigado pelo retorno' : 'Thanks for the feedback'}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => vote(m.id, 'up', m.text)}
                        className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-brand-gold transition-colors"
                      >
                        {language === 'pt' ? 'Ajudou' : 'Helpful'}
                      </button>
                      <button
                        type="button"
                        onClick={() => vote(m.id, 'down', m.text)}
                        className="text-[10px] uppercase tracking-wider text-neutral-500 hover:text-brand-gold transition-colors"
                      >
                        {language === 'pt' ? 'Não ajudou' : 'Not helpful'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {typing && (
            <div className="flex items-end gap-2">
              <AthenaMark framed variant="mensagem" alt="" />
              <div className="bg-neutral-800 text-neutral-300 text-xs px-3 py-2.5 rounded-xl inline-flex items-center gap-1.5 ring-1 ring-white/5 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse [animation-delay:300ms]" />
                <span className="ml-1 text-neutral-400">{language === 'pt' ? 'Athena está digitando…' : 'Athena is typing…'}</span>
              </div>
            </div>
          )}
        </div>

        {showStarterChips && (
          <div className="mb-3 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gold mb-2">
              {t('assistant.suggestions')}
            </p>
            <ul className="space-y-2">
              {contextual.map((label) => (
                <li key={label}>
                  <button type="button" onClick={() => void sendMessage(label)} className={chipClass}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!showStarterChips && !typing && lastAssistant?.followups && lastAssistant.followups.length > 0 && (
          <div className="mb-3 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gold/80 mb-2">
              {language === 'pt' ? 'Continuar' : 'Follow up'}
            </p>
            <ul className="flex flex-wrap gap-2">
              {lastAssistant.followups.map((label) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => void sendMessage(label)}
                    className="text-[11px] text-neutral-100 border border-brand-gold/40 rounded-full px-3 py-1.5 hover:bg-brand-gold/10 transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('assistant.placeholder')}
            disabled={typing}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-full bg-neutral-900 border border-neutral-600 text-base text-white placeholder:text-neutral-500 outline-none focus:border-brand-gold disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!canSend}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-colors ${
              canSend
                ? 'bg-brand-gold text-neutral-950 hover:brightness-110'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
            }`}
          >
            {t('assistant.send')}
          </button>
        </form>
        </div>
      </div>
  )

  if (dock) {
    return panel
  }

  return <aside className="lg:sticky lg:top-20 z-10">{panel}</aside>
}

function ActionBlock({
  action,
  supportUrl,
  resetEmail,
  resetStatus,
  resetLoading,
  onResetEmail,
  onPasswordReset,
  lang,
  userId,
}: {
  action: AssistantAction
  supportUrl: string | null
  resetEmail: string
  resetStatus: string | null
  resetLoading: boolean
  onResetEmail: (v: string) => void
  onPasswordReset: (e: FormEvent) => void
  lang: 'pt' | 'en'
  userId: string | null
}) {
  if (action.kind === 'navigate') {
    return (
      <Link to={action.to} className="inline-flex btn-primary !py-2 !text-xs">
        {action.label}
      </Link>
    )
  }

  if (action.kind === 'support') {
    if (!supportUrl) return null
    return (
      <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex btn-secondary !py-2 !text-xs">
        {lang === 'pt' ? 'Abrir suporte no WhatsApp' : 'Open WhatsApp support'}
      </a>
    )
  }

  if (action.kind === 'course_cards') {
    return (
      <div className="space-y-2">
        {action.courses.map((c) => (
          <Link
            key={c.id}
            to={`/curso/${c.id}`}
            className="block rounded-xl border border-brand-gold/35 bg-neutral-900/80 px-3 py-2 hover:border-brand-gold transition-colors"
          >
            <p className="text-xs font-bold text-neutral-50">{c.title}</p>
            <p className="text-[11px] text-brand-gold mt-0.5">
              {c.price > 0 ? `R$ ${c.price.toFixed(2)}` : lang === 'pt' ? 'Grátis' : 'Free'}
              {' · '}
              {lang === 'pt' ? 'Ver / matricular' : 'View / enroll'}
            </p>
          </Link>
        ))}
      </div>
    )
  }

  if (action.kind === 'ask_instructor') {
    if (!userId) return null
    return (
      <AskInstructorForm
        courseId={action.courseId}
        lessonId={action.lessonId}
        userId={userId}
        lang={lang}
      />
    )
  }

  if (action.kind === 'password_form') {
    return (
      <form onSubmit={onPasswordReset} className="rounded-xl border border-brand-gold/35 bg-neutral-900/80 p-3 space-y-2">
        <label className="block text-[11px] text-neutral-400">
          {lang === 'pt' ? 'E-mail da conta' : 'Account email'}
        </label>
        <input
          type="email"
          value={resetEmail}
          onChange={(e) => onResetEmail(e.target.value)}
          className="w-full rounded-full bg-neutral-950 border border-neutral-600 px-3 py-2 text-xs text-white outline-none focus:border-brand-gold"
          required
        />
        <button type="submit" disabled={resetLoading} className="btn-primary !py-2 !text-xs w-full">
          {resetLoading
            ? lang === 'pt'
              ? 'Enviando…'
              : 'Sending…'
            : lang === 'pt'
              ? 'Enviar link de recuperação'
              : 'Send reset link'}
        </button>
        {resetStatus && <p className="text-[11px] text-brand-gold">{resetStatus}</p>}
      </form>
    )
  }

  return null
}

/** Encaminha a dúvida do chat para o instrutor dono do curso (Atividade 7) */
function AskInstructorForm({
  courseId,
  lessonId,
  userId,
  lang,
}: {
  courseId: string
  lessonId: string | null
  userId: string
  lang: 'pt' | 'en'
}) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    setStatus(null)
    const { error } = await askLessonQuestion({ courseId, lessonId, userId, body })
    setSending(false)

    if (error) {
      setStatus(
        isMissingQuestions(error)
          ? lang === 'pt'
            ? 'Rode supabase/atividades-5-a-8.sql no Supabase para ativar as dúvidas.'
            : 'Run supabase/atividades-5-a-8.sql in Supabase to enable questions.'
          : error
      )
      return
    }
    setDone(true)
    setBody('')
    setStatus(
      lang === 'pt'
        ? 'Dúvida enviada ao instrutor. A resposta aparece na aula.'
        : 'Question sent to the instructor. The reply shows up on the lesson.'
    )
  }

  if (done) {
    return (
      <div className="rounded-xl border border-brand-gold/35 bg-neutral-900/80 p-3 space-y-2">
        <p className="text-[11px] text-brand-gold">{status}</p>
        <Link to={`/curso/${courseId}`} className="inline-flex btn-secondary !py-1.5 !text-[11px]">
          {lang === 'pt' ? 'Abrir a formação' : 'Open the program'}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-brand-gold/35 bg-neutral-900/80 p-3 space-y-2">
      <p className="text-[11px] font-bold text-neutral-200">
        {lang === 'pt' ? 'Perguntar ao instrutor do curso' : 'Ask the course instructor'}
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={600}
        placeholder={lang === 'pt' ? 'Escreva sua dúvida…' : 'Write your question…'}
        className="w-full rounded-lg bg-neutral-950 border border-neutral-600 px-3 py-2 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-brand-gold resize-y"
      />
      <button
        type="submit"
        disabled={sending || !body.trim()}
        className="btn-primary !py-2 !text-xs w-full disabled:opacity-50"
      >
        {sending
          ? lang === 'pt'
            ? 'Enviando…'
            : 'Sending…'
          : lang === 'pt'
            ? 'Enviar dúvida'
            : 'Send question'}
      </button>
      {status && <p className="text-[11px] text-brand-gold">{status}</p>}
    </form>
  )
}
