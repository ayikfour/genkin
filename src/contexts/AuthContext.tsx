import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { DEFAULT_CURRENCY_CODE } from '../lib/currencies'
import { materializeDueRecurringExpenses } from '../lib/recurringExpenses'

interface SpaceInfo {
  space_id: string
  display_name: string
  avatar_url: string | null
  currency_code: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  space: SpaceInfo | null
  hasPassword: boolean
  loading: boolean
  needsOnboarding: boolean
  signOut: () => Promise<void>
  refreshSpace: () => Promise<void>
  refreshHasPassword: () => Promise<void>
  completeOnboarding: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Default display name for a silently auto-provisioned solo space —
// just the email's local part; the user can rename anytime via
// Settings → "Your name".
function defaultDisplayName(email: string | undefined) {
  return email?.split('@')[0] ?? 'You'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [space, setSpace] = useState<SpaceInfo | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const materializedForSpaceId = useRef<string | null>(null)

  async function fetchSpace(userId: string) {
    const { data } = await supabase
      .from('space_members')
      .select('space_id, display_name, avatar_url, spaces(currency_code)')
      .eq('user_id', userId)
      .maybeSingle()
    if (!data) { setSpace(null); return }
    const spaces = data.spaces as { currency_code: string } | { currency_code: string }[] | null
    const currency_code = (Array.isArray(spaces) ? spaces[0]?.currency_code : spaces?.currency_code) ?? DEFAULT_CURRENCY_CODE
    setSpace({ space_id: data.space_id, display_name: data.display_name, avatar_url: data.avatar_url, currency_code })
  }

  // Every user always belongs to exactly one space — a brand-new user
  // gets a solo one silently, rather than being forced through a
  // Create/Join choice before they can use the app.
  async function ensureSpace(user: User) {
    await fetchSpace(user.id)
    const { data } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) return
    const name = defaultDisplayName(user.email)
    await supabase.rpc('create_space', { space_name: `${name}'s space`, display_name: name })
    await fetchSpace(user.id)
  }

  async function fetchHasPassword() {
    const { data } = await supabase.rpc('user_has_password')
    setHasPassword(data ?? false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        Promise.all([ensureSpace(data.session.user), fetchHasPassword()]).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) {
        ensureSpace(s.user)
        fetchHasPassword()
      } else {
        setSpace(null)
        setHasPassword(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Runs once per space per session — there's no scheduled-job infra in
  // this app, so recurring expenses are materialized lazily whenever
  // someone opens it. See src/lib/recurringExpenses.ts.
  useEffect(() => {
    if (!space?.space_id || materializedForSpaceId.current === space.space_id) return
    materializedForSpaceId.current = space.space_id
    materializeDueRecurringExpenses()
  }, [space?.space_id])

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshSpace() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await fetchSpace(user.id)
  }

  // Marks the one-time first-run walkthrough (src/pages/OnboardingPage.tsx)
  // as done, permanently, for this account. Lives in auth user_metadata
  // rather than space_members: leave_space()/join_space() delete and
  // recreate a user's space_members row on every switch, so a flag stored
  // there would be wiped by an ordinary "switch spaces" action and
  // incorrectly re-show onboarding to someone who already completed it.
  async function completeOnboarding() {
    const { data, error } = await supabase.auth.updateUser({ data: { onboarding_completed: true } })
    if (!error && data.user) setSession(s => (s ? { ...s, user: data.user } : s))
  }

  const user = session?.user ?? null
  const needsOnboarding = !!space && user?.user_metadata?.onboarding_completed !== true

  return (
    <AuthContext.Provider value={{ session, user, space, hasPassword, loading, needsOnboarding, signOut, refreshSpace, refreshHasPassword: fetchHasPassword, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
