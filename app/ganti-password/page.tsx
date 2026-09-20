import Link from 'next/link'
import AppShell from '@/components/app-shell'
import { getCurrentProfile } from '@/lib/server/profile'
import ChangePasswordForm from '@/components/change-password-form'

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ first?: string }>
}) {
  const params = await searchParams
  const first = params.first === '1'

  if (first) {
    return <ChangePasswordForm first />
  }

  const profile = await getCurrentProfile()
  const backRoute = profile.role === 'Dispatcher'
    ? '/dispatcher/beranda'
    : profile.role === 'Executor'
      ? '/executor/tugas-saya'
      : profile.role === 'Maintainer'
        ? '/maintainer/beranda'
        : profile.role === 'Operation'
          ? '/operation/beranda'
          : '/controller/beranda'

  return (
    <AppShell profile={profile}>
      <div className="password-page">
        <div className="password-page-topbar">
          <Link href={backRoute} className="password-back">← Kembali</Link>
        </div>
        <ChangePasswordForm first={false} />
      </div>
    </AppShell>
  )
}
