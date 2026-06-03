import { isYouTubeUrl, youtubeEmbedUrl } from '../lib/videoStorage'

interface LessonVideoPlayerProps {
  videoUrl: string | null
  title: string
  noVideoLabel: string
}

export function LessonVideoPlayer({ videoUrl, title, noVideoLabel }: LessonVideoPlayerProps) {
  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white px-4 text-center text-sm">
        {noVideoLabel}
      </div>
    )
  }

  if (isYouTubeUrl(videoUrl)) {
    const embed = youtubeEmbedUrl(videoUrl)
    if (embed) {
      return (
        <iframe
          src={embed}
          title={title}
          className="w-full h-full"
          allowFullScreen
        />
      )
    }
  }

  return (
    <video
      key={videoUrl}
      src={videoUrl}
      controls
      controlsList="nodownload"
      className="w-full h-full bg-black"
      playsInline
    >
      <track kind="captions" />
    </video>
  )
}
