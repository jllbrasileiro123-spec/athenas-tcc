import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

/**
 * Roteiro de teste com público-alvo (Atividade 8 do plano).
 * Lista as tarefas do protocolo + perguntas de entrevista pós-teste.
 */
export function UserTestProtocol() {
  const { t } = useLanguage()

  const tasks = [
    { n: '1', title: t('protocol.task1'), hint: t('protocol.task1Hint') },
    { n: '2', title: t('protocol.task2'), hint: t('protocol.task2Hint') },
    { n: '3', title: t('protocol.task3'), hint: t('protocol.task3Hint') },
    { n: '4', title: t('protocol.task4'), hint: t('protocol.task4Hint') },
    { n: '5', title: t('protocol.task5'), hint: t('protocol.task5Hint') },
    { n: '6', title: t('protocol.task6'), hint: t('protocol.task6Hint') },
  ] as const

  const interview = [
    t('protocol.interview1'),
    t('protocol.interview2'),
    t('protocol.interview3'),
    t('protocol.interview4'),
    t('protocol.interview5'),
  ] as const

  return (
    <div className="page-shell">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">{t('protocol.kicker')}</p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">{t('protocol.title')}</h1>
        <p className="mt-3 text-neutral-600">{t('protocol.desc')}</p>

        <section className="mt-8 card-athenas p-6">
          <h2 className="text-lg font-bold text-neutral-900">{t('protocol.tasksTitle')}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t('protocol.tasksHint')}</p>
          <ol className="mt-5 space-y-4">
            {tasks.map((task) => (
              <li key={task.n} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-bold text-brand-gold">
                  {task.n}
                </span>
                <div>
                  <p className="font-semibold text-neutral-900">{task.title}</p>
                  <p className="text-sm text-neutral-500">{task.hint}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 card-athenas p-6">
          <h2 className="text-lg font-bold text-neutral-900">{t('protocol.interviewTitle')}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t('protocol.interviewHint')}</p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-neutral-700">
            {interview.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6 card-athenas p-6">
          <h2 className="text-lg font-bold text-neutral-900">{t('protocol.metricsTitle')}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-700">
            <li>{t('protocol.metric1')}</li>
            <li>{t('protocol.metric2')}</li>
            <li>{t('protocol.metric3')}</li>
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/demo-video" className="btn-primary !px-5 !py-2.5">
            {t('protocol.openDemo')}
          </Link>
          <Link to="/pesquisa" className="btn-secondary !px-5 !py-2.5">
            {t('protocol.openSurvey')}
          </Link>
          <Link to="/explorar" className="btn-secondary !px-5 !py-2.5">
            {t('nav.explore')}
          </Link>
        </div>
      </div>
    </div>
  )
}
