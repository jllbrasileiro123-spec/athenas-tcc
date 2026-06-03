import { supabase } from './supabase'

export const VIDEO_BUCKET = 'course-videos'
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024 // 150 MB

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

export function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /youtube\.com|youtu\.be/i.test(url)
}

export function isHostedVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes(`/${VIDEO_BUCKET}/`) || url.includes(`object/public/${VIDEO_BUCKET}`)
}

export function youtubeEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return null
}

export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url || !isHostedVideoUrl(url)) return null
  const marker = `/object/public/${VIDEO_BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return url.slice(i + marker.length).split('?')[0]
}

export function validateVideoFile(file: File): string | null {
  if (!VIDEO_TYPES.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
    return 'invalidType'
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return 'tooLarge'
  }
  return null
}

export async function uploadLessonVideo(
  userId: string,
  courseId: string,
  lessonId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const validation = validateVideoFile(file)
  if (validation === 'invalidType') {
    return { url: null, error: 'invalidType' }
  }
  if (validation === 'tooLarge') {
    return { url: null, error: 'tooLarge' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
  const path = `${userId}/${courseId}/${lessonId}.${ext}`

  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'video/mp4',
  })

  if (error) {
    return {
      url: null,
      error: error.message.includes('Bucket not found') ? 'noBucket' : error.message,
    }
  }

  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path)
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null }
}

export async function deleteHostedVideo(videoUrl: string | null | undefined): Promise<void> {
  const path = storagePathFromPublicUrl(videoUrl)
  if (!path) return
  await supabase.storage.from(VIDEO_BUCKET).remove([path])
}
