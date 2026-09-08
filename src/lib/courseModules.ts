import { supabase } from './supabase'
import type { LessonContentType } from './gamification'

/** Papel do item dentro do módulo (plano: explicação, tutorial, podcast, exercício) */
export type ModuleItemKind = 'explicacao' | 'tutorial' | 'podcast' | 'exercicio'

export type ModuleLevel = 'iniciante' | 'intermediario' | 'avancado'

export type ModuleItem = {
  id: string
  title: string
  description: string | null
  item_kind: ModuleItemKind
  content_type: LessonContentType
  video_url: string | null
  audio_url: string | null
  duration_minutes: number
  xp_reward: number
  sort_order: number
  /** Podcast é reforço: não é exigido para concluir o módulo */
  required: boolean
  completed: boolean
  via_placement_test: boolean
}

export type ModuleMaterial = {
  id: string
  title: string
  url: string
  kind: 'pdf' | 'apostila' | 'link' | 'slide'
}

export type CourseModule = {
  id: string
  title: string
  description: string | null
  level: ModuleLevel
  sort_order: number
  unlocked_by_default: boolean
  unlocked: boolean
  completed: boolean
  required_total: number
  required_done: number
  next_item_id: string | null
  items: ModuleItem[]
  materials: ModuleMaterial[]
}

/** A formação ainda não tem módulos, ou o SQL de módulos não foi aplicado. */
export function isMissingModules(message: string | undefined | null): boolean {
  if (!message) return false
  return (
    message.includes('get_course_modules') ||
    message.includes('course_modules') ||
    message.includes('schema cache')
  )
}

const KINDS: ModuleItemKind[] = ['explicacao', 'tutorial', 'podcast', 'exercicio']
const LEVELS: ModuleLevel[] = ['iniciante', 'intermediario', 'avancado']

function asItem(raw: Record<string, unknown>): ModuleItem {
  const kind = String(raw.item_kind ?? 'explicacao') as ModuleItemKind
  const contentType = String(raw.content_type ?? 'lesson')
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: (raw.description as string | null) ?? null,
    item_kind: KINDS.includes(kind) ? kind : 'explicacao',
    content_type:
      contentType === 'quiz' || contentType === 'simulado' ? contentType : 'lesson',
    video_url: (raw.video_url as string | null) ?? null,
    audio_url: (raw.audio_url as string | null) ?? null,
    duration_minutes: Number(raw.duration_minutes ?? 0),
    xp_reward: Number(raw.xp_reward ?? 10),
    sort_order: Number(raw.sort_order ?? 0),
    required: raw.required === undefined ? true : Boolean(raw.required),
    completed: Boolean(raw.completed),
    via_placement_test: Boolean(raw.via_placement_test),
  }
}

function asModule(raw: Record<string, unknown>): CourseModule {
  const level = String(raw.level ?? 'iniciante') as ModuleLevel
  const items = Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]) : []
  const materials = Array.isArray(raw.materials)
    ? (raw.materials as Record<string, unknown>[])
    : []

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: (raw.description as string | null) ?? null,
    level: LEVELS.includes(level) ? level : 'iniciante',
    sort_order: Number(raw.sort_order ?? 0),
    unlocked_by_default: Boolean(raw.unlocked_by_default),
    unlocked: Boolean(raw.unlocked),
    completed: Boolean(raw.completed),
    required_total: Number(raw.required_total ?? 0),
    required_done: Number(raw.required_done ?? 0),
    next_item_id: raw.next_item_id ? String(raw.next_item_id) : null,
    items: items.map(asItem),
    materials: materials.map((m) => ({
      id: String(m.id ?? ''),
      title: String(m.title ?? ''),
      url: String(m.url ?? ''),
      kind:
        m.kind === 'pdf' || m.kind === 'apostila' || m.kind === 'slide'
          ? m.kind
          : 'link',
    })),
  }
}

export async function fetchCourseModules(
  courseId: string
): Promise<{ modules: CourseModule[]; error: string | null }> {
  const { data, error } = await supabase.rpc('get_course_modules', {
    p_course_id: courseId,
  })
  if (error) return { modules: [], error: error.message }

  const raw = (data ?? {}) as { modules?: unknown }
  const list = Array.isArray(raw.modules) ? (raw.modules as Record<string, unknown>[]) : []
  return { modules: list.map(asModule), error: null }
}

/** Primeiro item ainda não concluído de um módulo liberado. */
export function nextOpenItem(modules: CourseModule[]): { moduleId: string; itemId: string } | null {
  for (const mod of modules) {
    if (!mod.unlocked) continue
    const item = mod.items.find((i) => !i.completed)
    if (item) return { moduleId: mod.id, itemId: item.id }
  }
  return null
}
