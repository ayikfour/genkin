import BoringAvatar from 'boring-avatars'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from './supabase'
import { compressImage } from './image'

// Extends the existing Identity Color Pair (personColors.ts) with two
// reused Category Color Palette hues and one dark neutral, so
// generated avatars use only colors already declared elsewhere in the
// design system — no new hues introduced.
const AVATAR_PALETTE = [
  '#8ec98a', // YOU_COLOR (personColors.ts)
  '#d992ae', // PARTNER_COLOR (personColors.ts)
  '#6ba3d6', // Commute (categoryColors.ts)
  '#9b8cd9', // Services (categoryColors.ts)
  '#3d3d3d', // --color-iron (index.css)
]

export interface AvatarSubject {
  user_id: string
  display_name: string
  avatar_url: string | null
}

// Single source of truth for "custom photo vs. default identicon" —
// used identically by Settings and the Feed row so this fallback logic
// never gets duplicated. boring-avatars renders inline <svg>, so it
// goes inside AvatarFallback's children (Radix mounts Fallback
// whenever Image has no src) rather than through AvatarImage.
export function MemberAvatar({
  member,
  size = 'default',
  className,
}: {
  member: AvatarSubject
  size?: 'sm' | 'default' | 'lg'
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.display_name} />}
      <AvatarFallback>
        <BoringAvatar size="100%" name={member.user_id} variant="beam" colors={AVATAR_PALETTE} />
      </AvatarFallback>
    </Avatar>
  )
}

function avatarPath(userId: string) {
  return `${userId}/avatar.jpg`
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const blob = await compressImage(file)
  const path = avatarPath(userId)

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Object path never changes (upsert on the same path), so a
  // cache-busting query param forces a fresh fetch after re-upload
  // instead of serving a stale cached image.
  const cacheBustedUrl = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('space_members')
    .update({ avatar_url: cacheBustedUrl })
    .eq('user_id', userId)
  if (updateError) throw updateError

  return cacheBustedUrl
}

export async function removeAvatar(userId: string): Promise<void> {
  const path = avatarPath(userId)

  const { error: removeError } = await supabase.storage.from('avatars').remove([path])
  if (removeError) throw removeError

  const { error: updateError } = await supabase
    .from('space_members')
    .update({ avatar_url: null })
    .eq('user_id', userId)
  if (updateError) throw updateError
}
