export interface Expense {
  id: string
  couple_id: string
  paid_by: string
  logged_by: string
  amount: number
  category: string
  description: string
  expense_date: string
  created_at: string
  recurring_expense_id: string | null
}

export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly'

export interface RecurringExpense {
  id: string
  couple_id: string
  paid_by: string
  created_by: string
  amount: number
  category: string
  description: string
  frequency: RecurrenceFrequency
  start_date: string
  next_due_date: string
  active: boolean
  created_at: string
}

export interface Category {
  id: number
  name: string
  icon: string
}

export interface CoupleMember {
  user_id: string
  display_name: string
}
