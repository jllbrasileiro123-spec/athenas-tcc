import { supabase } from './supabase'

/** Limiar de acerto por aula para liberar (pular) a aula. */
export const PLACEMENT_THRESHOLD = 0.7

export type PlacementQuestion = {
  id: string
  lesson_id: string | null
  lesson_title: string
  /** Preenchido nas formações organizadas em módulos */
  module_id: string | null
  module_title: string
  module_level: string
  prompt: string
  choices: string[]
  sort_order: number
}

export type PlacementTest = {
  course_id: string
  already_taken: boolean
  questions: PlacementQuestion[]
}

export type PlacementResult = {
  ok: boolean
  error?: string
  correct_count: number
  total_count: number
  unlocked_count: number
  lesson_count: number
  /** Módulos concluídos pelo teste (0 nas formações sem módulos) */
  unlocked_module_count: number
  module_count: number
  next_lesson_id: string | null
  next_lesson_title: string | null
  next_module_title: string | null
}

export function isMissingPlacement(message: string | undefined | null): boolean {
  if (!message) return false
  return (
    message.includes('get_placement_test') ||
    message.includes('submit_placement_test') ||
    message.includes('placement_questions') ||
    message.includes('schema cache')
  )
}

export async function fetchPlacementTest(
  courseId: string
): Promise<{ test: PlacementTest | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_placement_test', { p_course_id: courseId })
  if (error) return { test: null, error: error.message }

  const raw = (data ?? {}) as Partial<PlacementTest>
  const questions = Array.isArray(raw.questions) ? raw.questions : []

  return {
    test: {
      course_id: String(raw.course_id ?? courseId),
      already_taken: Boolean(raw.already_taken),
      questions: questions.map((q) => ({
        id: String(q.id),
        lesson_id: q.lesson_id ? String(q.lesson_id) : null,
        lesson_title: String(q.lesson_title ?? ''),
        module_id: q.module_id ? String(q.module_id) : null,
        module_title: String(q.module_title ?? ''),
        module_level: String(q.module_level ?? ''),
        prompt: String(q.prompt ?? ''),
        choices: Array.isArray(q.choices) ? q.choices.map(String) : [],
        sort_order: Number(q.sort_order ?? 0),
      })),
    },
    error: null,
  }
}

export async function submitPlacementTest(
  courseId: string,
  answers: Record<string, number>
): Promise<{ result: PlacementResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('submit_placement_test', {
    p_course_id: courseId,
    p_answers: answers,
  })
  if (error) return { result: null, error: error.message }

  const raw = (data ?? {}) as Partial<PlacementResult>
  return {
    result: {
      ok: Boolean(raw.ok),
      error: raw.error,
      correct_count: Number(raw.correct_count ?? 0),
      total_count: Number(raw.total_count ?? 0),
      unlocked_count: Number(raw.unlocked_count ?? 0),
      lesson_count: Number(raw.lesson_count ?? 0),
      unlocked_module_count: Number(raw.unlocked_module_count ?? 0),
      module_count: Number(raw.module_count ?? 0),
      next_lesson_id: raw.next_lesson_id ? String(raw.next_lesson_id) : null,
      next_lesson_title: raw.next_lesson_title ? String(raw.next_lesson_title) : null,
      next_module_title: raw.next_module_title ? String(raw.next_module_title) : null,
    },
    error: null,
  }
}
