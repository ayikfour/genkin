import { useLayoutEffect, useRef, useState } from 'react'

interface BudgetProgressBarProps {
  usedPct: number
  overBudget: boolean
  compact?: boolean
}

// Segment count AND per-segment width are solved together from the
// container's own width so the blocks always fill the row exactly (no
// leftover blank space, no missing trailing block) while never exceeding
// MAX_BLOCK_WIDTH — a block shrinks below that cap rather than the row
// leaving a gap. Recomputed on resize (e.g. a wider desktop layout).
const MAX_BLOCK_WIDTH = 12
const GAP = 4

function computeLayout(width: number) {
  const segments = Math.max(1, Math.ceil((width + GAP) / (MAX_BLOCK_WIDTH + GAP)))
  const blockWidth = (width - (segments - 1) * GAP) / segments
  return { segments, blockWidth }
}

export function BudgetProgressBar({ usedPct, overBudget, compact }: BudgetProgressBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [{ segments, blockWidth }, setLayout] = useState({ segments: 1, blockWidth: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setLayout(computeLayout(el.getBoundingClientRect().width))
    const observer = new ResizeObserver(([entry]) => setLayout(computeLayout(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const filled = Math.round((usedPct / 100) * segments)
  const color = overBudget ? 'var(--color-danger)' : 'var(--color-success)'

  return (
    <div ref={containerRef} className="flex gap-1">
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={compact ? 'h-1.5 bg-muted' : 'h-6 bg-muted'}
          style={{ width: blockWidth, background: i < filled ? color : undefined }}
        />
      ))}
    </div>
  )
}
