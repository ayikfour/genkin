import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import type { SpaceMember } from '../types'

const LAST_COUNT_KEY_PREFIX = 'genkin:last-member-count:'

export function useSpaceMembers(spaceId: string | undefined) {
  const [members, setMembers] = useState<SpaceMember[]>([])

  useEffect(() => {
    if (!spaceId) return
    supabase
      .from('space_members')
      .select('user_id, display_name')
      .eq('space_id', spaceId)
      .then(({ data }) => {
        const fetched = data ?? []
        setMembers(fetched)

        // Passive, next-load-only notice: if this space had 2 members last
        // time we checked and now has 1, someone left. Not a hard
        // interstitial — just a toast, and only fires once per transition.
        const key = LAST_COUNT_KEY_PREFIX + spaceId
        const lastCount = Number(localStorage.getItem(key) ?? fetched.length)
        if (lastCount === 2 && fetched.length === 1) {
          toast("It's just you in this log now.")
        }
        localStorage.setItem(key, String(fetched.length))
      })
  }, [spaceId])

  return members
}
