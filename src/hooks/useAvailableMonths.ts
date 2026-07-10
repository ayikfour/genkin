import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Plain one-shot fetch (no realtime subscription), unlike useExpenses — this
// is mounted alongside a page's own useExpenses() call (TopNavMonthFilter
// sits next to LogPage/DashboardPage), and a second live `expenses-${id}`
// channel for the same space throws ("cannot add postgres_changes callbacks
// ... after subscribe()") since Supabase reuses the channel instance for a
// given topic. Distinct month keys change rarely enough that a fetch-once
// list (refreshed on next navigation/remount) is an acceptable trade for
// avoiding a second concurrent subscription to the same topic.
export function useAvailableMonths(spaceId: string | undefined) {
  const [months, setMonths] = useState<string[]>([])

  useEffect(() => {
    if (!spaceId) return
    supabase
      .from('expenses')
      .select('expense_date')
      .then(({ data }) => {
        const set = new Set((data ?? []).map(e => (e.expense_date as string).slice(0, 7)))
        setMonths(Array.from(set).sort((a, b) => b.localeCompare(a)))
      })
  }, [spaceId])

  return months
}
