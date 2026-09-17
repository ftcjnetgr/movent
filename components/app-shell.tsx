import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShellClient from './app-shell-client'

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, username, full_name, role, must_change_password, status')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/login')
  }

  if (profile.status === 'Locked') {
    redirect('/login')
  }

  if (profile.must_change_password) {
    redirect('/ganti-password?first=1')
  }

  return <AppShellClient profile={profile}>{children}</AppShellClient>
}
