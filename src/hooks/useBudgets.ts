import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Budget } from '../types'

export function useBudgets(spaceId: string | undefined) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  function fetchBudgets() {
    if (!spaceId) return
    return supabase
      .from('budgets')
      .select('user_id, effective_month, monthly_amount, updated_at')
      .then(({ data }) => {
        setBudgets(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchBudgets()
  }, [spaceId])

  return { budgets, loading, refetch: fetchBudgets }
}
