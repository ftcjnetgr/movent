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

export async function getCurrentProfile(): Promise<AppProfile> {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, username, full_name, nik, role, status')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (profileError || !profile || profile.status === 'Locked') {
    redirect('/login')
  }

  return profile
}
