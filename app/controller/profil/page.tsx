import { getCurrentProfile } from '@/lib/server/profile'
import ProfilePage from '@/components/profile-page'

export default async function Page() {
  const profile = await getCurrentProfile()
  return <ProfilePage title="Pengaturan" profile={profile} />
}
