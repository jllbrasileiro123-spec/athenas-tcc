import { useCallback, useEffect, useId, useRef } from 'react'
import { isYouTubeUrl, parseYouTubeUrl, youtubeEmbedUrl } from '../lib/videoStorage'
import { VIDEO_COMPLETE_RATIO } from '../lib/gamification'

interface LessonVideoPlayerProps {
  videoUrl: string | null
  title: string
  noVideoLabel: string
  onNearComplete?: () => void
}

type YTPlayer = {
  getCurrentTime: () => number
  getDuration: () => number
  getPlaylist?: () => string[]
  getPlaylistIndex?: () => number
  destroy: () => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId?: string
          width?: string | number
          height?: string | number
          playerVars?: Record<string, number | string>
          events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void }
        }
      ) => YTPlayer
      PlayerState?: { ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApi: Promise<void> | null = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve()
  if (!youtubeApi) {
    youtubeApi = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve()
      }
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(script)
      }
    })
  }
  return youtubeApi
}

function isLastPlaylistItem(player: YTPlayer) {
  try {
    const list = player.getPlaylist?.()
    if (!list || list.length === 0) return true
    return (player.getPlaylistIndex?.() ?? 0) >= list.length - 1
  } catch {
    return true
  }
}

export function LessonVideoPlayer({
  videoUrl,
  title,
  noVideoLabel,
  onNearComplete,
}: LessonVideoPlayerProps) {
  const onNearCompleteRef = useRef(onNearComplete)
  onNearCompleteRef.current = onNearComplete
  const notify = useCallback(() => {
    onNearCompleteRef.current?.()
  }, [])

  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white px-4 text-center text-sm">
        {noVideoLabel}
      </div>
    )
  }

  if (isYouTubeUrl(videoUrl)) {
    return <YouTubeTrackedPlayer key={videoUrl} videoUrl={videoUrl} title={title} onNearComplete={notify} />
  }

  return <HostedTrackedPlayer key={videoUrl} videoUrl={videoUrl} onNearComplete={notify} />
}

function HostedTrackedPlayer({
  videoUrl,
  onNearComplete,
}: {
  videoUrl: string
  onNearComplete?: () => void
}) {
  const fired = useRef(false)

  function maybeComplete(el: HTMLVideoElement) {
    if (fired.current || !onNearComplete) return
    const duration = el.duration
    if (!duration || !Number.isFinite(duration)) return
    if (el.ended || el.currentTime / duration >= VIDEO_COMPLETE_RATIO) {
      fired.current = true
      onNearComplete()
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
      onTimeUpdate={(e) => maybeComplete(e.currentTarget)}
      onEnded={(e) => maybeComplete(e.currentTarget)}
    >
      <track kind="captions" />
    </video>
  )
}

function YouTubeTrackedPlayer({
  videoUrl,
  title,
  onNearComplete,
}: {
  videoUrl: string
  title: string
  onNearComplete?: () => void
}) {
  const hostId = useId().replace(/:/g, '')
  const fired = useRef(false)
  const playerRef = useRef<YTPlayer | null>(null)
  const onNearCompleteRef = useRef(onNearComplete)
  onNearCompleteRef.current = onNearComplete

  useEffect(() => {
    fired.current = false
    const yt = parseYouTubeUrl(videoUrl)
    if (!yt?.videoId && !yt?.playlistId) return

    let cancelled = false
    let poll: number | undefined

    function maybeComplete(player?: YTPlayer | null) {
      if (fired.current) return
      const current = player ?? playerRef.current
      if (current && !isLastPlaylistItem(current)) return
      fired.current = true
      onNearCompleteRef.current?.()
    }

    void loadYouTubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return
      const el = document.getElementById(hostId)
      if (!el) return
      const playerVars: Record<string, number | string> = {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        origin: window.location.origin,
      }
      if (yt.playlistId) {
        playerVars.listType = 'playlist'
        playerVars.list = yt.playlistId
      }
      playerRef.current = new window.YT.Player(hostId, {
        ...(yt.videoId ? { videoId: yt.videoId } : {}),
        width: '100%',
        height: '100%',
        playerVars,
        events: {
          onReady: () => {
            poll = window.setInterval(() => {
              const player = playerRef.current
              if (!player || fired.current) return
              try {
                const duration = player.getDuration()
                const current = player.getCurrentTime()
                if (duration > 0 && current / duration >= VIDEO_COMPLETE_RATIO) {
                  maybeComplete(player)
                }
              } catch {
                /* player not ready */
              }
            }, 1000)
          },
          onStateChange: (e) => {
            if (e.data === window.YT?.PlayerState?.ENDED) maybeComplete(playerRef.current)
          },
        },
      })
    })

    return () => {
      cancelled = true
      if (poll) window.clearInterval(poll)
      try {
        playerRef.current?.destroy()
      } catch {
        /* ignore */
      }
      playerRef.current = null
    }
  }, [videoUrl, hostId])

  if (!onNearComplete) {
    const embed = youtubeEmbedUrl(videoUrl)
    if (!embed) return null
    return (
      <iframe
        src={embed}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    )
  }

  return <div id={hostId} className="w-full h-full" title={title} />
}
