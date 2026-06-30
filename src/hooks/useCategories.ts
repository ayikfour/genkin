import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    supabase.from('categories').select('*').order('id').then(({ data, error }) => {
      if (error) console.error('[categories]', error)
      setCategories(data ?? [])
    })
  }, [])

  return categories
}
