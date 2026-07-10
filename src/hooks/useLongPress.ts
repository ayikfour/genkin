import { useRef } from 'react'

interface UseLongPressOptions {
  onLongPress: () => void
  thresholdMs?: number
}

// Imperative timer, not a set of pointer-event props — callers that already
// own a pointer-event state machine (e.g. ExpenseRow's swipe gesture) call
// start()/cancel() from inside their own handlers instead of racing a second
// set of DOM listeners against the first.
export function useLongPress({ onLongPress, thresholdMs = 500 }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)

  function start() {
    firedRef.current = false
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onLongPress()
    }, thresholdMs)
  }

  function cancel() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function consumeFired() {
    const fired = firedRef.current
    firedRef.current = false
    return fired
  }

  return { start, cancel, consumeFired }
}
