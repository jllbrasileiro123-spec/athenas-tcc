import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import type { TranslationKey } from '../i18n/translations'

type DemoItem = {
  title: TranslationKey
  body: TranslationKey
  where: TranslationKey
  to?: string
  cta?: TranslationKey
  toSecondary?: string
  ctaSecondary?: TranslationKey
  adminOnly?: boolean
  teachPreferred?: boolean
}

const ITEMS: DemoItem[] = [
  {
    title: 'whatsNew.placementTitle',
    body: 'whatsNew.placementBody',
    where: 'whatsNew.placementWhere',
    to: '/demo-video',
    cta: 'footer.demoVideo',
  },
  {
    title: 'whatsNew.chatContextTitle',
    body: 'whatsNew.chatContextBody',
    where: 'whatsNew.chatContextWhere',
    to: '/explorar',
    cta: 'whatsNew.openExplore',
  },
  {
    title: 'whatsNew.doubtsTitle',
    body: 'whatsNew.doubtsBody',
    where: 'whatsNew.doubtsWhere',
    to: '/meus-cursos',
    cta: 'nav.myLearning',
  },
  {
    title: 'whatsNew.certificateTitle',
    body: 'whatsNew.certificateBody',
    where: 'whatsNew.certificateWhere',
    to: '/verificar',
    cta: 'footer.verify',
  },
  {
    title: 'whatsNew.surveyTitle',
    body: 'whatsNew.surveyBody',
    where: 'whatsNew.surveyWhere',
    to: '/pesquisa',
    cta: 'footer.survey',
  },
  {
    title: 'whatsNew.pwaTitle',
    body: 'whatsNew.pwaBody',
    where: 'whatsNew.pwaWhere',
    to: '/explorar',
    cta: 'whatsNew.openExplore',
  },
  {
    title: 'whatsNew.moderationTitle',
    body: 'whatsNew.moderationBody',
    where: 'whatsNew.moderationWhere',
    to: '/admin/moderacao',
    cta: 'whatsNew.openModeration',
    adminOnly: true,
  },
  {
    title: 'whatsNew.gamificationTitle',
    body: 'whatsNew.gamificationBody',
    where: 'whatsNew.gamificationWhere',
    to: '/explorar',
    cta: 'whatsNew.openExplore',
  },
  {
    title: 'whatsNew.athenaTitle',
    body: 'whatsNew.athenaBody',
    where: 'whatsNew.athenaWhere',
    to: '/explorar',
    cta: 'whatsNew.openExplore',
  },
  {
    title: 'whatsNew.googleTitle',
    body: 'whatsNew.googleBody',
    where: 'whatsNew.googleWhere',
  },
  {
    title: 'whatsNew.legalTitle',
    body: 'whatsNew.legalBody',
    where: 'whatsNew.legalWhere',
    to: '/termos',
    cta: 'whatsNew.openTerms',
    toSecondary: '/privacidade',
    ctaSecondary: 'whatsNew.openPrivacy',
  },
  {
    title: 'whatsNew.quizTitle',
    body: 'whatsNew.quizBody',
    where: 'whatsNew.quizWhere',
    to: '/instrutor/novo-curso',
    cta: 'whatsNew.openCreateCourse',
    toSecondary: '/meus-cursos',
    ctaSecondary: 'whatsNew.openMyCourses',
    teachPreferred: true,
  },
]

export function WhatsNew() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const canTeach = profile?.role === 'instructor' || profile?.role === 'admin'

  return (
    <div className="page-shell">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">
          {t('whatsNew.kicker')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{t('whatsNew.title')}</h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{t('whatsNew.desc')}</p>
        <Link to="/demo-video" className="btn-primary inline-flex mt-4 !px-4 !py-2 text-sm">
          {t('footer.demoVideo')}
        </Link>

        <ol className="mt-8 space-y-4">
          {ITEMS.map((item, index) => {
            const blockedAdmin = Boolean(item.adminOnly && !isAdmin)
            let primaryTo = item.to
            let primaryCta = item.cta
            let secondaryTo = item.toSecondary
            let secondaryCta = item.ctaSecondary

            if (item.teachPreferred && !canTeach) {
              primaryTo = '/meus-cursos'
              primaryCta = 'whatsNew.openMyCourses'
              secondaryTo = undefined
              secondaryCta = undefined
            }

            return (
              <li
                key={item.title}
                className="bg-white border border-brand-gold/20 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 h-8 w-8 rounded-full bg-neutral-950 text-brand-gold text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-neutral-900">{t(item.title)}</h2>
                    <p className="mt-1 text-sm text-neutral-600 leading-relaxed">{t(item.body)}</p>
                    <p className="mt-2 text-xs text-neutral-500">{t(item.where)}</p>

                    {blockedAdmin ? (
                      <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {t('whatsNew.adminHint')}
                      </p>
                    ) : (
                      (primaryTo && primaryCta) || (secondaryTo && secondaryCta) ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {primaryTo && primaryCta && (
                            <Link to={primaryTo} className="btn-primary !px-4 !py-2 text-xs">
                              {t(primaryCta)}
                            </Link>
                          )}
                          {secondaryTo && secondaryCta && (
                            <Link to={secondaryTo} className="btn-secondary !px-4 !py-2 text-xs">
                              {t(secondaryCta)}
                            </Link>
                          )}
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <Link to="/explorar" className="link-athenas inline-block mt-8 text-sm">
          ← {t('common.back')}
        </Link>
      </div>
    </div>
  )
}
