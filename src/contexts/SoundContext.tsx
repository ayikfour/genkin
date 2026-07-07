import { createContext, useContext, useMemo, useState } from 'react'
import { SoundProvider as WebKitsSoundProvider, usePatch } from '@web-kits/audio/react'

const STORAGE_KEY = 'genkin:sound-enabled'
const PATCH_URL = '/patches/playful.json'

// Names available in public/patches/playful.json — only the ones Genkin
// actually wires up so far (see design.md's "Sound & Feedback" pattern).
export type AppSound = 'success' | 'error' | 'delete' | 'key-press'

interface SoundContextValue {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  play: (name: AppSound) => void
}

const SoundContext = createContext<SoundContextValue | null>(null)

function readStoredPreference() {
  return window.localStorage.getItem(STORAGE_KEY) !== 'off'
}

function SoundPatchBridge({
  enabled,
  setEnabled,
  children,
}: {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  children: React.ReactNode
}) {
  const patch = usePatch(PATCH_URL)

  const value = useMemo<SoundContextValue>(
    () => ({
      enabled,
      setEnabled,
      play: name => {
        if (!patch.ready) return
        patch.play(name)
      },
    }),
    [enabled, setEnabled, patch],
  )

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

// Wraps the whole app once, above routing — see App.tsx. Owns the mute
// preference (localStorage, device-level — no account sync, no migration)
// and feeds it to @web-kits/audio's own SoundProvider, which gates actual
// playback for every descendant usePatch()/useSound() call.
export function AppSoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(readStoredPreference)

  function setEnabled(next: boolean) {
    setEnabledState(next)
    window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
  }

  return (
    <WebKitsSoundProvider enabled={enabled}>
      <SoundPatchBridge enabled={enabled} setEnabled={setEnabled}>
        {children}
      </SoundPatchBridge>
    </WebKitsSoundProvider>
  )
}

export function useAppSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useAppSound must be used inside AppSoundProvider')
  return ctx.play
}

export function useSoundPreference() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSoundPreference must be used inside AppSoundProvider')
  return { enabled: ctx.enabled, setEnabled: ctx.setEnabled }
}
