import { supabase } from './supabase'

export const MATERIAL_BUCKET = 'course-materials'
export const MAX_MATERIAL_BYTES = 50 * 1024 * 1024 // 50 MB

const MATERIAL_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export function validateMaterialFile(file: File): string | null {
  const okType =
    MATERIAL_TYPES.includes(file.type) ||
    !!file.name.match(/\.(pdf|doc|docx|ppt|pptx)$/i)
  if (!okType) return 'invalidType'
  if (file.size > MAX_MATERIAL_BYTES) return 'tooLarge'
  return null
}

export async function uploadCourseMaterial(
  userId: string,
  courseId: string,
  file: File,
  fileName?: string
): Promise<{ url: string | null; error: string | null }> {
  const validation = validateMaterialFile(file)
  if (validation === 'invalidType') return { url: null, error: 'invalidType' }
  if (validation === 'tooLarge') return { url: null, error: 'tooLarge' }

  const safe = (fileName ?? file.name).replace(/[^\w.\-à-úÀ-Ú ]+/gi, '_').replace(/\s+/g, '_')
  const path = `${userId}/${courseId}/${Date.now()}-${safe}`

  const { error } = await supabase.storage.from(MATERIAL_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })

  if (error) {
    return {
      url: null,
      error: error.message.includes('Bucket not found') ? 'noBucket' : error.message,
    }
  }

  const { data } = supabase.storage.from(MATERIAL_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
