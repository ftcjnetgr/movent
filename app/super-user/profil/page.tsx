import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentProfile } from '@/lib/server/profile'
import ProfilePage from '@/components/profile-page'

export default async function SuperUserProfilePage() {
  const profile = await getCurrentProfile()
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_profiles')
    .select('full_name, username, email, nik, phone_number, role, status')
    .eq('id', profile.id)
    .maybeSingle()

  if (!data) return null

  return <ProfilePage title="Pengaturan" profile={{ ...data, password_changed_at: profile.password_changed_at }} />
}
