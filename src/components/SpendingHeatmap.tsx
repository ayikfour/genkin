import { useMemo, useState } from 'react'
import { formatCurrency } from '../lib/format'
import { toISODateLocal } from '../lib/dates'
import { DayExpensesSheet } from './DayExpensesSheet'
import type { Expense, Category, SpaceMember } from '../types'

interface DailySpendEntry {
  date: string
  label: string
  total: number
}

interface Props {
  expenses: Expense[]
  categories: Category[]
  members: SpaceMember[]
  userId: string | undefined
  currencyCode: string
  now: Date
}

const DAYS_SHOWN = 365
const LEGEND_COLORS = ['var(--muted)', 'var(--chart-4)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-1)']

function intensityColor(total: number, max: number): string {
  if (total <= 0 || max <= 0) return 'var(--muted)'
  const ratio = total / max
  if (ratio > 0.75) return 'var(--chart-1)'
  if (ratio > 0.5) return 'var(--chart-2)'
  if (ratio > 0.25) return 'var(--chart-3)'
  return 'var(--chart-4)'
}

export function SpendingHeatmap({ expenses, categories, members, userId, currencyCode, now }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const days = useMemo<DailySpendEntry[]>(() => {
    const dayTotals = new Map<string, number>()
    for (const e of expenses) dayTotals.set(e.expense_date, (dayTotals.get(e.expense_date) ?? 0) + e.amount)

    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // today
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - (DAYS_SHOWN - 1))

    const result: DailySpendEntry[] = []
    for (const d = new Date(endDate); d >= startDate; d.setDate(d.getDate() - 1)) {
      const dateKey = toISODateLocal(d)
      result.push({
        date: dateKey,
        label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        total: dayTotals.get(dateKey) ?? 0,
      })
    }
    return result
  }, [expenses, now])

  const maxTotal = useMemo(() => Math.max(0, ...days.map(d => d.total)), [days])

  function handleCellClick(day: DailySpendEntry) {
    if (day.total <= 0) return
    setSelectedDate(day.date)
    setSheetOpen(true)
  }

  return (
    <div className="border-b border-border px-5 py-5 last:border-b-0">
      <p className="mb-3 text-xs tracking-wide text-muted-foreground uppercase">
        Spending activity
      </p>

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses logged yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {days.map(day => (
              <button
                key={day.date}
                type="button"
                onClick={() => handleCellClick(day)}
                disabled={day.total <= 0}
                aria-label={`${day.label}: ${formatCurrency(day.total, currencyCode)}`}
                className="size-2 rounded-[1px] disabled:cursor-default"
                style={{ background: intensityColor(day.total, maxTotal) }}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Less</span>
            {LEGEND_COLORS.map((color, i) => (
              <span key={i} className="size-2 rounded-[1px]" style={{ background: color }} />
            ))}
            <span>More</span>
          </div>
        </>
      )}

      <DayExpensesSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={selectedDate}
        expenses={expenses}
        categories={categories}
        members={members}
        userId={userId}
        currencyCode={currencyCode}
      />
    </div>
  )
}
