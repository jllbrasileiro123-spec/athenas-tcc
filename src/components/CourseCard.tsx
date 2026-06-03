import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import type { Course } from '../types/database'

interface CourseCardProps {
  course: Course
  variant?: 'grid' | 'horizontal'
}

export function CourseCard({ course, variant = 'grid' }: CourseCardProps) {
  const { t } = useLanguage()
  const levelLabels: Record<string, string> = {
    iniciante: t('level.beginner'),
    intermediario: t('level.intermediate'),
    avancado: t('level.advanced'),
  }
  const instructor = course.profiles?.full_name ?? t('common.instructor')
  const lessonCount = course.lesson_count ?? course.lessons?.length ?? 0
  const titleLower = course.title.toLowerCase() + (course.description?.toLowerCase() ?? '')
  const hasAiTag =
    titleLower.includes('ia') ||
    titleLower.includes('ai') ||
    titleLower.includes('inteligência') ||
    titleLower.includes('machine') ||
    titleLower.includes('prompt')

  if (variant === 'horizontal') {
    return (
      <Link
        to={`/curso/${course.id}`}
        className="group flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 hover:border-neutral-900 hover:shadow-md transition-all"
      >
        <div className="w-28 sm:w-36 shrink-0 aspect-[4/3] rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-950 overflow-hidden relative">
          {course.thumbnail_url ? (
            <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-white/70 text-2xl font-bold">
              {course.title.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex flex-col flex-1 min-w-0 py-0.5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {hasAiTag && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-950 text-white px-2 py-0.5 rounded">
                IA
              </span>
            )}
            <span className="text-[10px] font-medium text-neutral-500 uppercase">
              {levelLabels[course.level] ?? course.level}
            </span>
          </div>
          <h3 className="font-bold text-neutral-900 line-clamp-2 group-hover:underline">{course.title}</h3>
          <p className="text-sm text-neutral-500 mt-1 truncate">{instructor}</p>
          {course.description && (
            <p className="text-xs text-neutral-500 mt-2 line-clamp-2 hidden sm:block">{course.description}</p>
          )}
          <div className="mt-auto pt-3 flex items-center gap-4 text-sm">
            <span className="font-bold text-neutral-900">
              {course.price > 0 ? `R$ ${course.price.toFixed(2)}` : t('common.free')}
            </span>
            <span className="text-neutral-400">
              {lessonCount} {lessonCount !== 1 ? t('common.lessons') : t('common.lesson')}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/curso/${course.id}`}
      className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:border-neutral-900 transition-all flex flex-col"
    >
      <div className="aspect-video bg-gradient-to-br from-neutral-800 to-neutral-950 relative">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 text-4xl font-bold">
            {course.title.charAt(0)}
          </div>
        )}
        {hasAiTag && (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase bg-white text-neutral-950 px-2 py-1 rounded">
            IA
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-neutral-900 group-hover:underline line-clamp-2">{course.title}</h3>
        <p className="text-sm text-neutral-500 mt-1">{instructor}</p>
        <div className="mt-auto pt-3 flex items-center justify-between text-sm">
          <span className="text-neutral-900 font-bold">
            {course.price > 0 ? `R$ ${course.price.toFixed(2)}` : t('common.free')}
          </span>
          <span className="text-neutral-400">
            {lessonCount} {lessonCount !== 1 ? t('common.lessons') : t('common.lesson')}
          </span>
        </div>
      </div>
    </Link>
  )
}
