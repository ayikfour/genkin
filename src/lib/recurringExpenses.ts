import { supabase } from './supabase'
import { nextOccurrence, toISODateLocal } from './dates'
import type { RecurringExpense } from '../types'

// Postgres unique_violation — expected here when the partner's device
// already materialized this occurrence first; see the unique index in
// 0006_recurring_expenses.sql.
const UNIQUE_VIOLATION = '23505'

// Guards against a runaway loop if a couple's template goes unvisited for a
// very long time (shouldn't happen in practice, but a lazy client-side
// scheduler has no other backstop).
const MAX_OCCURRENCES_PER_TEMPLATE = 500

// Materializes any recurring-expense occurrences that have come due since
// the last time either partner opened the app, as real `expenses` rows.
// There's no scheduled-job infra in this app (see CLAUDE.md), so this runs
// once per session instead, from AuthContext once the couple is known.
export async function materializeDueRecurringExpenses(coupleId: string): Promise<void> {
  const today = toISODateLocal(new Date())

  const { data: due } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('couple_id', coupleId)
    .eq('active', true)
    .lte('next_due_date', today)

  if (!due || due.length === 0) return

  for (const template of due as RecurringExpense[]) {
    let nextDue = template.next_due_date
    let iterations = 0

    while (nextDue <= today && iterations < MAX_OCCURRENCES_PER_TEMPLATE) {
      const { error } = await supabase.from('expenses').insert({
        couple_id: template.couple_id,
        paid_by: template.paid_by,
        logged_by: template.created_by,
        amount: template.amount,
        category: template.category,
        description: template.description,
        expense_date: nextDue,
        recurring_expense_id: template.id,
      })

      if (error && error.code !== UNIQUE_VIOLATION) break

      nextDue = nextOccurrence(nextDue, template.frequency)
      iterations++
    }

    if (nextDue !== template.next_due_date) {
      await supabase.from('recurring_expenses').update({ next_due_date: nextDue }).eq('id', template.id)
    }
  }
}
