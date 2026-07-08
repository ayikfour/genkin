import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../types'

function sortDesc(a: Expense, b: Expense) {
  return b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at)
}

export function useExpenses(spaceId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  function fetchExpenses() {
    return supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setExpenses(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!spaceId) return
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
      .channel(`expenses-${spaceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses' },
        ({ new: row }) => {
          // Mutations already call refetch() right after they resolve, which can
          // land before or after this event — dedupe by id so a fast refetch
          // followed by this event (or vice versa) never renders the row twice.
          if (mounted) setExpenses(p => p.some(e => e.id === (row as Expense).id) ? p : [row as Expense, ...p].sort(sortDesc))
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'expenses' },
        ({ new: row }) => { if (mounted) setExpenses(p => p.map(e => e.id === (row as Expense).id ? row as Expense : e)) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'expenses' },
        ({ old: row }) => { if (mounted) setExpenses(p => p.filter(e => e.id !== (row as Partial<Expense>).id)) })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [spaceId])

  return { expenses, loading, refetch: fetchExpenses }
}
