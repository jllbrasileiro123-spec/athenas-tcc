export const XP_BY_TYPE = {
  lesson: 10,
  quiz: 15,
  simulado: 30,
} as const

export const FREEZE_COST = 200
export const VIDEO_COMPLETE_RATIO = 0.9

export type LessonContentType = keyof typeof XP_BY_TYPE

export type TrailLesson = {
  id: string
  title: string
  description: string | null
  sort_order: number
  content_type: LessonContentType
  xp_reward: number
  is_preview: boolean
  duration_minutes: number
  completed: boolean
  completed_at: string | null
  /** Liberada pelo teste de nivelamento (via_teste_nivelamento no plano) */
  via_placement_test: boolean
  module_id: string | null
  /** Papel no módulo: explicacao | tutorial | podcast | exercicio */
  item_kind: string
  audio_url: string | null
}

/** Podcast é reforço opcional: não trava a aula seguinte. */
export function isOptionalItem(itemKind: string | null | undefined) {
  return itemKind === 'podcast'
}

/**
 * Atividade 4: um nó só libera quando os anteriores obrigatórios estão
 * concluídos. Instrutor vê tudo; aulas já concluídas (inclusive via
 * nivelamento) e o podcast opcional ficam sempre acessíveis.
 */
export function isLessonSequentiallyUnlocked(
  lessons: TrailLesson[],
  lessonId: string,
  opts?: { isOwner?: boolean }
): boolean {
  if (opts?.isOwner) return true
  const sorted = [...lessons].sort((a, b) => a.sort_order - b.sort_order)
  const idx = sorted.findIndex((l) => l.id === lessonId)
  if (idx < 0) return false
  const lesson = sorted[idx]
  if (lesson.completed) return true

  const previousDone = sorted
    .slice(0, idx)
    .every((l) => l.completed || isOptionalItem(l.item_kind))

  // O podcast acompanha o módulo: libera junto com o item obrigatório anterior
  if (isOptionalItem(lesson.item_kind)) return previousDone
  if (lesson.is_preview && !lesson.module_id) return true
  return previousDone
}

export type CourseTrail = {
  course_id: string
  lessons: TrailLesson[]
  completed_count: number
  total_lessons: number
}

export type CompleteLessonResult = {
  ok: boolean
  already_completed: boolean
  lesson_id: string
  lesson_title: string
  content_type: LessonContentType
  xp_awarded: number
  coins_awarded: number
  total_xp: number
  coin_balance: number
  current_streak: number
  longest_streak: number
  freeze_count: number
  freeze_used: boolean
  streak_broken: boolean
  broken_from: number
  course_id: string
  completed_count: number
  total_lessons: number
  next_lesson_id: string | null
  next_lesson_title: string | null
}

export type GamificationStatus = {
  total_xp: number
  coin_balance: number
  current_streak: number
  longest_streak: number
  freeze_count: number
  freeze_used: boolean
  streak_broken: boolean
  broken_from: number
  last_activity_date: string | null
  activity_dates: string[]
  freeze_cost: number
  today: string
}

export type BuyFreezeResult = {
  ok: boolean
  error?: string
  coin_balance: number
  freeze_count: number
  freeze_cost: number
}

export function userTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
  } catch {
    return 'America/Sao_Paulo'
  }
}

export function isRpcMissing(error: { message?: string; code?: string } | null) {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === 'PGRST202' ||
    msg.includes('could not find the function') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  )
}
