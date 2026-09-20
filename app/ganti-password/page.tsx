import Link from 'next/link'
import AppShell from '@/components/app-shell'
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

  return (
    <AppShell>
      <div className="password-page">
        <div className="password-page-topbar">
          <Link href="/controller/beranda" className="password-back">← Kembali</Link>
        </div>
        <ChangePasswordForm first={false} />
      </div>
    </AppShell>
  )
}
