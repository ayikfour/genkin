import { Check } from '@phosphor-icons/react'
import { CURRENCIES } from '../lib/currencies'
import { useAppSound } from '../hooks/useAppSound'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  isOpen: boolean
  onClose: () => void
  selectedCode: string
  onSelect: (code: string) => void
}

export function CurrencyDrawer({ isOpen, onClose, selectedCode, onSelect }: Props) {
  const playSound = useAppSound()
  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" showCloseButton={false} className="max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Currency</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-4">
          <div className="overflow-hidden rounded-lg border border-border">
            {CURRENCIES.map(currency => {
              const selected = selectedCode === currency.code
              return (
                <button
                  key={currency.code}
                  onClick={() => { playSound('select'); onSelect(currency.code); onClose() }}
                  className="flex w-full items-center justify-between border-b border-border px-4 py-3.5 text-left text-sm font-medium text-foreground last:border-b-0"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">{currency.symbol}</span> {currency.name}
                  </span>
                  {selected && <Check className="size-4" weight="bold" />}
                </button>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
