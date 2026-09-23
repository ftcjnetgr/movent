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
  email: string | null
  phone_number: string | null
  password_changed_at: string | null
}

export const getCurrentProfile = cache(async (): Promise<AppProfile> => {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId || typeof userId !== 'string') {
    redirect('/login')
  }

  const { data: userData } = await supabase.auth.getUser()

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, username, full_name, nik, role, status, email, phone_number')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (profileError || !profile || profile.status === 'Locked') {
    redirect('/login')
  }

  return {
    ...profile,
    email: profile.email ?? userData.user?.email ?? null,
    phone_number: profile.phone_number ?? null,
    password_changed_at: userData.user?.updated_at ?? null,
  }
})
