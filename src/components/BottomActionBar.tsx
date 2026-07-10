import { useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { PageSwitcher } from './PageSwitcher'
import { cn } from '@/lib/utils'
import { useAppSound } from '@/hooks/useAppSound'
import { Button } from '@/components/ui/button'

// The bottom toolbar floats with no background behind it, so the default
// variant's opacity-based hover (`hover:bg-primary/80`) lets the page show
// through and reads as washed-out/transparent. `brightness` darkens the
// already-opaque button instead of blending with whatever's behind it.
const TOOLBAR_SOLID_HOVER = 'hover:bg-primary hover:brightness-90'

interface BottomActionBarProps {
  mode: 'logs' | 'stats'
  onAdd: () => void
  // logs-only
  editMode?: boolean
  onExitEditMode?: () => void
  selectedCount?: number
  onRequestBulkDelete?: () => void
}

export function BottomActionBar({
  mode,
  onAdd,
  editMode = false,
  onExitEditMode,
  selectedCount = 0,
  onRequestBulkDelete,
}: BottomActionBarProps) {
  const playSound = useAppSound()
  const inEditMode = mode === 'logs' && editMode
  const [switcherOpen, setSwitcherOpen] = useState(false)

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 flex items-center justify-between px-5 pt-3',
        // The Page Switcher's blur overlay sits at z-[55] so it can cover
        // the Top Nav too — this toolbar only needs to outrank that while
        // the switcher is actually open. Staying elevated permanently would
        // put it above z-50 surfaces like Sheet/Dialog at all other times.
        switcherOpen ? 'z-[56]' : 'z-30',
      )}
      style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}
    >
      {inEditMode ? (
        <Button
          onClick={onExitEditMode}
          size="icon"
          aria-label="Exit edit mode"
          className={TOOLBAR_SOLID_HOVER}
        >
          <X className="size-5" weight="bold" />
        </Button>
      ) : (
        <Button
          onClick={() => { playSound('tap'); onAdd() }}
          size="icon"
          aria-label="Add expense"
          className={TOOLBAR_SOLID_HOVER}
        >
          <Plus className="size-5" weight="bold" />
        </Button>
      )}

      {inEditMode ? (
        <Button
          variant="destructive"
          onClick={onRequestBulkDelete}
          disabled={selectedCount === 0}
          className="bg-destructive text-white hover:bg-destructive hover:brightness-90 dark:bg-destructive dark:hover:bg-destructive disabled:opacity-100 disabled:bg-destructive disabled:saturate-50 disabled:brightness-75 disabled:text-white/70"
        >
          {selectedCount > 0 ? `Delete (${selectedCount})` : 'Delete'}
        </Button>
      ) : (
        <PageSwitcher triggerClassName={TOOLBAR_SOLID_HOVER} onOpenChange={setSwitcherOpen} />
      )}
    </div>
  )
}
