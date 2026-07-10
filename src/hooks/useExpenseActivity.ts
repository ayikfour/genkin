import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { ExpenseActivity } from '../types'

const ACTIVITY_LIMIT = 100

export function useExpenseActivity(spaceId: string | undefined) {
  const [activity, setActivity] = useState<ExpenseActivity[]>([])
  const [loading, setLoading] = useState(true)

  function fetchActivity() {
    return supabase
      .from('expense_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_LIMIT)
      .then(({ data }) => {
        setActivity(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!spaceId) return
    let mounted = true

    supabase
      .from('expense_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ACTIVITY_LIMIT)
      .then(({ data }) => {
        if (mounted) { setActivity(data ?? []); setLoading(false) }
      })

    return () => { mounted = false }
  }, [spaceId])

  return { activity, loading, refetch: fetchActivity }
}
