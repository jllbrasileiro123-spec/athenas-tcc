import { Link } from 'react-router-dom'
import { PhoenixMark } from './PhoenixMark'
import { useLanguage } from '../contexts/LanguageContext'
import type { TranslationKey } from '../i18n/translations'
import type { TrailLesson } from '../lib/gamification'

type TrilhaProgressoProps = {
  courseId: string
  lessons: TrailLesson[]
  completedCount: number
  totalLessons: number
  canAccess?: (lesson: TrailLesson) => boolean
}

export function TrilhaProgresso({
  courseId,
  lessons,
  completedCount,
  totalLessons,
  canAccess,
}: TrilhaProgressoProps) {
  const { t } = useLanguage()
  const currentIndex = lessons.findIndex((l) => !l.completed)
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

  if (lessons.length === 0) return null

  return (
    <div className="relative">
      <div className="mb-8 rounded-2xl border border-brand-gold/30 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-bold text-neutral-900">{t('trail.moduleProgress')}</p>
          <p className="text-xs font-semibold text-neutral-500">
            {t('trail.lessonsLeft', {
              done: String(completedCount),
              total: String(totalLessons),
            })}
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-brand-gold-soft overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-gold transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="relative mx-auto max-w-md py-4">
        <div
          className="absolute left-1/2 top-8 bottom-8 w-1 -translate-x-1/2 rounded-full bg-brand-gold-soft"
          aria-hidden
        />
        {lessons.map((lesson, i) => {
          const offset = zigzag(i)
          const isCurrent = i === currentIndex || (currentIndex === -1 && i === lessons.length - 1)
          const accessible = canAccess ? canAccess(lesson) : true
          const inner = (
            <div
              className={`relative flex flex-col items-center w-[7.5rem] ${
                accessible ? '' : 'opacity-55'
              }`}
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-md transition-transform ${
                  lesson.completed
                    ? 'border-brand-gold bg-neutral-950 text-brand-gold'
                    : isCurrent
                      ? 'border-brand-gold bg-brand-gold-soft scale-110'
                      : 'border-neutral-200 bg-white'
                }`}
              >
                {lesson.completed ? (
                  <PhoenixMark className="h-9 w-9" glow />
                ) : isCurrent ? (
                  <PhoenixMark className="h-9 w-9" glow />
                ) : (
                  <span className="text-sm font-bold text-neutral-400">{i + 1}</span>
                )}
              </span>
              <p className="mt-2 text-center text-sm font-bold text-neutral-900 leading-tight line-clamp-2">
                {lesson.title}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-gold">
                {typeLabel(lesson.content_type, t)} · +{lesson.xp_reward} XP
              </p>
            </div>
          )

          return (
            <li
              key={lesson.id}
              className="relative flex justify-center py-5"
              style={{ transform: `translateX(${offset}px)` }}
            >
              {accessible ? (
                <Link to={`/assistir/${courseId}/${lesson.id}`} className="hover:opacity-90">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function zigzag(index: number) {
  const pattern = [0, 72, 0, -72]
  return pattern[index % pattern.length]
}

function typeLabel(type: TrailLesson['content_type'], t: (key: TranslationKey) => string) {
  if (type === 'quiz') return t('trail.typeQuiz')
  if (type === 'simulado') return t('trail.typeExam')
  return t('trail.typeLesson')
}
