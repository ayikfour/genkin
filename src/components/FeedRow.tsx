import { buildFeedMessage } from '../lib/feedMessages'
import { formatActivityTime } from '../lib/format'
import { MemberAvatar, type AvatarSubject } from '../lib/avatar'
import type { ExpenseActivity } from '../types'

interface Props {
  activity: ExpenseActivity
  actor: AvatarSubject
  actorName: string
  currencyCode: string
  getCategoryIcon: (category: string) => string
  isFirst: boolean
  isLast: boolean
}

const VARIANT_STYLE: Record<string, string> = {
  'verb-success': 'var(--color-success)',
  'verb-danger': 'var(--color-danger)',
}

export function FeedRow({ activity, actor, actorName, currencyCode, getCategoryIcon, isFirst, isLast }: Props) {
  const segments = buildFeedMessage(activity, actorName, currencyCode, getCategoryIcon)
  const time = formatActivityTime(activity.created_at)

  return (
    <div className="flex gap-3 px-5">
      {/* Timeline connector: a hairline running through the icon column,
          linking this row's icon to the ones above/below it. Lives on the
          same box as the lines (no padding of its own) so the two half-lines
          meet exactly at the row boundary with no gap. */}
      <div className="relative w-9 shrink-0">
        {!isFirst && <span className="absolute top-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-border" />}
        {!isLast && <span className="absolute bottom-0 left-1/2 h-1/2 w-px -translate-x-1/2 bg-border" />}
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <MemberAvatar member={actor} size="default" />
        </div>
      </div>

      <div className="min-w-0 flex-1 py-3.5">
        <p className="text-sm font-medium text-foreground">
          {segments.map((seg, i) => (
            <span
              key={i}
              className={seg.variant === 'date' ? 'text-muted-foreground' : undefined}
              style={seg.variant && VARIANT_STYLE[seg.variant] ? { color: VARIANT_STYLE[seg.variant] } : undefined}
            >
              {seg.text}
            </span>
          ))}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}
