import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { CoupleMember } from '../types'

export function useCoupleMembers(coupleId: string | undefined) {
  const [members, setMembers] = useState<CoupleMember[]>([])

  useEffect(() => {
    if (!coupleId) return
    supabase
      .from('couple_members')
      .select('user_id, display_name')
      .eq('couple_id', coupleId)
      .then(({ data }) => setMembers(data ?? []))
  }, [coupleId])

  return members
}
