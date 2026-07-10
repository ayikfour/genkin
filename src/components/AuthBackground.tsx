import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/utils'

// Palette pulled straight from design.md's original token set (still
// defined in index.css) — hardcoded as hex here since a canvas 2D context
// can't read Tailwind utility classes, only real color values.
const VOID = '#0a0a0a'
const FOG = '#686868'
const MIST = '#c2c2c2'
const BONE = '#e5e5e5'
const INDIGO = '#6b62f2'

const CELL = 16 // px per grid cell, logical (pre-DPR) pixels
const ASCII_RAMP = '.:-=+*#%@'
const ASCII_EVERY = 5 // roughly 1 in 5 cells renders as a glyph instead of a dot
const FRAME_INTERVAL = 33 // ~30fps cap — a full-grid redraw every rAF tick is unnecessary cost

function hash(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

// Cheap value-noise (no dependency): bilinear-interpolated lattice hash.
function noise2D(x: number, y: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smoothstep(x - x0)
  const fy = smoothstep(y - y0)
  const a = hash(x0, y0)
  const b = hash(x0 + 1, y0)
  const c = hash(x0, y0 + 1)
  const d = hash(x0 + 1, y0 + 1)
  const top = a + (b - a) * fx
  const bottom = c + (d - c) * fx
  return top + (bottom - top) * fy
}

// Sum of a few octaves of the noise above (fbm) — smoother and less
// grid-aligned than a single octave, still cheap enough per-cell.
function fbm(x: number, y: number) {
  let sum = 0
  let amp = 0.6
  let freq = 1
  let max = 0
  for (let i = 0; i < 3; i++) {
    sum += noise2D(x * freq, y * freq) * amp
    max += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / max
}

// Full-viewport generative dither/ASCII field behind the auth and
// onboarding screens — see design.md's "Auth Background" pattern. Pure
// Canvas2D (no shader/WebGL, no new dependency): a hand-rolled noise field
// drives a grid of cells, each rendered as either a halftone dot (dither) or
// a monospace glyph from a density ramp (ASCII), in the app's existing
// neutral palette with the indigo accent used only as a rare atmospheric
// highlight, per design.md's "indigo never a solid fill" rule.
export function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const ctx2d = canvasEl.getContext('2d')
    if (!ctx2d) return
    // Re-bound to explicitly non-nullable types: narrowing from the guards
    // above doesn't persist into the nested functions below (a well-known
    // TS limitation across closures), so `canvas`/`ctx` need a type that
    // excludes null from the start rather than relying on that narrowing.
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = ctx2d

    const reduced = prefersReducedMotion()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    let raf = 0
    let lastDrawTime = 0

    function draw(time: number) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = VOID
      ctx.fillRect(0, 0, width, height)
      ctx.font = `${CELL - 2}px ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const t = time * 0.00004
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const raw = fbm(col * 0.08 + t, row * 0.08 - t * 0.6)
          // Push the noise through a threshold + curve so most of the field
          // stays fully void (real negative space, like the reference's
          // map-like gaps) and only organic high-value clusters reveal the
          // dot/glyph texture, instead of a uniform dim wash everywhere.
          const n = Math.min(1, Math.max(0, (raw - 0.42) / 0.5) ** 1.4)
          if (n <= 0.02) continue

          const cx = col * CELL
          const cy = row * CELL
          // A handful of visible cells sparkle indigo — picked by a
          // separate slow-changing hash rather than the brightness
          // threshold above, since noise peaks high enough to clear a
          // brightness threshold are too rare to reliably show the accent
          // at all. Re-picked every ~6s so it's a rare accent, not static.
          const timeBucket = Math.floor(time / 6000)
          const isAccent = hash(col * 3.1, row * 7.3 + timeBucket * 97) > 0.985
          const color = isAccent ? INDIGO : n > 0.55 ? BONE : n > 0.3 ? MIST : FOG
          ctx.fillStyle = color
          ctx.globalAlpha = isAccent ? 0.85 : n

          if ((row * cols + col) % ASCII_EVERY === 0) {
            const rampIndex = Math.min(ASCII_RAMP.length - 1, Math.floor(n * ASCII_RAMP.length))
            ctx.fillText(ASCII_RAMP[rampIndex], cx, cy)
          } else {
            const radius = Math.max(0.5, n * (CELL * 0.42))
            ctx.beginPath()
            ctx.arc(cx, cy, radius, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      ctx.globalAlpha = 1
    }

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      cols = Math.ceil(width / CELL) + 1
      rows = Math.ceil(height / CELL) + 1
      draw(lastDrawTime)
    }

    function loop(time: number) {
      if (time - lastDrawTime > FRAME_INTERVAL) {
        draw(time)
        lastDrawTime = time
      }
      raf = requestAnimationFrame(loop)
    }

    resize()
    window.addEventListener('resize', resize)

    if (!reduced) raf = requestAnimationFrame(loop)

    function handleVisibility() {
      if (reduced) return
      if (document.hidden) {
        cancelAnimationFrame(raf)
      } else {
        raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  )
}
