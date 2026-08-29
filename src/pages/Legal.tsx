import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import type { TranslationKey } from '../i18n/translations'

const TERMS_BODY: TranslationKey[] = [
  'legal.terms1',
  'legal.terms2',
  'legal.terms3',
  'legal.terms4',
]

const PRIVACY_BODY: TranslationKey[] = [
  'legal.privacy1',
  'legal.privacy2',
  'legal.privacy3',
  'legal.privacy4',
]

export function Legal({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t } = useLanguage()
  const title = kind === 'terms' ? t('legal.termsTitle') : t('legal.privacyTitle')
  const paragraphs = kind === 'terms' ? TERMS_BODY : PRIVACY_BODY

  return (
    <div className="page-shell">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">{title}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-neutral-700 bg-white border border-brand-gold/20 p-6 rounded-2xl">
          {paragraphs.map((key) => (
            <p key={key}>{t(key)}</p>
          ))}
        </div>
        <Link to="/explorar" className="link-athenas inline-block mt-6 text-sm">
          ← {t('common.back')}
        </Link>
      </div>
    </div>
  )
}
