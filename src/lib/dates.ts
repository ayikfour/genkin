import { addWeeks, addMonths, addYears } from 'date-fns'
import type { RecurrenceFrequency } from '../types'

// expense_date (and recurring_expenses.next_due_date/start_date) are stored
// as plain YYYY-MM-DD strings. Parse/format at local noon/local Y-M-D (not
// toISOString, which is UTC-based) so the date can't shift by a day
// depending on the viewer's timezone offset.
export function parseISODateLocal(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

export function toISODateLocal(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function nextOccurrence(iso: string, frequency: RecurrenceFrequency): string {
  const d = parseISODateLocal(iso)
  const next =
    frequency === 'weekly' ? addWeeks(d, 1) : frequency === 'monthly' ? addMonths(d, 1) : addYears(d, 1)
  return toISODateLocal(next)
}
