import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { resizeAvatarImage } from '../lib/imageResize'
import { clearProfileCache, readProfileCache, writeProfileCache } from '../lib/profileCache'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

const PROFILE_SELECT = 'id, full_name, avatar_url, role, phone, created_at'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  /** true até saber se há sessão (não espera o perfil) */
  initializing: boolean
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  uploadAvatar: (file: File) => Promise<{ error: string | null }>
  uploadingAvatar: boolean
  updateProfile: (data: { full_name?: string; phone?: string }) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function shouldRefetchProfile(event: AuthChangeEvent) {
  return event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const profileUserRef = useRef<string | null>(null)

  const applySession = useCallback((s: Session | null) => {
    setSession(s)
    setUser(s?.user ?? null)
    if (!s?.user) {
      profileUserRef.current = null
      setProfile(null)
      clearProfileCache()
      return
    }
    const cached = readProfileCache(s.user.id)
    if (cached) {
      profileUserRef.current = s.user.id
      setProfile(cached)
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .single()

    if (!error && data) {
      const p = data as Profile
      profileUserRef.current = userId
      setProfile(p)
      writeProfileCache(userId, p)
    } else {
      profileUserRef.current = null
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      applySession(s)

      if (s?.user && shouldRefetchProfile(event)) {
        void fetchProfile(s.user.id)
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setInitializing(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [applySession, fetchProfile])

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role = 'student'
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    return { error: error?.message ?? null }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    if (data.session) {
      applySession(data.session)
      setInitializing(false)
      void fetchProfile(data.session.user.id)
    }
    return { error: null }
  }

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/explorar` },
    })
    return { error: error?.message ?? null }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    return { error: error?.message ?? null }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    applySession(null)
    setInitializing(false)
    clearProfileCache()
    await supabase.auth.signOut({ scope: 'local' })
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: 'Faça login novamente.' }

    let resized: File
    try {
      resized = await resizeAvatarImage(file)
    } catch {
      return { error: 'Não foi possível processar a imagem.' }
    }

    const preview = URL.createObjectURL(resized)
    const previousUrl = profile?.avatar_url

    setProfile((prev) =>
      prev
        ? { ...prev, avatar_url: preview }
        : {
            id: user.id,
            full_name: null,
            avatar_url: preview,
            phone: null,
            role: 'student',
            created_at: new Date().toISOString(),
          }
    )
    setUploadingAvatar(true)

    const path = `${user.id}/avatar.jpg`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, resized, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })

    if (uploadError) {
      URL.revokeObjectURL(preview)
      setProfile((prev) => (prev ? { ...prev, avatar_url: previousUrl ?? null } : null))
      setUploadingAvatar(false)
      return {
        error:
          'Não foi possível enviar a foto. Crie o bucket "avatars" no Supabase (Storage) ou tente outra imagem.',
      }
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    URL.revokeObjectURL(preview)
    setUploadingAvatar(false)

    if (updateError) {
      setProfile((prev) => (prev ? { ...prev, avatar_url: previousUrl ?? null } : null))
      return { error: updateError.message }
    }

    setProfile((prev) => {
      if (!prev) return prev
      const next = { ...prev, avatar_url: avatarUrl }
      writeProfileCache(user.id, next)
      return next
    })
    return { error: null }
  }

  const updateProfile = async (data: { full_name?: string; phone?: string }) => {
    if (!user) return { error: 'Faça login novamente.' }

    const payload: Record<string, string> = {}
    if (data.full_name !== undefined) payload.full_name = data.full_name.trim()
    if (data.phone !== undefined) payload.phone = data.phone.trim()

    setProfile((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        ...(data.full_name !== undefined ? { full_name: payload.full_name } : {}),
        ...(data.phone !== undefined ? { phone: payload.phone } : {}),
      }
      writeProfileCache(user.id, next)
      return next
    })

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    if (error) {
      void fetchProfile(user.id)
      if (error.message.includes('phone') || error.code === 'PGRST204') {
        return {
          error: 'Coluna phone não existe. Rode supabase/add-phone.sql no SQL Editor.',
        }
      }
      return { error: error.message }
    }
    return { error: null }
  }

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      initializing,
      signUp,
      signIn,
      signInWithOAuth,
      resetPassword,
      updatePassword,
      signOut,
      refreshProfile,
      uploadAvatar,
      uploadingAvatar,
      updateProfile,
    }),
    [user, session, profile, initializing, refreshProfile, uploadingAvatar]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
