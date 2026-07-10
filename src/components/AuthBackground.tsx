import { Dithering } from '@paper-design/shaders-react'
import { prefersReducedMotion } from '../lib/utils'

// Palette pulled straight from design.md's original token set (still
// defined in index.css) — hardcoded as hex here since the shader's props
// take raw color values, not Tailwind utility classes.
const VOID = '#0a0a0a'
const BONE = '#e5e5e5'

// Full-viewport generative backdrop behind the auth and onboarding screens —
// see design.md's "Auth Background" pattern. `Dithering`'s `shape="warp"`
// fuses a warp/turbulence noise pattern with dithering in one WebGL draw
// call, which is the shader-native equivalent of the old hand-rolled
// noise+dither Canvas2D field. The indigo accent can't live inside this
// shader (Dithering is strictly 2-color), so it's layered separately below
// as a slow-pulsing CSS radial glow, matching design.md's "indigo never a
// solid fill" rule.
export function AuthBackground() {
  const reduced = prefersReducedMotion()

  return (
    <>
      <Dithering
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-40"
        colorBack={VOID}
        colorFront={BONE}
        shape="warp"
        type="4x4"
        size={1.5}
        scale={1.8}
        speed={reduced ? 0 : 0.3}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 motion-reduce:animate-none"
        style={{
          background: 'radial-gradient(circle at 70% 20%, rgba(107, 98, 242, 0.35), transparent 45%)',
          animation: reduced ? 'none' : 'indigo-glow-pulse 8s ease-in-out infinite',
        }}
      />
    </>
  )
}
