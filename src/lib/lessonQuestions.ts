import { supabase } from './supabase'

export type LessonQuestion = {
  id: string
  course_id: string
  lesson_id: string | null
  user_id: string
  body: string
  answer: string | null
  answered_at: string | null
  created_at: string
}

export type InstructorQuestion = {
  id: string
  course_id: string
  course_title: string
  lesson_id: string | null
  lesson_title: string | null
  student_name: string
  body: string
  answer: string | null
  answered_at: string | null
  created_at: string
}

/** Tabela/RPC de dúvidas ainda não criada no banco */
export function isMissingQuestions(message: string | undefined | null): boolean {
  if (!message) return false
  return (
    message.includes('lesson_questions') ||
    message.includes('instructor_questions') ||
    message.includes('schema cache')
  )
}

export async function fetchLessonQuestions(
  lessonId: string
): Promise<{ questions: LessonQuestion[]; error: string | null }> {
  const { data, error } = await supabase
    .from('lesson_questions')
    .select('id, course_id, lesson_id, user_id, body, answer, answered_at, created_at')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })

  if (error) return { questions: [], error: error.message }
  return { questions: (data as LessonQuestion[] | null) ?? [], error: null }
}

export async function askLessonQuestion(input: {
  courseId: string
  lessonId: string | null
  userId: string
  body: string
}): Promise<{ question: LessonQuestion | null; error: string | null }> {
  const { data, error } = await supabase
    .from('lesson_questions')
    .insert({
      course_id: input.courseId,
      lesson_id: input.lessonId,
      user_id: input.userId,
      body: input.body.trim(),
    })
    .select('id, course_id, lesson_id, user_id, body, answer, answered_at, created_at')
    .single()

  if (error) return { question: null, error: error.message }
  return { question: data as LessonQuestion, error: null }
}

export async function fetchInstructorQuestions(): Promise<{
  questions: InstructorQuestion[]
  error: string | null
}> {
  const { data, error } = await supabase.rpc('instructor_questions')
  if (error) return { questions: [], error: error.message }
  return { questions: (data as InstructorQuestion[] | null) ?? [], error: null }
}

export async function answerLessonQuestion(
  questionId: string,
  answer: string,
  instructorId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('lesson_questions')
    .update({
      answer: answer.trim(),
      answered_by: instructorId,
      answered_at: new Date().toISOString(),
    })
    .eq('id', questionId)

  return { error: error?.message ?? null }
}
