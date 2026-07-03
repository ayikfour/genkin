import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateLabel } from '../lib/format'
import { DEFAULT_CURRENCY_CODE } from '../lib/currencies'
import type { Category, RecurringExpense } from '../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const FREQUENCY_LABEL = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' } as const

interface Props {
  recurringExpenses: RecurringExpense[]
  categories: Category[]
  currencyCode?: string
  onStopped: () => void
}

export function UpcomingRecurring({ recurringExpenses, categories, currencyCode, onStopped }: Props) {
  const [stoppingId, setStoppingId] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)

  if (recurringExpenses.length === 0) return null

  const catIcons = Object.fromEntries(categories.map(c => [c.name, c.icon]))
  const stoppingTemplate = recurringExpenses.find(r => r.id === stoppingId)

  async function handleConfirmStop() {
    if (!stoppingId) return
    setStopping(true)
    await supabase.from('recurring_expenses').update({ active: false }).eq('id', stoppingId)
    setStopping(false)
    setStoppingId(null)
    onStopped()
  }

  return (
    <>
      <div className="px-5 pt-3">
        <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Upcoming
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          {recurringExpenses.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setStoppingId(r.id)}
              className="flex w-full items-center justify-between gap-2 border-b border-border px-4 py-3.5 text-left last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span>{catIcons[r.category] ?? '📦'}</span>
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {r.description || r.category}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-heading text-sm text-foreground">
                  {formatCurrency(r.amount, currencyCode ?? DEFAULT_CURRENCY_CODE)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {FREQUENCY_LABEL[r.frequency]} · next {formatDateLabel(r.next_due_date)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!stoppingId} onOpenChange={open => !open && setStoppingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop this recurring expense?</DialogTitle>
            <DialogDescription>
              {stoppingTemplate && (
                <>
                  {stoppingTemplate.description || stoppingTemplate.category} ·{' '}
                  {formatCurrency(stoppingTemplate.amount, currencyCode ?? DEFAULT_CURRENCY_CODE)}
                  <br />
                  No more occurrences will be created. Expenses already logged from it stay as-is.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmStop} disabled={stopping}>
              {stopping ? 'Stopping…' : 'Stop'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
