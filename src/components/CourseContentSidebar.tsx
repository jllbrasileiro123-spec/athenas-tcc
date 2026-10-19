import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { MaterialLink } from './MaterialLink'
import { moduleShortTitle, type CourseModule, type ModuleItem } from '../lib/courseModules'
import { isLessonSequentiallyUnlocked, type TrailLesson } from '../lib/gamification'

type ItemType = 'aula' | 'exercicio' | 'quiz' | 'podcast'

function itemType(item: Pick<ModuleItem, 'item_kind' | 'content_type'>): ItemType {
  if (item.content_type === 'quiz' || item.content_type === 'simulado') return 'quiz'
  if (item.item_kind === 'tutorial') return 'exercicio'
  if (item.item_kind === 'podcast') return 'podcast'
  return 'aula'
}

function TypeIcon({ type }: { type: ItemType | 'material' }) {
  const common = {
    className: 'h-4 w-4 shrink-0',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (type) {
    case 'aula':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m10 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" />
        </svg>
      )
    case 'exercicio':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </svg>
      )
    case 'quiz':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.3" />
          <path d="M12 17h.01" />
        </svg>
      )
    case 'podcast':
      return (
        <svg {...common}>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <rect x="3" y="14" width="4" height="6" rx="1.5" />
          <rect x="17" y="14" width="4" height="6" rx="1.5" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      )
  }
}

function StatusBox({ done }: { done: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 ${
        done ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-neutral-300 bg-white'
      }`}
      aria-hidden
    >
      {done && (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  )
}

/**
 * Conteúdo do curso na lateral da aula, estilo Udemy: cada módulo é uma seção
 * que abre/fecha, com aula, exercício, quiz e material de apoio.
 */
export function CourseContentSidebar({
  courseId,
  modules,
  trailLessons,
  currentLessonId,
  currentModuleId,
  currentCompleted,
  isOwner,
}: {
  courseId: string
  modules: CourseModule[]
  trailLessons: TrailLesson[]
  currentLessonId: string
  currentModuleId: string | null
  currentCompleted: boolean
  isOwner: boolean
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentModuleId ? [currentModuleId] : []))

  // Ao trocar de aula, garante que o módulo dela esteja aberto
  useEffect(() => {
    if (!currentModuleId) return
    setOpen((prev) => (prev.has(currentModuleId) ? prev : new Set(prev).add(currentModuleId)))
  }, [currentModuleId])

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const typeLabel: Record<ItemType, string> = {
    aula: t('module.kindShortLesson'),
    exercicio: t('module.kindShortExercise'),
    quiz: t('module.kindShortQuiz'),
    podcast: t('module.kindShortPodcast'),
  }

  return (
    <div className="flex flex-col">
      {modules.map((mod, mi) => {
        const isOpen = open.has(mod.id)
        const isCurrent = mod.id === currentModuleId
        const locked = !isOwner && !mod.unlocked && !mod.completed
        const items = mod.items
        const doneCount = items.filter(
          (i) => i.completed || (i.id === currentLessonId && currentCompleted)
        ).length
        const minutes = items.reduce((sum, i) => sum + (i.duration_minutes || 0), 0)

        return (
          <section
            key={mod.id}
            data-current-module={isCurrent ? 'true' : undefined}
            className="border-b border-brand-line last:border-b-0"
          >
            <button
              type="button"
              onClick={() => toggle(mod.id)}
              aria-expanded={isOpen}
              className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors ${
                isCurrent ? 'bg-brand-gold-soft/50' : 'bg-brand-cream/60 hover:bg-brand-cream'
              }`}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[11px] font-extrabold uppercase tracking-[0.14em] ${
                    mod.completed ? 'text-emerald-800' : locked ? 'text-neutral-400' : 'text-brand-gold-ink'
                  }`}
                >
                  {t('module.label', { n: String(mi + 1) })}
                  {mod.completed ? ` · ${t('module.completed')}` : locked ? ` · ${t('module.locked')}` : ''}
                </span>
                <span
                  className={`mt-0.5 block text-sm font-extrabold leading-snug ${
                    locked ? 'text-neutral-400' : 'text-neutral-900'
                  }`}
                >
                  {moduleShortTitle(mod.title)}
                </span>
                <span className="mt-1 block text-xs font-semibold text-neutral-500">
                  {t('sidebar.moduleMeta', {
                    done: String(doneCount),
                    total: String(items.length),
                    min: String(minutes),
                  })}
                </span>
              </span>
              <svg
                className={`mt-1 h-4 w-4 shrink-0 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isOpen && (
              <ul className="flex flex-col py-1">
                {items.map((item) => {
                  const done = item.completed || (item.id === currentLessonId && currentCompleted)
                  const unlocked =
                    isOwner ||
                    trailLessons.length === 0 ||
                    isLessonSequentiallyUnlocked(trailLessons, item.id, { isOwner })
                  const active = item.id === currentLessonId
                  const type = itemType(item)
                  const inner = (
                    <>
                      <StatusBox done={done} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold leading-snug">
                          {item.title.replace(/^M\d+ · /, '')}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
                          <TypeIcon type={type} />
                          {typeLabel[type]}
                          {item.duration_minutes > 0 && ` · ${item.duration_minutes} min`}
                          {!unlocked && ` · ${t('trail.locked')}`}
                        </span>
                      </span>
                    </>
                  )
                  return (
                    <li key={item.id}>
                      {unlocked ? (
                        <Link
                          to={`/assistir/${courseId}/${item.id}`}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-start gap-3 border-l-4 px-5 py-2.5 ${
                            active
                              ? 'border-brand-gold bg-brand-gold-soft/60 text-neutral-900'
                              : 'border-transparent text-neutral-900 hover:bg-brand-cream'
                          }`}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <span className="flex items-start gap-3 border-l-4 border-transparent px-5 py-2.5 text-neutral-400">
                          {inner}
                        </span>
                      )}
                    </li>
                  )
                })}

                {mod.materials.map((material) => (
                  <li key={material.id} className="flex items-start gap-3 px-5 py-2.5">
                    <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center text-brand-gold-ink">
                      <TypeIcon type="material" />
                    </span>
                    <span className="min-w-0 flex-1">
                      {locked ? (
                        <span className="block text-[13px] font-bold leading-snug text-neutral-400">
                          {material.title}
                        </span>
                      ) : (
                        <MaterialLink
                          material={material}
                          className="block text-[13px] font-bold leading-snug text-neutral-900 underline decoration-brand-gold/50 underline-offset-2 hover:decoration-brand-gold"
                        />
                      )}
                      <span className="mt-1 block text-[11px] font-semibold text-neutral-500">
                        {t('sidebar.material')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
