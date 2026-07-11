import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatCurrency, formatDateLabel } from '../lib/format'
import type { Expense, Category, SpaceMember } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  date: string | null
  expenses: Expense[]
  categories: Category[]
  members: SpaceMember[]
  userId: string | undefined
  currencyCode: string
}

export function DayExpensesSheet({ isOpen, onClose, date, expenses, categories, members, userId, currencyCode }: Props) {
  const catIcons = Object.fromEntries(categories.map(c => [c.name, c.icon]))
  const dayExpenses = date ? expenses.filter(e => e.expense_date === date) : []
  const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{date ? formatDateLabel(date) : ''}</SheetTitle>
          <p className="font-heading text-sm text-muted-foreground">{formatCurrency(total, currencyCode)}</p>
        </SheetHeader>

        <div className="pb-4">
          {dayExpenses.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">No expenses logged this day.</p>
          ) : (
            dayExpenses.map(expense => {
              const payer = members.find(m => m.user_id === expense.paid_by)
              const payerLabel = expense.paid_by === userId
                ? 'You'
                : expense.paid_by
                  ? (payer?.display_name ?? 'Partner')
                  : 'Partner'

              return (
                <div key={expense.id} className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                    {catIcons[expense.category] ?? '📦'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate text-base font-medium text-foreground">{expense.category}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {expense.description ? `${expense.description} · ${payerLabel}` : payerLabel}
                    </p>
                  </div>
                  <span className="font-heading shrink-0 text-base font-medium text-foreground">
                    {formatCurrency(expense.amount, currencyCode)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
