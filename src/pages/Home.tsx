import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CourseCard } from '../components/CourseCard'
import { AthenaAssistant } from '../components/AthenaAssistant'
import { BrandMark } from '../components/BrandMark'
import { CatalogIcon, EmptyState, SearchIcon } from '../components/EmptyState'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { courseFilterKeys, courseMatchesFilter, type CourseFilterKey } from '../lib/courseFilters'
import type { Course } from '../types/database'

type SortKey = 'recent' | 'title'

export function Home() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<CourseFilterKey>('filter.all')
  const [sort, setSort] = useState<SortKey>('recent')
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
    void load()
  }, [])

  const filterLabel = t(activeFilter)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = courses.filter((c) => {
      const matchSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
      const matchFilter = courseMatchesFilter(c, activeFilter)
      return matchSearch && matchFilter
    })

    if (sort === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, 'pt'))
    }
    return list
  }, [courses, search, activeFilter, sort])

  const isSearching = search.trim().length > 0 || activeFilter !== 'filter.all'
  const noResultsFromSearch = !loading && isSearching && filtered.length === 0
  const noCoursesAtAll = !loading && courses.length === 0
  const query = search.trim()

  function clearFilters() {
    setSearch('')
    setActiveFilter('filter.all')
  }

  return (
    <div className="bg-brand-cream min-h-full">
      <section className="border-b border-neutral-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 py-6 md:py-10 lg:py-14">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-8">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-gold mb-3 md:mb-4">
                <BrandMark framed className="h-5 w-5" alt="" />
                {t('home.badge')}
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 leading-[1.1]">
                {t('home.title')}
              </h1>
              <p className="mt-3 md:mt-4 text-neutral-600 text-base md:text-lg max-w-xl">
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
                  className="flex-1 px-5 py-3.5 text-neutral-900 outline-none text-base"
                />
                <button
                  type="submit"
                  className="px-6 bg-neutral-950 text-white text-sm font-bold hover:bg-black"
                >
                  {t('common.search')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] mx-auto px-4 py-8 lg:py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <div className="flex-1 min-w-0 order-2 lg:order-1">
            {loadError && (
              <p
                className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
                role="alert"
              >
                {t('home.loadError')}: {loadError}
              </p>
            )}

            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              {t('home.breadcrumb')}
              {activeFilter !== 'filter.all' ? ` / ${filterLabel}` : ''}
              {query ? ` / “${query}”` : ''}
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {courseFilterKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                    activeFilter === key
                      ? 'bg-neutral-950 border-neutral-950 text-brand-gold'
                      : 'bg-white border-neutral-900 text-neutral-900 hover:bg-brand-gold-soft'
                  }`}
                >
                  {t(key)}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">{t('home.published')}</h2>
                <p className="text-sm text-neutral-500 mt-0.5">{t('home.publishedDesc')}</p>
                {!loading && !noCoursesAtAll && (
                  <p className="text-sm text-neutral-700 mt-2 font-medium">
                    {t('home.resultsCount', { count: String(filtered.length) })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!loading && !noCoursesAtAll && (
                  <label className="flex items-center gap-2 text-sm text-neutral-600">
                    <span className="sr-only">{t('home.sortRecent')}</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-gold"
                    >
                      <option value="recent">{t('home.sortRecent')}</option>
                      <option value="title">{t('home.sortTitle')}</option>
                    </select>
                  </label>
                )}
                {!loading && isInstructor && (
                  <Link
                    to="/instrutor/novo-curso"
                    className="text-sm font-bold text-neutral-900 border border-neutral-900 px-4 py-2 rounded-full hover:bg-neutral-900 hover:text-brand-gold transition-colors"
                  >
                    {t('home.newCourse')}
                  </Link>
                )}
              </div>
            </div>

            {loading ? (
              <p className="text-neutral-500">{t('home.loadingCourses')}</p>
            ) : noResultsFromSearch ? (
              <EmptyState
                icon={<SearchIcon />}
                title={t('home.emptyLooking')}
                description={
                  <>
                    {query
                      ? t('home.noResults', { query })
                      : t('home.noResultsFilter', { filter: filterLabel })}
                    <span className="mt-1.5 block">{t('home.noResultsHint')}</span>
                  </>
                }
              >
                <button type="button" onClick={clearFilters} className="btn-primary">
                  {t('home.clearSearch')}
                </button>
              </EmptyState>
            ) : noCoursesAtAll ? (
              <EmptyState
                icon={<CatalogIcon />}
                title={t('home.noPublished')}
                description={t('home.noPublishedHint')}
              >
                {isInstructor ? (
                  <Link to="/instrutor/novo-curso" className="btn-primary inline-flex">
                    {t('home.newCourse')}
                  </Link>
                ) : null}
              </EmptyState>
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
