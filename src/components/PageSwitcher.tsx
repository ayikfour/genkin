import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { CaretDown } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAppSound } from '@/hooks/useAppSound'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const PAGES = [
  { path: '/log', label: 'Logs' },
  { path: '/feed', label: 'Activity' },
  { path: '/dashboard', label: 'Stats' },
  { path: '/settings', label: 'Settings' },
]

interface Props {
  triggerClassName?: string
  // Lets the enclosing toolbar know when the popup (and its blur overlay)
  // is open, so it can lift its own z-index just long enough to stay above
  // the overlay — see BottomActionBar/PageSwitcherBar.
  onOpenChange?: (open: boolean) => void
}

export function PageSwitcher({ triggerClassName, onOpenChange }: Props) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const playSound = useAppSound()
  const [open, setOpen] = useState(false)
  const currentPage = PAGES.find(p => p.path === pathname) ?? PAGES[0]

  // Radix's trigger opens via onPointerDown and calls preventDefault() when
  // it does, which suppresses the browser's synthesized click on touch/
  // pointer input — an onClick on the trigger button would silently never
  // fire on the exact interaction that opens the menu. Firing the sound off
  // the open transition instead works regardless of input type.
  function handleOpenChange(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
    if (next) playSound('tap')
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button className={`gap-1.5 ${triggerClassName ?? ''}`}>
          {currentPage.label}
          <CaretDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[55] animate-in fade-in-0 bg-background/20 backdrop-blur-md duration-150"
          onClick={() => setOpen(false)}
        />,
        document.body,
      )}

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="z-[60] flex w-auto min-w-0 flex-col items-end border-none bg-transparent p-0 shadow-none ring-0"
      >
        {PAGES.map(page => {
          const active = page.path === pathname
          return (
            <DropdownMenuItem
              key={page.path}
              onSelect={() => { playSound('tab-switch'); navigate(page.path) }}
              className={cn(
                'w-fit justify-end rounded-none bg-popover px-4 py-3.5 text-base ring-1 ring-foreground/10 shadow-md',
                active ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {active && (
                <span
                  className="size-2 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: 'var(--color-success)' }}
                  aria-hidden
                />
              )}
              {page.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
