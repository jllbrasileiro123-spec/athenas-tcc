import { supabase } from './supabase'

export type CourseFeedback = {
  rating: number
  would_recommend: boolean | null
  comment: string | null
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
  const { data, error } = await supabase
    .from('course_feedback')
    .select('rating, would_recommend, comment')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle()
  if (error) return { feedback: null, error: error.message }
  return { feedback: (data as CourseFeedback | null) ?? null, error: null }
}

export async function saveFeedback(
  userId: string,
  courseId: string,
  feedback: CourseFeedback
): Promise<string | null> {
  const { error } = await supabase.from('course_feedback').upsert(
    {
      user_id: userId,
      course_id: courseId,
      rating: feedback.rating,
      would_recommend: feedback.would_recommend,
      comment: feedback.comment?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,course_id' }
  )
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
