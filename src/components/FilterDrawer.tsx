import { useState, useEffect } from 'react'
import { Check } from '@phosphor-icons/react'
import { useAppSound } from '../hooks/useAppSound'
import type { Category, SpaceMember } from '../types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface Props {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  members: SpaceMember[]
  currentUserId: string | undefined
  selectedCategories: string[]
  selectedPayer: string | null
  onApply: (categories: string[], payer: string | null) => void
}

export function FilterDrawer({
  isOpen,
  onClose,
  categories,
  members,
  currentUserId,
  selectedCategories,
  selectedPayer,
  onApply,
}: Props) {
  const playSound = useAppSound()
  const [pendingCategories, setPendingCategories] = useState<string[]>(selectedCategories)
  const [pendingPayer, setPendingPayer] = useState<string | null>(selectedPayer)

  useEffect(() => {
    if (!isOpen) return
    setPendingCategories(selectedCategories)
    setPendingPayer(selectedPayer)
  }, [isOpen, selectedCategories, selectedPayer])

  const payerOptions = members.map(m => ({
    label: m.user_id === currentUserId ? 'You' : m.display_name,
    value: m.user_id,
  }))

  function toggleCategory(name: string) {
    playSound(pendingCategories.includes(name) ? 'deselect' : 'select')
    setPendingCategories(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    )
  }

  function handleReset() {
    playSound('undo')
    setPendingCategories([])
    setPendingPayer(null)
    onApply([], null)
    onClose()
  }

  function handleFilter() {
    playSound('select')
    onApply(pendingCategories, pendingPayer)
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" showCloseButton={false} className="flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl">
        <SheetHeader className="shrink-0">
          <SheetTitle>Filter</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4" data-sheet-scroll>
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Paid by
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              {payerOptions.map(opt => {
                const selected = pendingPayer === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      playSound(selected ? 'deselect' : 'select')
                      setPendingPayer(selected ? null : opt.value)
                    }}
                    className="flex w-full items-center justify-between border-b border-border px-4 py-3.5 text-left text-sm font-medium text-foreground last:border-b-0"
                  >
                    {opt.label}
                    {selected && <Check className="size-4" weight="bold" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Category
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              {categories.map(cat => {
                const selected = pendingCategories.includes(cat.name)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.name)}
                    className="flex w-full items-center justify-between border-b border-border px-4 py-3.5 text-left text-sm font-medium text-foreground last:border-b-0"
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span> {cat.name}
                    </span>
                    {selected && <Check className="size-4" weight="bold" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row border-t border-border">
          <Button variant="secondary" onClick={handleReset} className="flex-1">
            Reset
          </Button>
          <Button onClick={handleFilter} className="flex-1">
            Filter
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
