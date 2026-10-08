import { supabase } from './supabase'

export type ReportCourse = { id: string; title: string; students: number; feedbacks: number }

export type ReportQuiz = { id: string; title: string; questions: number }

export type StudentQuizResult = {
  correct: number | null
  total: number | null
  percent: number | null
  passed: boolean
  attempts: number
  first_percent: number | null
  legacy_completed: boolean
}

export type StudentReport = {
  user_id: string
  full_name: string | null
  email: string | null
  enrolled_at: string
  last_activity: string | null
  completed_count: number
  total_lessons: number
  progress_pct: number
  quizzes: Record<string, StudentQuizResult>
  total_correct: number
  total_questions: number
  final_score: number | null
  certificate_code: string | null
  certificate_issued_at: string | null
  feedback_rating: number | null
}

export type CourseReport = {
  course_id: string
  total_lessons: number
  quizzes: ReportQuiz[]
  students: StudentReport[]
}

export type FeedbackItem = {
  id: string
  full_name: string | null
  rating: number
  would_recommend: boolean | null
  comment: string | null
  created_at: string
  updated_at: string
}

export type FeedbackReport = {
  summary: {
    count: number
    avg_rating: number | null
    recommend_yes: number
    recommend_no: number
    by_rating: Record<'1' | '2' | '3' | '4' | '5', number>
  }
  items: FeedbackItem[]
}

export function isMissingReports(message: string | undefined | null): boolean {
  if (!message) return false
  return (
    message.includes('admin_report_courses') ||
    message.includes('admin_course_report') ||
    message.includes('admin_course_feedback') ||
    message.includes('schema cache')
  )
}

export async function fetchReportCourses() {
  const { data, error } = await supabase.rpc('admin_report_courses')
  return { courses: (data as ReportCourse[] | null) ?? [], error: error?.message ?? null }
}

export async function fetchCourseReport(courseId: string) {
  const { data, error } = await supabase.rpc('admin_course_report', { p_course_id: courseId })
  return { report: (data as CourseReport | null) ?? null, error: error?.message ?? null }
}

export async function fetchFeedbackReport(courseId: string) {
  const { data, error } = await supabase.rpc('admin_course_feedback', { p_course_id: courseId })
  return { report: (data as FeedbackReport | null) ?? null, error: error?.message ?? null }
}

/** CSV com ";" e BOM para abrir certo no Excel em português. */
export function downloadCsv(fileName: string, rows: (string | number | null)[][]) {
  const escape = (v: string | number | null) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + rows.map((r) => r.map(escape).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
