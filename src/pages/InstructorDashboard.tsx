import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
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

  if (profile?.role !== 'instructor') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-600">{t('instructor.notInstructor')}</p>
        <Link to="/explorar" className="text-brand mt-4 inline-block hover:underline">
          {t('instructor.backHome')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">{t('instructor.title')}</h1>
        <Link
          to="/instrutor/novo-curso"
          className="px-4 py-2 bg-brand text-white rounded font-medium hover:bg-brand-dark"
        >
          {t('instructor.newCourse')}
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : courses.length === 0 ? (
        <p className="text-slate-600">{t('instructor.empty')}</p>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3">{t('instructor.colTitle')}</th>
                <th className="text-left p-3">{t('instructor.colStatus')}</th>
                <th className="text-left p-3">{t('instructor.colPrice')}</th>
                <th className="text-left p-3">{t('instructor.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{c.title}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        c.published ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.published ? t('instructor.published') : t('instructor.draft')}
                    </span>
                  </td>
                  <td className="p-3">
                    {c.price > 0 ? `R$ ${Number(c.price).toFixed(2)}` : t('common.free')}
                  </td>
                  <td className="p-3">
                    <Link to={`/curso/${c.id}`} className="text-brand hover:underline">
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
  )
}
