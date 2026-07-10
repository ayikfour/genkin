import { formatCurrency, formatDateLabel } from './format'
import type { ExpenseActivity, ExpenseActivitySnapshot } from '../types'

// 'verb-success'/'verb-danger' color the action word (reusing the app's only
// two semantic tones — --color-success/--color-danger — rather than
// introducing a third; 'edited'-style verbs stay plain since there's no
// neutral third tone in design.md). 'date' renders muted, for the "🗓️ …"
// fragment referencing the expense's logged date, kept visually distinct
// from the activity's own timestamp shown below the row.
export type FeedMessageVariant = 'verb-success' | 'verb-danger' | 'date'

export interface FeedMessageSegment {
  text: string
  variant?: FeedMessageVariant
}

type IconLookup = (category: string) => string

export function buildFeedMessage(
  activity: ExpenseActivity,
  actorName: string,
  currencyCode: string,
  getCategoryIcon: IconLookup,
): FeedMessageSegment[] {
  const amount = (n: number) => formatCurrency(n, currencyCode)
  const data = (activity.new_data ?? activity.old_data) as ExpenseActivitySnapshot
  const dateTag = (iso: string) => `🗓️ ${formatDateLabel(iso)}`

  if (activity.action === 'created') {
    const icon = getCategoryIcon(data.category)
    // Auto-materialized recurring occurrences aren't a deliberate action by
    // whoever's session happened to trigger them — don't credit a person.
    if (data.recurring_expense_id) {
      return [
        { text: `${icon} ${data.category} was ` },
        { text: 'auto-logged', variant: 'verb-success' },
        { text: ` for ${amount(data.amount)}` },
      ]
    }
    return [
      { text: `${actorName} ` },
      { text: 'logged', variant: 'verb-success' },
      { text: ` ${icon} ${data.category} for ${amount(data.amount)}` },
    ]
  }

  if (activity.action === 'deleted') {
    const icon = getCategoryIcon(data.category)
    return [
      { text: `${actorName} ` },
      { text: 'deleted', variant: 'verb-danger' },
      { text: ` a ${amount(data.amount)} ${icon} ${data.category} log ` },
      { text: `· ${dateTag(data.expense_date)}`, variant: 'date' },
    ]
  }

  // 'updated' — headline the single most salient changed field rather than
  // enumerating every simultaneous change.
  const oldData = activity.old_data as ExpenseActivitySnapshot
  const newData = activity.new_data as ExpenseActivitySnapshot
  const icon = getCategoryIcon(newData.category)

  if (oldData.amount !== newData.amount) {
    return [
      { text: `${actorName} edited ${icon} ${newData.category} log ` },
      { text: `· ${dateTag(newData.expense_date)} `, variant: 'date' },
      { text: `from ${amount(oldData.amount)} to ${amount(newData.amount)}` },
    ]
  }
  if (oldData.category !== newData.category) {
    const oldIcon = getCategoryIcon(oldData.category)
    return [
      { text: `${actorName} edited a log ` },
      { text: `· ${dateTag(newData.expense_date)} `, variant: 'date' },
      { text: `from ${oldIcon} ${oldData.category} to ${icon} ${newData.category}` },
    ]
  }
  if (oldData.expense_date !== newData.expense_date) {
    return [
      { text: `${actorName} moved a ${icon} ${newData.category} log from ` },
      { text: dateTag(oldData.expense_date), variant: 'date' },
      { text: ' to ' },
      { text: dateTag(newData.expense_date), variant: 'date' },
    ]
  }
  if (oldData.paid_by !== newData.paid_by) {
    return [
      { text: `${actorName} changed who paid for a ${icon} ${newData.category} log ` },
      { text: `· ${dateTag(newData.expense_date)}`, variant: 'date' },
    ]
  }
  return [
    { text: `${actorName} edited ${icon} ${newData.category} log ` },
    { text: `· ${dateTag(newData.expense_date)}`, variant: 'date' },
  ]
}
