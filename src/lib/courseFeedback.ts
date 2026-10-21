import { supabase } from './supabase'

/** Afirmações de percepção (1 = discordo totalmente … 5 = concordo totalmente) */
export const PERCEPTION_ITEMS = [
  { id: 'P1', key: 'feedback.p1' },
  { id: 'P2', key: 'feedback.p2' },
  { id: 'P3', key: 'feedback.p3' },
  { id: 'P4', key: 'feedback.p4' },
  { id: 'P5', key: 'feedback.p5' },
] as const

export type PerceptionId = (typeof PERCEPTION_ITEMS)[number]['id']
export type Perception = Partial<Record<PerceptionId, number>>

export type CourseFeedback = {
  rating: number
  would_recommend: boolean | null
  comment: string | null
  perception?: Perception | null
}

function isMissingPerception(message: string) {
  return message.includes('perception')
}

export function isMissingFeedback(message: string | undefined | null): boolean {
  if (!message) return false
  return message.includes('course_feedback') || message.includes('schema cache')
}

/** Feedback que o usuário já enviou para o curso (ou null). */
export async function fetchMyFeedback(
  userId: string,
  courseId: string
): Promise<{ feedback: CourseFeedback | null; error: string | null }> {
  const query = (cols: string) =>
    supabase.from('course_feedback').select(cols).eq('user_id', userId).eq('course_id', courseId).maybeSingle()
  let { data, error } = await query('rating, would_recommend, comment, perception')
  // Banco sem a coluna perception (percepcao-curso.sql ainda não rodou)
  if (error && isMissingPerception(error.message)) ({ data, error } = await query('rating, would_recommend, comment'))
  if (error) return { feedback: null, error: error.message }
  return { feedback: (data as CourseFeedback | null) ?? null, error: null }
}

export async function saveFeedback(
  userId: string,
  courseId: string,
  feedback: CourseFeedback
): Promise<string | null> {
  const row = {
    user_id: userId,
    course_id: courseId,
    rating: feedback.rating,
    would_recommend: feedback.would_recommend,
    comment: feedback.comment?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  const upsert = (r: object) => supabase.from('course_feedback').upsert(r, { onConflict: 'user_id,course_id' })
  let { error } = await upsert({ ...row, perception: feedback.perception ?? null })
  if (error && isMissingPerception(error.message)) ({ error } = await upsert(row))
  return error?.message ?? null
}

/** "Agora não" vale só para esta sessão do navegador: na próxima visita pergunta de novo. */
const DISMISS_KEY = 'athenas.feedbackDismissed'

export function wasFeedbackDismissed(courseId: string): boolean {
  try {
    const list = JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? '[]') as string[]
    return list.includes(courseId)
  } catch {
    return false
  }
}

export function dismissFeedback(courseId: string) {
  try {
    const list = JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? '[]') as string[]
    if (!list.includes(courseId)) list.push(courseId)
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(list))
  } catch {
    /* sessionStorage bloqueado: só não lembra o "agora não" */
  }
}
