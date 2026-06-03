import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CourseCard } from '../components/CourseCard'
import { AthenaAssistant } from '../components/AthenaAssistant'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { courseFilterKeys, courseMatchesFilter, type CourseFilterKey } from '../lib/courseFilters'
import type { Course } from '../types/database'

export function Home() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<CourseFilterKey>('filter.all')
  const isInstructor = profile?.role === 'instructor'

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles:instructor_id ( full_name ),
          lessons ( id )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (error) {
        setLoadError(error.message)
      } else if (data) {
        const mapped = (data as Course[]).map((c) => ({
          ...c,
          lesson_count: Array.isArray(c.lessons) ? c.lessons.length : 0,
        }))
        setCourses(mapped)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filterLabel = t(activeFilter)

  const filtered = courses.filter((c) => {
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    const matchFilter = courseMatchesFilter(c, activeFilter)
    return matchSearch && matchFilter
  })

  const isSearching = search.trim().length > 0 || activeFilter !== 'filter.all'
  const noResultsFromSearch = !loading && isSearching && filtered.length === 0
  const noCoursesAtAll = !loading && courses.length === 0
  const query = search.trim()

  return (
    <div className="bg-neutral-50 min-h-full">
      <section className="border-b border-neutral-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
                {t('home.badge')}
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 leading-[1.1]">
                {t('home.title')}
              </h1>
              <p className="mt-4 text-neutral-600 text-lg max-w-xl">
                {t('home.desc', { athena: 'Athena' })}
              </p>
            </div>

            <div className="w-full lg:w-[420px] shrink-0">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                {t('home.searchLabel')}
              </label>
              <form
                className="flex rounded-full border-2 border-neutral-900 bg-white overflow-hidden"
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="search"
                  placeholder={t('home.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-5 py-3.5 text-neutral-900 outline-none text-sm"
                />
                <button
                  type="submit"
                  className="px-6 bg-neutral-950 text-white text-sm font-bold hover:bg-black"
                >
                  {t('common.search')}
                </button>
              </form>
              {noResultsFromSearch && (
                <p className="mt-3 text-sm font-semibold text-red-600" role="alert">
                  {query
                    ? t('home.searchNotFound', { query })
                    : t('home.filterNotFound', { filter: filterLabel })}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <div className="flex-1 min-w-0 order-2 lg:order-1">
            {loadError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3" role="alert">
                {t('home.loadError')}: {loadError}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-8">
              {courseFilterKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === key
                      ? 'bg-neutral-950 text-white'
                      : 'bg-white border border-neutral-300 text-neutral-700 hover:border-neutral-900'
                  }`}
                >
                  {t(key)}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">{t('home.published')}</h2>
                <p className="text-sm text-neutral-500 mt-0.5">{t('home.publishedDesc')}</p>
              </div>
              {!loading && isInstructor && (
                <Link
                  to="/instrutor/novo-curso"
                  className="text-sm font-bold text-neutral-900 border border-neutral-900 px-4 py-2 rounded-full hover:bg-neutral-900 hover:text-white transition-colors shrink-0"
                >
                  {t('home.newCourse')}
                </Link>
              )}
            </div>

            {loading ? (
              <p className="text-neutral-500">{t('home.loadingCourses')}</p>
            ) : noResultsFromSearch ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
                <p className="text-lg font-bold text-red-600">
                  {query
                    ? t('home.noResults', { query })
                    : t('home.noResultsFilter', { filter: filterLabel })}
                </p>
                <p className="text-red-700/80 mt-2 text-sm max-w-md mx-auto">{t('home.noResultsHint')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setActiveFilter('filter.all')
                  }}
                  className="mt-4 text-sm font-bold text-red-600 underline hover:text-red-800"
                >
                  {t('home.clearSearch')}
                </button>
              </div>
            ) : noCoursesAtAll ? (
              <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-12 text-center">
                <p className="text-lg font-semibold text-neutral-900">{t('home.noPublished')}</p>
                <p className="text-neutral-600 mt-2 max-w-md mx-auto text-sm">
                  {t('home.noPublishedHint')}
                  {isInstructor && (
                    <>
                      {' '}
                      <Link to="/instrutor/novo-curso" className="font-bold underline">
                        {t('home.newCourse')}
                      </Link>
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {filtered.map((course) => (
                  <CourseCard key={course.id} course={course} variant="horizontal" />
                ))}
              </div>
            )}
          </div>

          <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 order-1 lg:order-2">
            <AthenaAssistant />
          </div>
        </div>
      </div>
    </div>
  )
}
