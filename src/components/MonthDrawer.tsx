import { useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  months: string[] // 'YYYY-MM', most recent first
  selectedMonth: string
  onSelect: (month: string) => void
}

function monthLabel(month: string, multiYear: boolean): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1, 1)
  const label = date.toLocaleDateString('en-US', { month: 'long' })
  return multiYear ? `${label} ${year}` : label
}

export function MonthDrawer({ months, selectedMonth, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const multiYear = new Set(months.map(m => m.slice(0, 4))).size > 1

  if (months.length === 0) return null

  return (
    <>
      <Button onClick={() => setOpen(true)} className="h-12 gap-1.5 px-4">
        {monthLabel(selectedMonth, multiYear)}
        <CaretDown className="size-3.5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Month</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {months.map(month => (
              <Chip
                key={month}
                pressed={selectedMonth === month}
                onPressedChange={() => { onSelect(month); setOpen(false) }}
              >
                {monthLabel(month, multiYear)}
              </Chip>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
