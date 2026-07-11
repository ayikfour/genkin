import { useMemo, useRef, useState } from 'react'
import { generateInsights } from '../lib/spendingInsights'
import { isShareableInsight } from '../lib/shareableInsights'
import { InsightTicket } from './InsightTicket'
import { InsightSharePreviewSheet } from './InsightSharePreviewSheet'
import { useAppSound } from '../hooks/useAppSound'
import type { Insight } from '../lib/spendingInsights'
import type { Expense, Category, SpaceMember } from '../types'

interface Props {
  monthExpenses: Expense[]
  lastMonthExpenses: Expense[]
  expensesBeforeThisMonth: Expense[]
  categories: Category[]
  members: SpaceMember[]
  userId: string | undefined
  currencyCode: string
  daysElapsed: number
  monthLabel: string
}

export function SpendingInsightsCard({
  monthExpenses,
  lastMonthExpenses,
  expensesBeforeThisMonth,
  categories,
  members,
  userId,
  currencyCode,
  daysElapsed,
  monthLabel,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [shareInsight, setShareInsight] = useState<Insight | null>(null)
  const playSound = useAppSound()

  // Matches the track's `gap-3` (12px) below — each card is exactly
  // `clientWidth` wide, so the scroll distance per card is clientWidth plus
  // one gap, not clientWidth alone.
  const CARD_GAP_PX = 12

  const insights = useMemo(
    () =>
      generateInsights({
        monthExpenses,
        lastMonthExpenses,
        expensesBeforeThisMonth,
        categories,
        members,
        userId,
        currencyCode,
        daysElapsed,
      }),
    [monthExpenses, lastMonthExpenses, expensesBeforeThisMonth, categories, members, userId, currencyCode, daysElapsed],
  )

  function handleScroll() {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setActiveIndex(Math.round(track.scrollLeft / (track.clientWidth + CARD_GAP_PX)))
  }

  if (insights.length === 0) {
    return (
      <div className="border-b border-border px-5 py-5 last:border-b-0">
        <p className="text-sm text-muted-foreground">Nothing to roast yet — log a few expenses first.</p>
      </div>
    )
  }

  return (
    <div className="border-b border-border px-5 py-5 last:border-b-0">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain py-1 [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {insights.map((insight, i) => (
          <InsightTicket
            key={insight.id}
            insight={insight}
            size="card"
            index={i + 1}
            total={insights.length}
            onTap={
              isShareableInsight(insight.id)
                ? () => { playSound('tap'); setShareInsight(insight) }
                : undefined
            }
          />
        ))}
      </div>

      {insights.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {insights.map((insight, i) => (
            <span key={insight.id} className={`h-0.5 w-1.5 ${i === activeIndex ? 'bg-foreground' : 'bg-muted'}`} />
          ))}
        </div>
      )}

      <InsightSharePreviewSheet
        insight={shareInsight}
        monthLabel={monthLabel}
        isOpen={shareInsight !== null}
        onClose={() => setShareInsight(null)}
      />
    </div>
  )
}
