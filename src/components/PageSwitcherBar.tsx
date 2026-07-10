import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PageSwitcher } from './PageSwitcher'

// Minimal counterpart to BottomActionBar for screens that have no
// Add/Filter/Month actions of their own (Settings, Activity) — keeps the
// page switcher reachable at the same screen position on every first-level
// page instead of being folded into TopNav's title row.
export function PageSwitcherBar() {
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 flex items-center justify-end px-5 pt-3',
        // See BottomActionBar's matching comment — only outrank the blur
        // overlay's z-[55] while it's actually showing.
        switcherOpen ? 'z-[56]' : 'z-30',
      )}
      style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}
    >
      <PageSwitcher onOpenChange={setSwitcherOpen} />
    </div>
  )
}
