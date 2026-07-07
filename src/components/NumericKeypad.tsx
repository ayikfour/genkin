import { Backspace } from '@phosphor-icons/react'

interface Props {
  onDigit: (digit: string) => void
  onBackspace: () => void
}

const KEY_CLASS =
  'flex h-14 items-center justify-center rounded-lg font-heading text-2xl font-medium text-foreground transition-colors hover:bg-muted active:bg-muted disabled:pointer-events-none disabled:opacity-30'

// Calculator-style entry pad for the amount field in AddExpenseSheet — see
// design.md's "Amount Keypad" pattern. Decimal placement is automatic (see
// amountUnits.ts), so the bottom row is 000/0/⌫ rather than a decimal key —
// "000" is a fast-entry shortcut for round amounts, routed through
// appendDigits so it collapses leading zeros the same way three individual
// "0" taps would.
export function NumericKeypad({ onDigit, onBackspace }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
        <button key={d} type="button" className={KEY_CLASS} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button type="button" className={KEY_CLASS} onClick={() => onDigit('000')}>
        000
      </button>
      <button type="button" className={KEY_CLASS} onClick={() => onDigit('0')}>
        0
      </button>
      <button
        type="button"
        aria-label="Backspace"
        className={KEY_CLASS}
        onClick={onBackspace}
      >
        <Backspace className="size-6" />
      </button>
    </div>
  )
}
