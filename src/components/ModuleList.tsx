import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import {
  moduleShortTitle,
  moduleTopics,
  type CourseModule,
  type ModuleItem,
} from '../lib/courseModules'
import { MaterialLink } from './MaterialLink'

type ModuleListProps = {
  courseId: string
  modules: CourseModule[]
  /** Instrutor/dono enxerga tudo liberado */
  isOwner?: boolean
  /** Mostra o atalho para o teste de nivelamento nos módulos bloqueados */
  placementAvailable?: boolean
}

type ItemState = 'done' | 'open' | 'locked'
type ModuleState = 'done' | 'current' | 'locked'

/** Dentro de um módulo liberado, cada item abre quando os obrigatórios anteriores estão feitos. */
function itemStates(mod: CourseModule, unlocked: boolean, isOwner: boolean): ItemState[] {
  let previousDone = true
  return mod.items.map((item) => {
    const state: ItemState = item.completed
      ? 'done'
      : unlocked && (isOwner || previousDone)
        ? 'open'
        : 'locked'
    if (item.required && !item.completed) previousDone = false
    return state
  })
}

export function ModuleList({
  courseId,
  modules,
  isOwner = false,
  placementAvailable = false,
}: ModuleListProps) {
  const { t } = useLanguage()
  // Só o módulo em andamento abre sozinho; os outros ficam numa linha e abrem no clique
  const [openId, setOpenId] = useState<string | null>(
    () => modules.find((m) => (isOwner || m.unlocked) && !m.completed)?.id ?? null
  )

  if (modules.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {modules.map((mod, index) => {
        const unlocked = isOwner || mod.unlocked
        const state: ModuleState = mod.completed ? 'done' : unlocked ? 'current' : 'locked'
        const topics = moduleTopics(mod.description)
        const states = itemStates(mod, unlocked, isOwner)
        const open = openId === mod.id

        return (
          <article
            key={mod.id}
            className={`overflow-hidden rounded-[20px] bg-white ${
              state === 'current'
                ? 'border-2 border-brand-gold'
                : 'border border-brand-line'
            } ${state === 'locked' ? 'opacity-80' : ''}`}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : mod.id)}
              aria-expanded={open}
              className={`flex w-full items-center gap-4 px-5 text-left sm:px-6 ${open ? 'py-5' : 'py-4'} hover:bg-brand-cream/50`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] font-display text-2xl font-bold sm:h-[52px] sm:w-[52px] ${
                  state === 'done'
                    ? 'bg-brand-gold text-neutral-950'
                    : state === 'current'
                      ? 'bg-neutral-950 text-brand-gold-light'
                      : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">
                  {t('module.label', { n: String(index + 1) })}
                </p>
                <h3 className="mt-0.5 text-base font-extrabold leading-snug text-neutral-900 sm:text-lg">
                  {moduleShortTitle(mod.title)}
                </h3>
              </div>
              <span
                className={`hidden shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold sm:inline-block ${
                  state === 'done'
                    ? 'bg-emerald-50 text-emerald-800'
                    : state === 'current'
                      ? 'bg-brand-gold-soft text-brand-gold-ink'
                      : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {state === 'done'
                  ? t('module.completed')
                  : state === 'current'
                    ? t('module.inProgress')
                    : t('module.locked')}
              </span>
              <svg
                className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {open && topics.length > 0 && (
              <div className="flex flex-col gap-2 px-5 pb-4 sm:pl-[94px] sm:pr-6">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-gold-ink">
                  {t('module.topics')}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-[10px] border border-brand-line bg-brand-cream px-3 py-1.5 text-[13px] font-semibold text-neutral-700"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {open && (
            <div className="border-t border-[#f0eadb] px-5 pb-3 pt-2 sm:pl-[94px] sm:pr-6">
              <ul className="flex flex-col">
                {mod.items.map((item, i) => (
                  <ModuleItemRow key={item.id} courseId={courseId} item={item} state={states[i]} />
                ))}
              </ul>

              {!unlocked && (
                <div className="mb-2 mt-1 flex flex-col gap-3 rounded-xl bg-neutral-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-600">{t('module.lockedBody')}</p>
                  {placementAvailable && (
                    <Link
                      to={`/nivelamento/${courseId}`}
                      className="btn-secondary shrink-0 !px-4 !py-2 text-sm"
                    >
                      {t('module.lockedPlacementCta')}
                    </Link>
                  )}
                </div>
              )}

              {unlocked && mod.materials.length > 0 && (
                <div className="mb-2 mt-2 rounded-xl border border-brand-line bg-brand-cream/60 p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-neutral-700">
                    {t('module.materials')}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {mod.materials.map((material) => (
                      <li key={material.id}>
                        <MaterialLink material={material} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function ModuleItemRow({
  courseId,
  item,
  state,
}: {
  courseId: string
  item: ModuleItem
  state: ItemState
}) {
  const { t } = useLanguage()
  const isQuiz = item.content_type !== 'lesson'
  const kind = isQuiz
    ? t('module.kindShortQuiz')
    : item.item_kind === 'podcast'
      ? t('module.kindShortPodcast')
      : t('module.kindShortLesson')
  const meta = [
    kind,
    !isQuiz && item.duration_minutes > 0 ? `${item.duration_minutes} min` : null,
    `+${item.xp_reward} XP`,
    !item.required ? t('module.optional') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const body = (
    <>
      <span
        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${
          state === 'done'
            ? 'bg-brand-gold text-neutral-950'
            : state === 'open'
              ? 'bg-brand-gold-soft text-neutral-950'
              : 'bg-neutral-100 text-neutral-400'
        }`}
      >
        {state === 'done' ? <IconCheck /> : state === 'open' ? <IconPlay /> : <IconLock />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[15px] font-bold ${
            state === 'locked' ? 'text-neutral-400' : 'text-neutral-900'
          }`}
        >
          {item.title}
        </span>
        <span className="block text-xs font-semibold text-neutral-500">{meta}</span>
        {item.via_placement_test && (
          <span className="block text-xs font-semibold text-emerald-700">
            {t('trail.viaPlacement')}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 text-xs font-bold ${
          state === 'done'
            ? 'text-emerald-800'
            : state === 'open'
              ? 'text-brand-gold-ink'
              : 'text-neutral-400'
        }`}
      >
        {state === 'done'
          ? t('trail.itemDone')
          : state === 'open'
            ? t('trail.itemStart')
            : t('trail.itemLocked')}
      </span>
    </>
  )

  return (
    <li>
      {state === 'locked' ? (
        <div className="flex items-center gap-3.5 py-2.5">{body}</div>
      ) : (
        <Link
          to={`/assistir/${courseId}/${item.id}`}
          className="-mx-2 flex items-center gap-3.5 rounded-xl px-2 py-2.5 hover:bg-brand-cream"
        >
          {body}
        </Link>
      )}
    </li>
  )
}

function IconCheck() {
  return (
    <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg className="h-[13px] w-[13px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4.5v15l12-7.5Z" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
