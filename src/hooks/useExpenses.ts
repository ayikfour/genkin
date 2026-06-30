import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../types'

function sortDesc(a: Expense, b: Expense) {
  return b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at)
}

export function useExpenses(coupleId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!coupleId) return
    let mounted = true

    supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (mounted) { setExpenses(data ?? []); setLoading(false) }
      })

    const channel = supabase
      .channel(`expenses-${coupleId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses' },
        ({ new: row }) => { if (mounted) setExpenses(p => [row as Expense, ...p].sort(sortDesc)) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'expenses' },
        ({ new: row }) => { if (mounted) setExpenses(p => p.map(e => e.id === (row as Expense).id ? row as Expense : e)) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses' },
        ({ old: row }) => { if (mounted) setExpenses(p => p.filter(e => e.id !== (row as Partial<Expense>).id)) })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [coupleId])

  return { expenses, loading }
}
