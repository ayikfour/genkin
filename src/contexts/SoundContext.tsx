import { createContext, useContext, useMemo, useState } from 'react'
import { SoundProvider as WebKitsSoundProvider, usePatch } from '@web-kits/audio/react'

const STORAGE_KEY = 'genkin:sound-enabled'
const VOLUME_STORAGE_KEY = 'genkin:sound-volume'
const PATCH_URL = '/patches/playful.json'

// Names available in public/patches/playful.json — only the ones Genkin
// actually wires up so far (see design.md's "Sound & Feedback" pattern).
export type AppSound =
  | 'success'
  | 'error'
  | 'delete'
  | 'key-press'
  | 'toggle-on'
  | 'toggle-off'
  | 'select'
  | 'deselect'
  | 'checkbox'
  | 'slide'
  | 'undo'
  | 'tap'
  | 'tab-switch'
  | 'click'
  | 'copy'
  | 'warning'
  | 'swoosh'

interface SoundContextValue {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  volume: number
  setVolume: (volume: number) => void
  play: (name: AppSound) => void
}

const SoundContext = createContext<SoundContextValue | null>(null)

function readStoredPreference() {
  return window.localStorage.getItem(STORAGE_KEY) !== 'off'
}

function readStoredVolume() {
  const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY)
  if (raw === null) return 1
  const stored = Number(raw)
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 1
}

function SoundPatchBridge({
  enabled,
  setEnabled,
  volume,
  setVolume,
  children,
}: {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  volume: number
  setVolume: (volume: number) => void
  children: React.ReactNode
}) {
  const patch = usePatch(PATCH_URL)

  const value = useMemo<SoundContextValue>(
    () => ({
      enabled,
      setEnabled,
      volume,
      setVolume,
      play: name => {
        if (!patch.ready) return
        patch.play(name)
      },
    }),
    [enabled, setEnabled, volume, setVolume, patch],
  )

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

// Wraps the whole app once, above routing — see App.tsx. Owns the mute
// preference and volume level (localStorage, device-level — no account
// sync, no migration) and feeds both to @web-kits/audio's own
// SoundProvider, which gates/scales actual playback for every descendant
// usePatch()/useSound() call.
export function AppSoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(readStoredPreference)
  const [volume, setVolumeState] = useState(readStoredVolume)

  function setEnabled(next: boolean) {
    setEnabledState(next)
    window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
  }

  function setVolume(next: number) {
    const clamped = Math.min(1, Math.max(0, next))
    setVolumeState(clamped)
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped))
  }

  return (
    <WebKitsSoundProvider enabled={enabled} volume={volume}>
      <SoundPatchBridge enabled={enabled} setEnabled={setEnabled} volume={volume} setVolume={setVolume}>
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

export function useSoundVolume() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSoundVolume must be used inside AppSoundProvider')
  return { volume: ctx.volume, setVolume: ctx.setVolume }
}
