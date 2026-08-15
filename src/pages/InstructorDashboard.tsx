import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { EmptyState, FolderIcon } from '../components/EmptyState'
import { BrandMark } from '../components/BrandMark'
import type { Course } from '../types/database'

export function InstructorDashboard() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    const uid: string = user.id
    async function load() {
      const { data } = await supabase
        .from('courses')
        .select(`*, lessons ( id )`)
        .eq('instructor_id', uid)
        .order('created_at', { ascending: false })

      if (data) setCourses(data as Course[])
      setLoading(false)
    }
    load()
  }, [user])

  const canTeach = profile?.role === 'instructor' || profile?.role === 'admin'

  if (!canTeach) {
    return (
      <div className="page-shell">
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-3">
          <p className="text-neutral-600">{t('instructor.notInstructor')}</p>
          <Link to="/tornar-se-instrutor" className="btn-primary inline-flex">
            {t('menu.becomeInstructor')}
          </Link>
          <div>
            <Link to="/explorar" className="link-athenas text-sm">
              {t('instructor.backHome')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold mb-2">
              <BrandMark framed className="h-5 w-5" alt="" />
              ATHENAS
            </p>
            <h1 className="text-2xl font-bold text-neutral-900">{t('instructor.title')}</h1>
          </div>
          <Link to="/instrutor/novo-curso" className="btn-primary">
            {t('instructor.newCourse')}
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner-athenas" />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState icon={<FolderIcon />} title={t('instructor.empty')}>
            <Link to="/instrutor/novo-curso" className="btn-primary inline-flex">
              {t('instructor.newCourse')}
            </Link>
          </EmptyState>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:border-brand-gold/40 transition-colors">
            <table className="w-full text-sm">
              <thead className="bg-brand-cream border-b border-brand-gold/20">
                <tr>
                  <th className="text-left p-3 text-neutral-700">{t('instructor.colTitle')}</th>
                  <th className="text-left p-3 text-neutral-700">{t('instructor.colStatus')}</th>
                  <th className="text-left p-3 text-neutral-700">{t('instructor.colPrice')}</th>
                  <th className="text-left p-3 text-neutral-700">{t('instructor.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                    <td className="p-3 font-medium text-neutral-900">{c.title}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          c.published || c.review_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : c.review_status === 'pending_review'
                              ? 'bg-amber-100 text-amber-900'
                              : c.review_status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-brand-gold-soft text-neutral-700'
                        }`}
                      >
                        {c.published || c.review_status === 'approved'
                          ? t('instructor.published')
                          : c.review_status === 'pending_review'
                            ? t('instructor.pendingReview')
                            : c.review_status === 'rejected'
                              ? t('instructor.rejected')
                              : t('instructor.draft')}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-700">
                      {c.price > 0 ? `R$ ${Number(c.price).toFixed(2)}` : t('common.free')}
                    </td>
                    <td className="p-3">
                      <Link to={`/curso/${c.id}`} className="link-athenas">
                        {t('instructor.view')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
