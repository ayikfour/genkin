"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAppSound } from "@/hooks/useAppSound"
import { XIcon } from "@phosphor-icons/react"

// Plays once per genuine dismissal (X button, Escape, backdrop tap, or a
// drag-past-threshold — anything Radix itself recognizes as a close
// gesture). Consumers that close a sheet as the side effect of an action
// (selecting a category, applying a filter, saving) do so by changing
// their own `open` state directly rather than through this callback, so
// this never doubles up with an action's own sound.
function Sheet({
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  const playSound = useAppSound()
  return (
    <SheetPrimitive.Root
      data-slot="sheet"
      onOpenChange={open => {
        if (!open) playSound('swoosh')
        onOpenChange?.(open)
      }}
      {...props}
    />
  )
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

// Drag-to-dismiss tuning for the bottom sheet.
const DRAG_MOVE_THRESHOLD = 6 // px of downward movement before a touch commits to dragging the sheet, so taps/scrolls aren't hijacked
const DRAG_DISMISS_DISTANCE_RATIO = 0.25 // fraction of sheet height
const DRAG_DISMISS_MIN_DISTANCE = 80
const DRAG_DISMISS_MAX_DISTANCE = 200
const DRAG_DISMISS_VELOCITY = 0.5 // px/ms — a fast flick dismisses regardless of distance

type DragState = {
  originY: number
  dragging: boolean
  dragStartY: number
  dragStartTime: number
  height: number
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const dragRef = React.useRef<DragState | null>(null)
  const wasOpenRef = React.useRef(false)
  const [dragY, setDragY] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const draggable = side === "bottom"

  // Radix mounts/unmounts the underlying content element via its own
  // internal Presence timing (its own commit, not necessarily one where
  // *this* component re-renders) — so a `useEffect`/`useLayoutEffect` here
  // can miss the actual open transition and never see it, leaving stale drag
  // state (e.g. still translated off-screen from the previous dismissal) on
  // a sheet that looks freshly reopened. A MutationObserver tied directly to
  // the DOM node via the ref callback isn't subject to that: it fires on the
  // real attribute change regardless of which component's render caused it.
  //
  // Also clears `dragY` the instant `data-state` flips to "closed" (not just
  // back to "open"): for drag-to-dismiss, `handlePointerUp` below leaves
  // `dragY` pinned at the sheet's full height so it snaps away instantly,
  // but nothing else ever resets that inline `transform` back to 0. Left in
  // place, it fights Radix's own `data-closed:slide-out-to-bottom-10` exit
  // animation for the same CSS property once `data-state` changes — which
  // can keep that animation's `animationend` from firing, and since the
  // overlay's own teardown rides on the same Presence/exit-animation
  // completion, the backdrop is left stuck on screen. Every other dismissal
  // path (X button, Escape, backdrop) never touches `dragY`, so it's always
  // already 0 there and never hits this conflict — clearing it here as soon
  // as we see the close makes drag-to-dismiss behave identically to those.
  const resetIfJustOpened = React.useCallback((node: HTMLDivElement) => {
    const isOpenNow = node.getAttribute("data-state") === "open"
    if (isOpenNow && !wasOpenRef.current) {
      dragRef.current = null
      setIsDragging(false)
      setDragY(0)
    } else if (!isOpenNow && wasOpenRef.current) {
      setDragY(0)
    }
    wasOpenRef.current = isOpenNow
  }, [])

  const setContentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node
      if (!node) return
      resetIfJustOpened(node)
      const observer = new MutationObserver(() => resetIfJustOpened(node))
      observer.observe(node, { attributes: true, attributeFilter: ["data-state"] })
      return () => observer.disconnect()
    },
    [resetIfJustOpened]
  )

  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return
    dragRef.current = {
      originY: e.clientY,
      dragging: false,
      dragStartY: e.clientY,
      dragStartTime: Date.now(),
      height: contentRef.current?.offsetHeight ?? 0,
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag) return

    if (!drag.dragging) {
      // Only commit to dragging the whole sheet once the content is scrolled
      // to its top edge — otherwise this same downward motion should scroll
      // the form instead. Re-anchor the origin at the commit point so the
      // sheet doesn't jump by however far the finger already travelled while
      // scrolling. Most consumers scroll the SheetContent element itself, but
      // a consumer can opt a nested element into being "the" scrollable body
      // instead (e.g. when it needs an always-visible pinned footer below an
      // independently-scrolling region) by tagging it `data-sheet-scroll` —
      // if present, its scrollTop is checked instead of the outer element's,
      // which otherwise never scrolls and would read 0 forever.
      const scrollTarget =
        contentRef.current?.querySelector<HTMLElement>("[data-sheet-scroll]") ??
        contentRef.current
      const scrolledToTop = (scrollTarget?.scrollTop ?? 0) <= 0
      const movedDown = e.clientY - drag.originY
      if (!scrolledToTop || movedDown <= DRAG_MOVE_THRESHOLD) return
      drag.dragging = true
      drag.dragStartY = e.clientY
      drag.dragStartTime = Date.now()
      setIsDragging(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Capture can fail (e.g. pointer already released) — the drag still
        // works via bubbled move/up events, just without capture guarantees.
      }
    }

    e.preventDefault()
    setDragY(Math.max(0, e.clientY - drag.dragStartY))
  }

  function handlePointerUp(e: React.PointerEvent) {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag?.dragging) return
    setIsDragging(false)

    const distance = Math.max(0, e.clientY - drag.dragStartY)
    const elapsed = Math.max(1, Date.now() - drag.dragStartTime)
    const velocity = distance / elapsed
    const threshold = Math.min(
      DRAG_DISMISS_MAX_DISTANCE,
      Math.max(DRAG_DISMISS_MIN_DISTANCE, drag.height * DRAG_DISMISS_DISTANCE_RATIO)
    )

    if (distance > threshold || velocity > DRAG_DISMISS_VELOCITY) {
      // Close synchronously rather than deferring via setTimeout — a deferred
      // click left a window where the sheet was still "open" from Radix's
      // perspective (just visually dragged away), so a reopen inside that
      // window skipped our closed→open reset below and then got closed again
      // when the stale timeout eventually fired.
      setDragY(drag.height || window.innerHeight)
      closeRef.current?.click()
    } else {
      setDragY(0)
    }
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={setContentRef}
        data-slot="sheet-content"
        data-side={side}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        onPointerDown={draggable ? handlePointerDown : undefined}
        onPointerMove={draggable ? handlePointerMove : undefined}
        onPointerUp={draggable ? handlePointerUp : undefined}
        onPointerCancel={draggable ? handlePointerUp : undefined}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10",
          isDragging && "transition-none",
          className
        )}
        {...props}
      >
        {draggable && (
          <div
            role="presentation"
            aria-hidden
            className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          >
            <div className="h-1 w-9 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        {children}
        {/* Always rendered so drag-to-dismiss has a Close to trigger even when
            showCloseButton is false (the visible X is hidden but the sheet
            still needs a real Radix close path, not just a visual slide-away,
            or the overlay is left stuck open). */}
        <SheetPrimitive.Close ref={closeRef} data-slot="sheet-close" asChild>
          <Button
            variant="ghost"
            className={cn("absolute top-3 right-3", !showCloseButton && "sr-only")}
            size="icon-sm"
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </Button>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
