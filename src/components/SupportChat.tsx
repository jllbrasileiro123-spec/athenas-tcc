import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { buildOtherSupportWhatsAppUrl, buildWhatsAppUrl } from '../lib/supportWhatsApp'

type Step = 'name' | 'topic' | 'detail' | 'done'

const topicKeys = [
  'support.topicAccount',
  'support.topicCourse',
  'support.topicTech',
  'support.topicOther',
] as const

export function SupportChat() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState(profile?.full_name ?? '')
  const [topic, setTopic] = useState('')
  const [detail, setDetail] = useState('')

  const supportLabels = useMemo(
    () => ({
      header: t('support.whatsappHeader'),
      body: t('support.directOtherBody'),
      labelName: t('support.labelName'),
      labelTopic: t('support.labelTopic'),
      labelEmail: t('support.labelEmail'),
      labelPhone: t('support.labelPhone'),
      topicOther: t('support.topicOther'),
    }),
    [t]
  )

  const directOtherUrl = useMemo(
    () =>
      buildOtherSupportWhatsAppUrl(supportLabels, {
        name: name.trim() || profile?.full_name || undefined,
        email: user?.email,
        phone: profile?.phone ?? undefined,
      }),
    [supportLabels, name, profile, user]
  )

  const whatsappUrl =
    step === 'done'
      ? buildWhatsAppUrl(
          [
            t('support.whatsappHeader'),
            `${t('support.labelName')}: ${name}`,
            `${t('support.labelTopic')}: ${topic}`,
            `${t('support.labelDetail')}: ${detail}`,
            user?.email ? `${t('support.labelEmail')}: ${user.email}` : '',
            profile?.phone ? `${t('support.labelPhone')}: ${profile.phone}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        )
      : null

  function onNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setStep('topic')
  }

  function pickTopic(key: (typeof topicKeys)[number]) {
    if (key === 'support.topicOther' && directOtherUrl) {
      window.open(directOtherUrl, '_blank', 'noopener,noreferrer')
      return
    }
    setTopic(t(key))
    setStep('detail')
  }

  function onDetailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!detail.trim()) return
    setStep('done')
  }

  return (
    <div className="space-y-3">
      {directOtherUrl ? (
        <a
          href={directOtherUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 text-center bg-[#25D366] text-white text-sm font-bold rounded-full hover:opacity-90"
        >
          <WhatsAppIcon />
          {t('support.directOther')}
        </a>
      ) : (
        <p className="alert-brand text-xs">
          {t('support.noWhatsApp')}
        </p>
      )}

      <p className="text-xs text-center text-neutral-400">{t('support.orDivider')}</p>

      <p className="text-xs text-neutral-600 leading-relaxed">{t('support.intro')}</p>

      {step === 'name' && (
        <form onSubmit={onNameSubmit} className="space-y-2">
          <label className="block text-xs font-bold text-neutral-700">{t('support.askName')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-athenas !rounded-xl !py-2"
            required
          />
          <button
            type="submit"
            className="btn-primary w-full !py-2"
          >
            {t('support.next')}
          </button>
        </form>
      )}

      {step === 'topic' && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-neutral-700">{t('support.askTopic')}</p>
          {topicKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => pickTopic(key)}
              className={`w-full text-left px-3 py-2 text-sm border rounded-xl hover:border-brand-gold hover:bg-brand-gold-soft/40 transition-colors ${
                key === 'support.topicOther'
                  ? 'border-[#25D366]/40 bg-green-50/80 font-semibold text-green-900'
                  : 'border-neutral-200'
              }`}
            >
              {t(key)}
              {key === 'support.topicOther' && directOtherUrl ? (
                <span className="block text-[10px] font-normal text-green-700 mt-0.5">
                  {t('support.directOther')}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {step === 'detail' && (
        <form onSubmit={onDetailSubmit} className="space-y-2">
          <label className="block text-xs font-bold text-neutral-700">{t('support.askDetail')}</label>
          <textarea
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="input-athenas !rounded-xl !py-2 resize-none"
            required
          />
          <button
            type="submit"
            className="btn-primary w-full !py-2"
          >
            {t('support.finish')}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-3">
          <p className="alert-brand text-xs">
            {t('support.done')}
          </p>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-center bg-[#25D366] text-white text-sm font-bold rounded-full hover:opacity-90"
            >
              <WhatsAppIcon />
              {t('support.sendWhatsApp')}
            </a>
          ) : (
            <p className="alert-brand text-xs">
              {t('support.noWhatsApp')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
