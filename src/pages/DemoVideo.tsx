import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { AthenaAssistant } from '../components/AthenaAssistant'
import { seedDemoContentForUser, type SeededCourse } from '../lib/seedDemoContent'

export function DemoVideo() {
  const { t } = useLanguage()
  const { user, profile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courses, setCourses] = useState<SeededCourse[] | null>(null)
  const [placementReady, setPlacementReady] = useState(true)

  const canTeach = profile?.role === 'instructor' || profile?.role === 'admin'

  async function publishDemo() {
    if (!user) return
    setBusy(true)
    setError(null)
    const result = await seedDemoContentForUser(user.id)
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? t('demoLab.seedFail'))
      return
    }
    setCourses(result.courses)
    setPlacementReady(result.placementReady)
  }

  return (
    <div className="page-shell">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold mb-2">
          {t('demoLab.kicker')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">{t('demoLab.title')}</h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed max-w-2xl">{t('demoLab.desc')}</p>

        <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
          <div className="space-y-6">
            <section className="bg-white border border-brand-gold/20 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="font-bold text-neutral-900">{t('demoLab.publishTitle')}</h2>
              <p className="text-sm text-neutral-600">{t('demoLab.publishBody')}</p>

              {!canTeach ? (
                <div className="space-y-3">
                  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    {t('demoLab.needInstructor')}
                  </p>
                  <Link to="/tornar-se-instrutor" className="btn-primary inline-flex !px-4 !py-2 text-sm">
                    {t('menu.becomeInstructor')}
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void publishDemo()}
                  className="btn-primary !px-4 !py-3 text-sm"
                >
                  {busy ? t('demoLab.publishing') : t('demoLab.publishCta')}
                </button>
              )}

              {error && <p className="alert-error text-sm">{error}</p>}

              {courses && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 space-y-4">
                  <p className="text-sm font-semibold text-green-900">{t('demoLab.seedOk')}</p>

                  {!placementReady && (
                    <p className="alert-brand text-xs">{t('placement.missingTable')}</p>
                  )}

                  {courses.map((course) => (
                    <div key={course.id} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-neutral-900">{course.title}</p>
                        <div className="flex flex-wrap gap-2">
                          {placementReady && (
                            <Link
                              to={`/nivelamento/${course.id}`}
                              className="btn-primary !px-3 !py-1.5 text-xs"
                            >
                              {t('placement.shortCta')}
                            </Link>
                          )}
                          <Link
                            to={`/curso/${course.id}`}
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                          >
                            {t('demoLab.openCourse')}
                          </Link>
                        </div>
                      </div>
                      <ul className="space-y-2">
                        {course.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <Link
                              to={`/assistir/${course.id}/${lesson.id}`}
                              className="flex items-center justify-between gap-3 rounded-xl border border-brand-gold/30 bg-white px-3 py-2.5 hover:border-brand-gold transition-colors"
                            >
                              <span className="text-xs font-semibold text-neutral-900">
                                {lesson.title}
                              </span>
                              <span className="text-xs font-bold text-brand-gold shrink-0">
                                {lesson.contentType === 'quiz'
                                  ? t('demoLab.openQuiz')
                                  : t('demoLab.watchLesson')}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link to="/meus-cursos?view=teaching" className="btn-secondary !px-3 !py-2 text-xs">
                      {t('demoLab.openTeaching')}
                    </Link>
                    <Link to="/explorar" className="btn-secondary !px-3 !py-2 text-xs">
                      {t('demoLab.openCatalog')}
                    </Link>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white border border-brand-gold/20 rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-neutral-900 mb-3">{t('demoLab.interactTitle')}</h2>
              <ul className="space-y-3">
                <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t('demoLab.chatTitle')}</p>
                    <p className="text-xs text-neutral-500">{t('demoLab.chatBody')}</p>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-gold">
                    {t('demoLab.chatHint')}
                  </p>
                </li>
                <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t('demoLab.newsTitle')}</p>
                    <p className="text-xs text-neutral-500">{t('demoLab.newsBody')}</p>
                  </div>
                  <Link to="/novidades" className="btn-secondary !px-3 !py-2 text-xs shrink-0">
                    {t('footer.whatsNew')}
                  </Link>
                </li>
                <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t('demoLab.videoTitle')}</p>
                    <p className="text-xs text-neutral-500">{t('demoLab.videoBody')}</p>
                  </div>
                </li>
                <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t('demoLab.streakTitle')}</p>
                    <p className="text-xs text-neutral-500">{t('demoLab.streakBody')}</p>
                  </div>
                </li>
                <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {t('demoLab.placementTitle')}
                    </p>
                    <p className="text-xs text-neutral-500">{t('demoLab.placementBody')}</p>
                  </div>
                </li>
              </ul>

              <div className="mt-5 aspect-video overflow-hidden rounded-2xl border border-brand-gold/20 bg-black">
                <video
                  src="/demo/athenas-demo.mp4"
                  controls
                  playsInline
                  className="h-full w-full"
                  controlsList="nodownload"
                >
                  <track kind="captions" />
                </video>
              </div>
            </section>
          </div>

          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 lg:hidden">
              {t('demoLab.chatTitle')}
            </p>
            <AthenaAssistant forceExpanded />
          </div>
        </div>

        <Link to="/explorar" className="link-athenas inline-block mt-8 text-sm">
          ← {t('common.back')}
        </Link>
      </div>
    </div>
  )
}
