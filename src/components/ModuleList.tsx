import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import type { TranslationKey } from '../i18n/translations'
import type { CourseModule, ModuleItem, ModuleItemKind, ModuleLevel } from '../lib/courseModules'

type ModuleListProps = {
  courseId: string
  modules: CourseModule[]
  /** Instrutor/dono enxerga tudo liberado */
  isOwner?: boolean
  /** Mostra o atalho para o teste de nivelamento nos módulos bloqueados */
  placementAvailable?: boolean
}

const KIND_LABEL: Record<ModuleItemKind, TranslationKey> = {
  explicacao: 'module.kindExplicacao',
  tutorial: 'module.kindTutorial',
  podcast: 'module.kindPodcast',
  exercicio: 'module.kindExercicio',
}

const LEVEL_LABEL: Record<ModuleLevel, TranslationKey> = {
  iniciante: 'level.beginner',
  intermediario: 'level.intermediate',
  avancado: 'level.advanced',
}

export function ModuleList({
  courseId,
  modules,
  isOwner = false,
  placementAvailable = false,
}: ModuleListProps) {
  const { t } = useLanguage()
  const firstOpen = modules.find((m) => (isOwner || m.unlocked) && !m.completed)
  const [openId, setOpenId] = useState<string | null>(firstOpen?.id ?? modules[0]?.id ?? null)

  if (modules.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600">{t('module.cascadeHint')}</p>

      {modules.map((mod, index) => {
        const unlocked = isOwner || mod.unlocked
        const open = openId === mod.id
        const pct =
          mod.required_total > 0
            ? Math.round((mod.required_done / mod.required_total) * 100)
            : 0

        return (
          <section
            key={mod.id}
            className={`rounded-2xl border bg-white overflow-hidden ${
              unlocked ? 'border-brand-gold/30' : 'border-neutral-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : mod.id)}
              className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-brand-gold-soft/20"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  mod.completed
                    ? 'bg-neutral-950 text-brand-gold'
                    : unlocked
                      ? 'bg-brand-gold-soft text-neutral-900'
                      : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {mod.completed ? '✓' : index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={`font-bold ${unlocked ? 'text-neutral-900' : 'text-neutral-400'}`}
                  >
                    {mod.title}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-950 text-brand-gold px-2 py-0.5 rounded-full">
                    {t(LEVEL_LABEL[mod.level])}
                  </span>
                  {mod.completed && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {t('module.completed')}
                    </span>
                  )}
                  {!unlocked && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      {t('module.locked')}
                    </span>
                  )}
                </span>

                {mod.description && (
                  <span className="mt-1 block text-sm text-neutral-500">{mod.description}</span>
                )}

                <span className="mt-2 block text-xs font-semibold text-neutral-500">
                  {t('module.progress', {
                    done: String(mod.required_done),
                    total: String(mod.required_total),
                  })}
                </span>
                <span className="mt-1 block h-1.5 rounded-full bg-brand-gold-soft overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-brand-gold transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </span>
              </span>
            </button>

            {open && (
              <div className="border-t border-neutral-100 px-5 py-4">
                {!unlocked ? (
                  <div className="space-y-3">
                    <p className="text-sm text-neutral-600">{t('module.lockedBody')}</p>
                    {placementAvailable && (
                      <Link
                        to={`/nivelamento/${courseId}`}
                        className="btn-secondary inline-flex !px-4 !py-2 text-sm"
                      >
                        {t('module.lockedPlacementCta')}
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {mod.items.map((item) => (
                        <ModuleItemRow
                          key={item.id}
                          courseId={courseId}
                          item={item}
                          kindLabel={t(KIND_LABEL[item.item_kind])}
                          optionalLabel={t('module.optional')}
                          viaPlacementLabel={t('trail.viaPlacement')}
                        />
                      ))}
                    </ul>

                    {mod.materials.length > 0 && (
                      <div className="mt-5 rounded-xl border border-brand-gold/20 bg-brand-gold-soft/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                          {t('module.materials')}
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {mod.materials.map((material) => (
                            <li key={material.id}>
                              {material.url.startsWith('/') && !material.url.startsWith('/demo') ? (
                                <Link to={material.url} className="link-athenas">
                                  {material.title}
                                </Link>
                              ) : (
                                <a
                                  href={material.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link-athenas"
                                >
                                  {material.title}
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function ModuleItemRow({
  courseId,
  item,
  kindLabel,
  optionalLabel,
  viaPlacementLabel,
}: {
  courseId: string
  item: ModuleItem
  kindLabel: string
  optionalLabel: string
  viaPlacementLabel: string
}) {
  return (
    <li>
      <Link
        to={`/assistir/${courseId}/${item.id}`}
        className="flex items-start gap-3 rounded-xl border border-neutral-200 px-3 py-2.5 hover:border-brand-gold/60 hover:bg-brand-gold-soft/20"
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            item.completed ? 'bg-neutral-950 text-brand-gold' : 'bg-neutral-100 text-neutral-500'
          }`}
        >
          {item.completed ? '✓' : ''}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-neutral-900">{item.title}</span>
          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-brand-gold">
            {kindLabel} · +{item.xp_reward} XP
            {!item.required && ` · ${optionalLabel}`}
          </span>
          {item.via_placement_test && (
            <span className="mt-0.5 block text-[10px] font-semibold text-emerald-700">
              {viaPlacementLabel}
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}
