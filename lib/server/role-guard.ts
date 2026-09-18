import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/server/profile'

export async function requireRole(role: string) {
  const profile = await getCurrentProfile()

  if (profile.role !== role && profile.role !== 'Super User') {
    redirect('/login')
  }

  return profile
}

export async function requireSuperUser() {
  const profile = await getCurrentProfile()

  if (profile.role !== 'Super User') {
    redirect('/login')
  }

  return profile
}
