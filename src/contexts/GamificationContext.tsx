import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import {
  isRpcMissing,
  userTimezone,
  type BuyFreezeResult,
  type CompleteLessonResult,
  type CourseTrail,
  type GamificationStatus,
} from '../lib/gamification'

const EMPTY_STATUS: GamificationStatus = {
  total_xp: 0,
  coin_balance: 0,
  current_streak: 0,
  longest_streak: 0,
  freeze_count: 0,
  freeze_used: false,
  streak_broken: false,
  broken_from: 0,
  last_activity_date: null,
  activity_dates: [],
  freeze_cost: 200,
  today: new Date().toISOString().slice(0, 10),
}

interface GamificationContextValue {
  status: GamificationStatus
  loading: boolean
  unavailable: boolean
  refresh: () => Promise<void>
  completeLesson: (lessonId: string) => Promise<CompleteLessonResult | null>
  fetchTrail: (courseId: string) => Promise<CourseTrail | null>
  buyFreeze: () => Promise<BuyFreezeResult | null>
  ackBrokenStreak: () => Promise<void>
}

const GamificationContext = createContext<GamificationContextValue | null>(null)

function asStatus(raw: unknown): GamificationStatus {
  const d = (raw ?? {}) as Partial<GamificationStatus>
  const dates = Array.isArray(d.activity_dates)
    ? d.activity_dates.map((x) => String(x).slice(0, 10))
    : []
  return {
    total_xp: Number(d.total_xp ?? 0),
    coin_balance: Number(d.coin_balance ?? 0),
    current_streak: Number(d.current_streak ?? 0),
    longest_streak: Number(d.longest_streak ?? 0),
    freeze_count: Number(d.freeze_count ?? 0),
    freeze_used: Boolean(d.freeze_used),
    streak_broken: Boolean(d.streak_broken),
    broken_from: Number(d.broken_from ?? 0),
    last_activity_date: d.last_activity_date ? String(d.last_activity_date).slice(0, 10) : null,
    activity_dates: dates,
    freeze_cost: Number(d.freeze_cost ?? 200),
    today: String(d.today ?? EMPTY_STATUS.today).slice(0, 10),
  }
}

function asComplete(raw: unknown): CompleteLessonResult | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<CompleteLessonResult>
  return {
    ok: Boolean(d.ok),
    already_completed: Boolean(d.already_completed),
    lesson_id: String(d.lesson_id ?? ''),
    lesson_title: String(d.lesson_title ?? ''),
    content_type: d.content_type === 'quiz' || d.content_type === 'simulado' ? d.content_type : 'lesson',
    xp_awarded: Number(d.xp_awarded ?? 0),
    coins_awarded: Number(d.coins_awarded ?? 0),
    total_xp: Number(d.total_xp ?? 0),
    coin_balance: Number(d.coin_balance ?? 0),
    current_streak: Number(d.current_streak ?? 0),
    longest_streak: Number(d.longest_streak ?? 0),
    freeze_count: Number(d.freeze_count ?? 0),
    freeze_used: Boolean(d.freeze_used),
    streak_broken: Boolean(d.streak_broken),
    broken_from: Number(d.broken_from ?? 0),
    course_id: String(d.course_id ?? ''),
    completed_count: Number(d.completed_count ?? 0),
    total_lessons: Number(d.total_lessons ?? 0),
    next_lesson_id: d.next_lesson_id ? String(d.next_lesson_id) : null,
    next_lesson_title: d.next_lesson_title ? String(d.next_lesson_title) : null,
  }
}

function asTrail(raw: unknown): CourseTrail | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<CourseTrail>
  const lessons = Array.isArray(d.lessons) ? d.lessons : []
  return {
    course_id: String(d.course_id ?? ''),
    completed_count: Number(d.completed_count ?? 0),
    total_lessons: Number(d.total_lessons ?? lessons.length),
    lessons: lessons.map((l) => ({
      id: String(l.id),
      title: String(l.title ?? ''),
      description: l.description ?? null,
      sort_order: Number(l.sort_order ?? 0),
      content_type: l.content_type === 'quiz' || l.content_type === 'simulado' ? l.content_type : 'lesson',
      xp_reward: Number(l.xp_reward ?? 10),
      is_preview: Boolean(l.is_preview),
      duration_minutes: Number(l.duration_minutes ?? 0),
      completed: Boolean(l.completed),
      completed_at: l.completed_at ?? null,
    })),
  }
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<GamificationStatus>(EMPTY_STATUS)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(EMPTY_STATUS)
      setUnavailable(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase.rpc('get_gamification_status', {
      p_timezone: userTimezone(),
    })
    setLoading(false)
    if (error) {
      setUnavailable(isRpcMissing(error))
      return
    }
    setUnavailable(false)
    setStatus(asStatus(data))
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const completeLesson = useCallback(async (lessonId: string) => {
    const { data, error } = await supabase.rpc('complete_lesson', {
      p_lesson_id: lessonId,
      p_timezone: userTimezone(),
    })
    if (error) {
      if (isRpcMissing(error)) setUnavailable(true)
      console.error(error.message)
      return null
    }
    const result = asComplete(data)
    if (result) {
      setStatus((prev) => ({
        ...prev,
        total_xp: result.total_xp,
        coin_balance: result.coin_balance,
        current_streak: result.current_streak,
        longest_streak: result.longest_streak,
        freeze_count: result.freeze_count,
        freeze_used: result.freeze_used,
        streak_broken: result.streak_broken,
        broken_from: result.broken_from,
      }))
      void refresh()
    }
    return result
  }, [refresh])

  const fetchTrail = useCallback(async (courseId: string) => {
    const { data, error } = await supabase.rpc('get_course_trail', {
      p_course_id: courseId,
    })
    if (error) {
      if (isRpcMissing(error)) setUnavailable(true)
      return null
    }
    return asTrail(data)
  }, [])

  const buyFreeze = useCallback(async () => {
    const { data, error } = await supabase.rpc('buy_streak_freeze')
    if (error) {
      if (isRpcMissing(error)) setUnavailable(true)
      return null
    }
    const raw = (data ?? {}) as Partial<BuyFreezeResult>
    const result: BuyFreezeResult = {
      ok: Boolean(raw.ok),
      error: raw.error,
      coin_balance: Number(raw.coin_balance ?? 0),
      freeze_count: Number(raw.freeze_count ?? 0),
      freeze_cost: Number(raw.freeze_cost ?? 200),
    }
    if (result.ok) {
      setStatus((prev) => ({
        ...prev,
        coin_balance: result.coin_balance,
        freeze_count: result.freeze_count,
      }))
    }
    return result
  }, [])

  const ackBrokenStreak = useCallback(async () => {
    await supabase.rpc('ack_broken_streak')
    setStatus((prev) => ({ ...prev, broken_from: 0, streak_broken: false }))
  }, [])

  const value = useMemo(
    () => ({
      status,
      loading,
      unavailable,
      refresh,
      completeLesson,
      fetchTrail,
      buyFreeze,
      ackBrokenStreak,
    }),
    [status, loading, unavailable, refresh, completeLesson, fetchTrail, buyFreeze, ackBrokenStreak]
  )

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>
}

export function useGamification() {
  const ctx = useContext(GamificationContext)
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider')
  return ctx
}
