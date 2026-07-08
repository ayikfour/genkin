import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function SwitchSpaceSheet({ isOpen, onClose }: Props) {
  const { space, refreshSpace } = useAuth()
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [displayName, setDisplayName] = useState(space?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleClose() {
    setInviteCode('')
    setError('')
    onClose()
  }

  async function handleJoin() {
    if (!inviteCode.trim() || !displayName.trim()) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase.rpc('join_space', {
      code: inviteCode.trim().toUpperCase(),
      display_name: displayName.trim(),
    })
    setSaving(false)
    if (err) {
      const msg = err.message.includes('invalid_invite_code')
        ? 'Invite code not found. Double-check it with your partner.'
        : err.message.includes('space_full')
        ? 'This space already has two members.'
        : err.message.includes('already_in_this_space')
        ? "You're already in this space."
        : err.message
      setError(msg)
      return
    }
    await refreshSpace()
    toast('Switched spaces')
    handleClose()
    navigate('/log')
  }

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Join a different space</SheetTitle>
        </SheetHeader>

        <form onSubmit={e => { e.preventDefault(); handleJoin() }} className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="switch-invite-code">Invite code</Label>
            <Input
              id="switch-invite-code"
              type="text"
              placeholder="ABC123"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              className="h-12 font-heading tracking-[0.1em] uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="switch-display-name">Your name</Label>
            <Input
              id="switch-display-name"
              type="text"
              placeholder="Shown to anyone who joins your space"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={32}
              required
              className="h-12"
            />
          </div>

          {error && <p className="text-xs leading-relaxed text-destructive">{error}</p>}
        </form>

        <SheetFooter className="flex-row">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleJoin}
            className="flex-1"
            disabled={saving || !inviteCode.trim() || !displayName.trim()}
          >
            {saving ? 'Joining…' : 'Join'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
