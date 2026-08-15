import { supabase } from './supabase'

export const VIDEO_BUCKET = 'course-videos'
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024 // 150 MB

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']

export type YouTubeRef = {
  videoId: string | null
  playlistId: string | null
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /youtube\.com|youtu\.be/i.test(url)
}

export function parseYouTubeUrl(url: string): YouTubeRef | null {
  const raw = url.trim()
  if (!raw || !isYouTubeUrl(raw)) return null

  try {
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    const path = parsed.pathname
    const playlistId = parsed.searchParams.get('list')
    let videoId = parsed.searchParams.get('v')

    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      videoId = path.replace(/^\//, '').split('/')[0] || videoId
    }

    const embed = path.match(/\/embed\/([\w-]+)/)
    if (embed && embed[1] !== 'videoseries') videoId = embed[1]

    const shorts = path.match(/\/shorts\/([\w-]+)/)
    if (shorts) videoId = shorts[1]

    if (!videoId && !playlistId) return null
    return { videoId, playlistId }
  } catch {
    return null
  }
}

export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  return parseYouTubeUrl(url) !== null
}

export function youtubeEmbedUrl(url: string): string | null {
  const yt = parseYouTubeUrl(url)
  if (!yt) return null
  if (yt.playlistId && !yt.videoId) {
    return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(yt.playlistId)}`
  }
  if (yt.videoId && yt.playlistId) {
    return `https://www.youtube.com/embed/${yt.videoId}?list=${encodeURIComponent(yt.playlistId)}`
  }
  if (yt.videoId) {
    return `https://www.youtube.com/embed/${yt.videoId}`
  }
  return null
}

export function isHostedVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes(`/${VIDEO_BUCKET}/`) || url.includes(`object/public/${VIDEO_BUCKET}`)
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
