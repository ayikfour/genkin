import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { SpinnerGap } from '@phosphor-icons/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { InsightExportCard } from './InsightExportCard'
import { captureNodeAsPngBlob } from '../lib/domImage'
import { useAppSound } from '../hooks/useAppSound'
import type { Insight } from '../lib/spendingInsights'

interface Props {
  insight: Insight | null
  monthLabel: string
  isOpen: boolean
  onClose: () => void
}

type Status = 'loading' | 'ready' | 'error'

function fileNameFor(insight: Insight, monthLabel: string): string {
  const monthSlug = monthLabel.toLowerCase().replace(/\s+/g, '-')
  return `genkin-insight-${insight.id}-${monthSlug}.png`
}

export function InsightSharePreviewSheet({ insight, monthLabel, isOpen, onClose }: Props) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [sharing, setSharing] = useState(false)
  const playSound = useAppSound()

  const runCapture = useCallback(async () => {
    const node = exportRef.current
    if (!node) return
    setStatus('loading')
    try {
      const captured = await captureNodeAsPngBlob(node)
      setBlob(captured)
      setImageUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(captured)
      })
      setStatus('ready')
    } catch {
      setStatus('error')
      toast('Could not create image — try again')
    }
  }, [])

  // Keyed on insight?.id (not the insight object itself) — generateInsights()
  // builds fresh Insight object literals on every recompute (e.g. a realtime
  // expense update), so depending on the object reference would re-trigger
  // (and reset an in-flight or completed) capture on every unrelated
  // re-render while the sheet is already open for the same insight.
  useEffect(() => {
    if (isOpen && insight) runCapture()
  }, [isOpen, insight?.id, runCapture])

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  async function handleShare() {
    if (!blob || !insight) return
    setSharing(true)
    try {
      const file = new File([blob], fileNameFor(insight, monthLabel), { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: insight.title })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileNameFor(insight, monthLabel)
        a.click()
        URL.revokeObjectURL(url)
      }
      playSound('tap')
    } catch (err) {
      // AbortError fires when the user just dismisses the native share sheet — not a real failure.
      if ((err as Error)?.name !== 'AbortError') toast('Could not share image — try again')
    } finally {
      setSharing(false)
    }
  }

  return (
    <Fragment>
      <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Share insight</SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-2">
            <div className="mx-auto aspect-9/16 w-full max-w-56 overflow-hidden rounded-lg border border-border bg-muted">
              {status === 'ready' && imageUrl && (
                <img src={imageUrl} alt={insight?.title ?? 'Insight'} className="size-full object-cover" />
              )}
              {status === 'loading' && (
                <div className="flex size-full items-center justify-center">
                  <SpinnerGap className="size-6 animate-spin text-muted-foreground" weight="bold" />
                </div>
              )}
              {status === 'error' && (
                <div className="flex size-full flex-col items-center justify-center gap-1 px-4 text-center">
                  <p className="text-sm text-muted-foreground">Could not create image.</p>
                </div>
              )}
            </div>
          </div>

          <SheetFooter>
            {status === 'error' ? (
              <Button type="button" onClick={runCapture}>
                Try again
              </Button>
            ) : (
              <Button type="button" onClick={handleShare} disabled={status !== 'ready' || sharing}>
                {sharing ? <SpinnerGap className="animate-spin" weight="bold" /> : 'Share'}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Rendered outside the Sheet's own tree (not just visually via fixed
          positioning) because Radix's Dialog Presence mounts SheetContent's
          children one render cycle after `open` flips true — the capture
          effect below fires in the same commit as `isOpen` becoming true, so
          a ref nested inside SheetContent wasn't attached yet when it ran. */}
      {insight && <InsightExportCard ref={exportRef} insight={insight} monthLabel={monthLabel} />}
    </Fragment>
  )
}
