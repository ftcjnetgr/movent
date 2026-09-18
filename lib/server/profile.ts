import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type AppProfile = {
  id: string
  username: string
  full_name: string
  nik: string
  role: string
  status: string
}

export const getCurrentProfile = cache(async (): Promise<AppProfile> => {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId || typeof userId !== 'string') {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, username, full_name, nik, role, status')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (profileError || !profile || profile.status === 'Locked') {
    redirect('/login')
  }

  return profile
})
