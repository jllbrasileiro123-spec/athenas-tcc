import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '../types/database'

export const DEMO_SESSION_KEY = 'athenas_demo_session'

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

export function isDemoSessionActive() {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(DEMO_SESSION_KEY) === '1'
}

export function setDemoSessionActive(active: boolean) {
  if (typeof window === 'undefined') return
  if (active) sessionStorage.setItem(DEMO_SESSION_KEY, '1')
  else sessionStorage.removeItem(DEMO_SESSION_KEY)
}

export function createDemoUser(): User {
  return {
    id: DEMO_USER_ID,
    app_metadata: {},
    user_metadata: { full_name: 'Demo Athenas', role: 'admin' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'demo@athenas.local',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  } as User
}

export function createDemoProfile(): Profile {
  return {
    id: DEMO_USER_ID,
    full_name: 'Demo Athenas',
    avatar_url: null,
    phone: null,
    role: 'admin',
    created_at: new Date().toISOString(),
  }
}

export function createDemoSession(user: User): Session {
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 60 * 60 * 24,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    token_type: 'bearer',
    user,
  }
}
