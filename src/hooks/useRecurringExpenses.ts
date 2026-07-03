import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { RecurringExpense } from '../types'

function sortByDueDate(a: RecurringExpense, b: RecurringExpense) {
  return a.next_due_date.localeCompare(b.next_due_date)
}

export function useRecurringExpenses(coupleId: string | undefined) {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)

  function fetchRecurringExpenses() {
    return supabase
      .from('recurring_expenses')
      .select('*')
      .eq('active', true)
      .order('next_due_date', { ascending: true })
      .then(({ data }) => {
        setRecurringExpenses(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!coupleId) return
    let mounted = true

    fetchRecurringExpenses()

    const channel = supabase
      .channel(`recurring-expenses-${coupleId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recurring_expenses' },
        ({ new: row }) => {
          if (!mounted) return
          const r = row as RecurringExpense
          // Mutations already call refetch() right after they resolve, which can
          // land before or after this event — dedupe by id so a fast refetch
          // followed by this event (or vice versa) never renders the row twice.
          if (r.active) setRecurringExpenses(p => p.some(e => e.id === r.id) ? p : [...p, r].sort(sortByDueDate))
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'recurring_expenses' },
        ({ new: row }) => {
          if (!mounted) return
          const r = row as RecurringExpense
          setRecurringExpenses(p =>
            r.active
              ? p.some(e => e.id === r.id) ? p.map(e => e.id === r.id ? r : e).sort(sortByDueDate) : [...p, r].sort(sortByDueDate)
              : p.filter(e => e.id !== r.id)
          )
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'recurring_expenses' },
        ({ old: row }) => { if (mounted) setRecurringExpenses(p => p.filter(e => e.id !== (row as Partial<RecurringExpense>).id)) })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [coupleId])

  return { recurringExpenses, loading, refetch: fetchRecurringExpenses }
}
