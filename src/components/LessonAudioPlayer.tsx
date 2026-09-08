import { useRef } from 'react'
import { VIDEO_COMPLETE_RATIO } from '../lib/gamification'

type LessonAudioPlayerProps = {
  audioUrl: string | null
  title: string
  noAudioLabel: string
  onNearComplete?: () => void
}

/** Podcast do módulo: mesmo critério de conclusão do vídeo (90% ouvido). */
export function LessonAudioPlayer({
  audioUrl,
  title,
  noAudioLabel,
  onNearComplete,
}: LessonAudioPlayerProps) {
  const fired = useRef(false)

  if (!audioUrl) {
    return (
      <div className="rounded-2xl border border-brand-gold/30 bg-brand-gold-soft/20 px-4 py-8 text-center text-sm text-neutral-600">
        {noAudioLabel}
      </div>
    )
  }

  function maybeComplete(el: HTMLAudioElement) {
    if (fired.current || !onNearComplete) return
    const duration = el.duration
    if (!duration || !Number.isFinite(duration)) return
    if (el.ended || el.currentTime / duration >= VIDEO_COMPLETE_RATIO) {
      fired.current = true
      onNearComplete()
    }
  }

  return (
    <div className="rounded-2xl border border-brand-gold/30 bg-white p-6">
      <p className="text-sm font-bold text-neutral-900">{title}</p>
      <audio
        key={audioUrl}
        src={audioUrl}
        controls
        controlsList="nodownload"
        className="mt-4 w-full"
        onTimeUpdate={(e) => maybeComplete(e.currentTarget)}
        onEnded={(e) => maybeComplete(e.currentTarget)}
      >
        <track kind="captions" />
      </audio>
    </div>
  )
}
