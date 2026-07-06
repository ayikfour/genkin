import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { PasswordInput } from './PasswordInput'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordSheet({ isOpen, onClose }: Props) {
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleClose() {
    setNewPassword('')
    setError('')
    onClose()
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) {
      setError(error.message || 'Could not update password. Try again.')
      return
    }
    toast('Password updated')
    handleClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Change password</SheetTitle>
        </SheetHeader>

        <form onSubmit={e => { e.preventDefault(); handleSave() }} className="space-y-3 px-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-new-password">New password</Label>
            <PasswordInput
              id="settings-new-password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={setNewPassword}
              required
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>

        <SheetFooter className="flex-row">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="flex-1"
            disabled={saving || newPassword.length < 6}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
