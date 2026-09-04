import { supabase } from './supabase'

export type Certificate = {
  ok: boolean
  error?: string
  code: string
  issued_at: string
  course_title: string
  holder_name: string
  total_lessons: number
  completed_count?: number
}

export function isMissingCertificates(message: string | undefined | null): boolean {
  if (!message) return false
  return (
    message.includes('issue_certificate') ||
    message.includes('verify_certificate') ||
    message.includes('certificates') ||
    message.includes('schema cache')
  )
}

function parse(data: unknown): Certificate {
  const raw = (data ?? {}) as Partial<Certificate>
  return {
    ok: Boolean(raw.ok),
    error: raw.error,
    code: String(raw.code ?? ''),
    issued_at: String(raw.issued_at ?? ''),
    course_title: String(raw.course_title ?? ''),
    holder_name: String(raw.holder_name ?? ''),
    total_lessons: Number(raw.total_lessons ?? 0),
    completed_count: raw.completed_count === undefined ? undefined : Number(raw.completed_count),
  }
}

/** Emite (ou recupera) o certificado do curso; exige trilha 100% concluída. */
export async function issueCertificate(
  courseId: string
): Promise<{ certificate: Certificate | null; error: string | null }> {
  const { data, error } = await supabase.rpc('issue_certificate', { p_course_id: courseId })
  if (error) return { certificate: null, error: error.message }
  return { certificate: parse(data), error: null }
}

/** Verificação pública do código, sem login. */
export async function verifyCertificate(
  code: string
): Promise<{ certificate: Certificate | null; error: string | null }> {
  const { data, error } = await supabase.rpc('verify_certificate', { p_code: code.trim() })
  if (error) return { certificate: null, error: error.message }
  return { certificate: parse(data), error: null }
}
