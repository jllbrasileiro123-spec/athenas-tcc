import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import type { TranslationKey } from '../i18n/translations'
import { getAssistantReply } from '../lib/assistantReplies'
import { buildOtherSupportWhatsAppUrl } from '../lib/supportWhatsApp'

const suggestionKeys: TranslationKey[] = ['assistant.q1', 'assistant.q2', 'assistant.q3']

type Role = 'user' | 'assistant'

interface Message {
  id: string
  role: Role
  text: string
}

export function AthenaAssistant() {
  const { user, profile } = useAuth()
  const { t, language } = useLanguage()

  const otherWhatsAppUrl = useMemo(
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
          name: profile?.full_name,
          email: user?.email,
          phone: profile?.phone ?? undefined,
        }
      ),
    [t, user, profile]
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: t('assistant.welcome'),
      },
    ])
  }, [language, t])

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: trimmed }
    const botMsg: Message = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: getAssistantReply(trimmed, language),
    }

    setMessages((prev) => [...prev, userMsg, botMsg])
    setInput('')
    scrollToBottom()
  }

  function clearChat() {
    setMessages([{ id: 'welcome', role: 'assistant', text: t('assistant.welcome') }])
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  const showSuggestions = messages.length <= 1

  return (
    <aside className="sticky top-20">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 text-white p-4 shadow-lg flex flex-col max-h-[min(75vh,560px)]">
        <div className="flex items-start justify-between gap-2 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-950 text-xs font-bold">
              AI
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Athena</p>
              <h3 className="font-bold text-base leading-tight">{t('assistant.title')}</h3>
            </div>
          </div>
          {messages.length > 1 && (
            <button
              type="button"
              onClick={clearChat}
              className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 hover:text-white shrink-0"
            >
              {t('assistant.clear')}
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-400 mb-3 shrink-0">{t('assistant.subtitle')}</p>

        <div
          ref={listRef}
          className="flex-1 min-h-[120px] overflow-y-auto space-y-2 pr-1 mb-3 rounded-lg bg-neutral-900/50 p-2"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`text-xs leading-relaxed px-2.5 py-2 rounded-lg max-w-[95%] ${
                m.role === 'user'
                  ? 'ml-auto bg-white text-neutral-900'
                  : 'mr-auto bg-neutral-800 text-neutral-100'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        {showSuggestions && (
          <div className="mb-3 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
              {t('assistant.suggestions')}
            </p>
            <ul className="space-y-1.5">
              {suggestionKeys.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => sendMessage(t(key))}
                    className="w-full text-left text-xs text-neutral-200 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 hover:bg-neutral-800 hover:border-neutral-500 transition-colors"
                  >
                    {t(key)}
                  </button>
                </li>
              ))}
              {otherWhatsAppUrl ? (
                <li>
                  <a
                    href={otherWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-left text-xs text-neutral-200 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 hover:bg-neutral-800 hover:border-neutral-500 transition-colors"
                  >
                    {t('assistant.qOther')}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex gap-2 shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('assistant.placeholder')}
            className="flex-1 min-w-0 px-3 py-2 rounded-full bg-neutral-900 border border-neutral-700 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="shrink-0 px-4 py-2 rounded-full bg-white text-neutral-950 text-xs font-bold hover:bg-neutral-200 disabled:opacity-40"
          >
            {t('assistant.send')}
          </button>
        </form>
      </div>
    </aside>
  )
}
