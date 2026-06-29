import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface CoupleInfo {
  couple_id: string
  display_name: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  couple: CoupleInfo | null
  loading: boolean
  signOut: () => Promise<void>
  refreshCouple: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [couple, setCouple] = useState<CoupleInfo | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchCouple(userId: string) {
    const { data } = await supabase
      .from('couple_members')
      .select('couple_id, display_name')
      .eq('user_id', userId)
      .maybeSingle()
    setCouple(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) fetchCouple(data.session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) fetchCouple(s.user.id)
      else setCouple(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshCouple() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await fetchCouple(user.id)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, couple, loading, signOut, refreshCouple }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
