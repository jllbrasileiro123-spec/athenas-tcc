import type { Profile } from '../types/database'

const KEY = 'athenas_profile_v1'

export function readProfileCache(userId: string): Profile | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id: string; profile: Profile }
    if (parsed.id !== userId) return null
    return parsed.profile
  } catch {
    return null
  }
}

export function writeProfileCache(userId: string, profile: Profile) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ id: userId, profile }))
  } catch {
    /* quota exceeded — ignore */
  }
}

export function clearProfileCache() {
  sessionStorage.removeItem(KEY)
}
