import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AppProfile } from '@/lib/server/profile'
import AppShellClient from './app-shell-client'

export default async function AppShell({
  children,
  profile: providedProfile,
}: {
  children: React.ReactNode
  profile?: Pick<AppProfile, 'username' | 'full_name' | 'role'>
}) {
  if (providedProfile) {
    return <AppShellClient profile={providedProfile}>{children}</AppShellClient>
  }

  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('username, full_name, role, must_change_password, status')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (!profile || profile.status === 'Locked') {
    redirect('/login')
  }

  if (profile.must_change_password) {
    redirect('/ganti-password?first=1')
  }

  return <AppShellClient profile={profile}>{children}</AppShellClient>
}
