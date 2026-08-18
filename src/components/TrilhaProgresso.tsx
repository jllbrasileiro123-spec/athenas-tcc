import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoenixMark } from './PhoenixMark'
import { useGamification } from '../contexts/GamificationContext'
import { useLanguage } from '../contexts/LanguageContext'
import type { TranslationKey } from '../i18n/translations'
import type { TrailLesson } from '../lib/gamification'

type NodeState = 'done' | 'current' | 'locked' | 'open'

type TrilhaProgressoProps = {
  courseId: string
  lessons: TrailLesson[]
  completedCount: number
  totalLessons: number
  unlockAll?: boolean
}

const MAP_W = 340
const STEP_Y = 132

export function TrilhaProgresso({
  courseId,
  lessons,
  completedCount,
  totalLessons,
  unlockAll = false,
}: TrilhaProgressoProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { status, unavailable } = useGamification()
  const [lockedMsg, setLockedMsg] = useState<string | null>(null)

  const currentIndex = lessons.findIndex((l) => !l.completed)
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0
  const mapH = Math.max(lessons.length * STEP_Y, STEP_Y)

  const points = useMemo(
    () =>
      lessons.map((_, i) => ({
        x: MAP_W / 2 + zigzag(i),
        y: 36 + i * STEP_Y,
      })),
    [lessons]
  )

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const progressPoints = points.slice(0, Math.max(currentIndex, 0) + 1)
  const progressD =
    progressPoints.length > 0
      ? progressPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : ''

  if (lessons.length === 0) return null

  function nodeState(index: number, lesson: TrailLesson): NodeState {
    if (lesson.completed) return 'done'
    const unlocked = unlockAll || index === 0 || Boolean(lessons[index - 1]?.completed)
    if (!unlocked) return 'locked'
    if (index === currentIndex) return 'current'
    return 'open'
  }

  function openLesson(index: number, lesson: TrailLesson) {
    const state = nodeState(index, lesson)
    if (state === 'locked') {
      setLockedMsg(t('trail.lockedHint'))
      return
    }
    setLockedMsg(null)
    navigate(`/assistir/${courseId}/${lesson.id}`)
  }

  return (
    <div>
      <div className="mb-8 rounded-2xl border-2 border-neutral-900 bg-white px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-lg font-extrabold text-neutral-900">{t('trail.title')}</p>
            <p className="text-sm font-semibold text-neutral-700 mt-0.5">
              {t('trail.lessonsLeft', {
                done: String(completedCount),
                total: String(totalLessons),
              })}
            </p>
          </div>
          <p className="text-sm font-extrabold text-neutral-900 tabular-nums">{pct}%</p>
        </div>
        <div className="h-2.5 rounded-full bg-neutral-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-gold transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!unavailable && (
          <p className="mt-3 text-sm font-bold text-streak-ember">
            {t('streak.days', { n: String(status.current_streak) })}
            <span className="mt-0.5 block text-xs font-semibold text-neutral-700">
              {t('trail.streakHere', { n: String(status.current_streak) })}
            </span>
          </p>
        )}
      </div>

      {lockedMsg && (
        <p className="mb-4 rounded-xl border-2 border-neutral-900 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800" role="status">
          {lockedMsg}
        </p>
      )}

      <div className="relative mx-auto" style={{ width: MAP_W, height: mapH }}>
        <svg
          className="absolute inset-0"
          width={MAP_W}
          height={mapH}
          viewBox={`0 0 ${MAP_W} ${mapH}`}
          aria-hidden
        >
          <path d={pathD} fill="none" stroke="#E5E5E5" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          {progressD && (
            <path
              d={progressD}
              fill="none"
              stroke="#C9A227"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {lessons.map((lesson, i) => {
          const state = nodeState(i, lesson)
          const { x, y } = points[i]
          const minutes = lesson.duration_minutes > 0 ? t('trail.minutes', { n: String(lesson.duration_minutes) }) : null
          const meta = [typeLabel(lesson.content_type, t), minutes, `+${lesson.xp_reward} XP`]
            .filter(Boolean)
            .join(' · ')
          const actionLabel =
            state === 'done'
              ? t('trail.reviewLesson', { title: lesson.title })
              : state === 'current'
                ? t('trail.startLesson', { title: lesson.title })
                : t('trail.lockedHint')

          return (
            <div
              key={lesson.id}
              className="absolute flex w-[9.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: x, top: y }}
            >
              <button
                type="button"
                onClick={() => openLesson(i, lesson)}
                title={`${lesson.title} — ${meta}`}
                aria-label={actionLabel}
                className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-[5px] shadow-md transition-transform hover:scale-105 ${
                  state === 'done'
                    ? 'border-brand-gold bg-neutral-950 text-brand-gold'
                    : state === 'current'
                      ? 'trail-node-current border-streak-fire bg-white text-streak-fire'
                      : state === 'open'
                        ? 'border-brand-gold bg-white text-neutral-900'
                        : 'border-neutral-300 bg-neutral-100 text-neutral-400'
                }`}
              >
                {state === 'done' ? (
                  <CheckIcon />
                ) : state === 'locked' ? (
                  <LockIcon />
                ) : state === 'current' ? (
                  <PhoenixMark className="h-9 w-9" tone="flame" glow />
                ) : (
                  <span className="text-lg font-extrabold">{i + 1}</span>
                )}
              </button>
              <p className={`mt-2 text-center text-sm font-extrabold leading-tight line-clamp-2 ${
                state === 'locked' ? 'text-neutral-400' : 'text-neutral-900'
              }`}>
                {lesson.title}
              </p>
              <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${
                state === 'current' || state === 'open'
                  ? 'text-streak-ember'
                  : state === 'done'
                    ? 'text-brand-gold'
                    : 'text-neutral-400'
              }`}>
                {state === 'done'
                  ? t('trail.done')
                  : state === 'locked'
                    ? t('trail.locked')
                    : t('trail.available')}
                {minutes ? ` · ${minutes}` : ''}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function zigzag(index: number) {
  const pattern = [0, 78, 0, -78]
  return pattern[index % pattern.length]
}

function typeLabel(type: TrailLesson['content_type'], t: (key: TranslationKey) => string) {
  if (type === 'quiz') return t('trail.typeQuiz')
  if (type === 'simulado') return t('trail.typeExam')
  return t('trail.typeLesson')
}

function CheckIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5 9.5 17 19 7"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
